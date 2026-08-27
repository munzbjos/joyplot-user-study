import csv, hashlib, hmac, io, json, secrets, random
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI, Header, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from .config import ExperimentConfig
from .database import build_database
from .models import AllocationState, Base, Participant, TrialResponse
from .schemas import ConsentSubmission, Demographics, PreferenceSubmission, SessionCreate, TrialSubmission
from .settings import Settings

def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    experiment = ExperimentConfig.load(settings.config_dir)
    engine, sessionmaker = build_database(settings)

    @asynccontextmanager
    async def lifespan(app):
        app.state.engine, app.state.sessionmaker, app.state.experiment = engine, sessionmaker, experiment
        yield
        await engine.dispose()
    app = FastAPI(title="Joy Plot User Study API", lifespan=lifespan)

    async def db():
        async with sessionmaker() as session: yield session
    def token_hash(token: str): return hmac.new(settings.token_pepper.encode(), token.encode(), hashlib.sha256).hexdigest()
    async def participant(authorization: str = Header(...), session: AsyncSession = Depends(db)):
        if not authorization.startswith("Bearer "): raise HTTPException(401, "Invalid session token")
        p = await session.scalar(select(Participant).where(Participant.token_hash == token_hash(authorization[7:])))
        if not p: raise HTTPException(401, "Invalid session token")
        return p
    def state(p, completed):
        return {"status": p.status, "assigned_version": p.assigned_version, "completed_trials": completed,
                "current_trial_position": min(completed + 1, 6) if p.assigned_version and completed < 6 else None,
                "preference": p.preference, "consent_recorded": p.consented_at is not None,
                "consent_version": p.consent_version}

    @app.get("/health")
    async def health(): return {"status": "ok"}

    @app.post("/api/sessions", status_code=201)
    async def create_session(body: SessionCreate, user_agent: str | None = Header(None), session: AsyncSession = Depends(db)):
        token = secrets.token_urlsafe(32)
        p = Participant(token_hash=token_hash(token), user_agent=user_agent, **body.model_dump())
        session.add(p); await session.commit()
        return {"session_token": token, "session_id": p.id, **state(p, 0)}

    @app.get("/api/session")
    async def get_session(p=Depends(participant), session: AsyncSession=Depends(db)):
        completed = len((await session.scalars(select(TrialResponse).where(TrialResponse.participant_id == p.id))).all())
        return state(p, completed)

    @app.put("/api/session/consent")
    async def consent(body: ConsentSubmission, p=Depends(participant), session: AsyncSession=Depends(db)):
        if body.consent_version != settings.consent_text_version:
            raise HTTPException(409, "Consent text version does not match the current version")
        if p.consented_at is not None:
            if p.consent_version == body.consent_version:
                return {"status": p.status, "consent_recorded": True, "consent_version": p.consent_version}
            raise HTTPException(409, "Consent has already been recorded with a different version")
        p.consented_at = datetime.now(timezone.utc)
        p.consent_version = body.consent_version
        if p.status == "created": p.status = "consent_recorded"
        await session.commit()
        return {"status": p.status, "consent_recorded": True, "consent_version": p.consent_version}

    @app.put("/api/session/demographics")
    async def demographics(body: Demographics, p=Depends(participant), session: AsyncSession=Depends(db)):
        if p.consented_at is None: raise HTTPException(409, "Consent is required")
        if p.assigned_version: raise HTTPException(409, "Demographics are locked after test start")
        for k,v in body.model_dump().items(): setattr(p,k,v)
        p.status="ready"; await session.commit(); return {"status": p.status}

    @app.post("/api/session/start")
    async def start(p=Depends(participant), session: AsyncSession=Depends(db)):
        # Lock the participant too: two simultaneous start requests for the same
        # token must observe and return one immutable assignment.
        p = await session.scalar(
            select(Participant)
            .where(Participant.id == p.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if p.assigned_version: return {"assigned_version": p.assigned_version, "trials": [experiment.trial(p.assigned_version,i) | {"options": _options(experiment, p.assigned_version, i)} for i in range(1,7)]}
        if p.consented_at is None: raise HTTPException(409, "Consent is required")
        if p.status != "ready": raise HTTPException(409, "Participant information is required")
        # PostgreSQL serialises this critical section through a singleton row lock.
        alloc = await session.scalar(select(AllocationState).where(AllocationState.id == 1).with_for_update())
        if alloc is None:
            alloc=AllocationState(id=1); session.add(alloc); await session.flush()
        block=json.loads(alloc.block_json)
        if alloc.next_index >= len(block):
            block=list(experiment.versions); random.SystemRandom().shuffle(block); alloc.block_json=json.dumps(block); alloc.next_index=0
        p.assigned_version=block[alloc.next_index]; alloc.next_index += 1; p.status="in_progress"; p.started_at=datetime.now(timezone.utc)
        await session.commit()
        return {"assigned_version": p.assigned_version, "trials": [experiment.trial(p.assigned_version,i) | {"options": _options(experiment,p.assigned_version,i)} for i in range(1,7)]}

    @app.get("/api/trials/current")
    async def current_trial(p=Depends(participant), session: AsyncSession=Depends(db)):
        if not p.assigned_version: raise HTTPException(409,"Test has not started")
        done=len((await session.scalars(select(TrialResponse.id).where(TrialResponse.participant_id==p.id))).all())
        if done == 6: return {"complete": True}
        t=experiment.trial(p.assigned_version, done+1); t["options"]=_options(experiment,p.assigned_version,done+1); return t

    @app.post("/api/trials/{position}/response")
    async def submit(position: int, body: TrialSubmission, p=Depends(participant), session: AsyncSession=Depends(db)):
        if not p.assigned_version or not 1 <= position <= 6: raise HTTPException(409,"Invalid trial")
        existing=await session.scalar(select(TrialResponse).where(TrialResponse.participant_id==p.id,TrialResponse.trial_position==position))
        if existing:
            if not _same_submission(existing, body): raise HTTPException(409,"Trial already submitted with different data")
            return {"stored": True, "position": position}
        count=len((await session.scalars(select(TrialResponse.id).where(TrialResponse.participant_id==p.id))).all())
        if position != count+1: raise HTTPException(409,"Trials must be submitted in order")
        t=experiment.trial(p.assigned_version,position); valid={o["id"] for o in _options(experiment,p.assigned_version,position)}
        if body.selected_answer not in valid: raise HTTPException(422,"Answer is not valid for this trial")
        correct=experiment.answers[t["task_id"]]
        r=TrialResponse(participant_id=p.id,trial_position=position,task_id=t["task_id"],task_family=t["task_family"],geography=t["geography"],pair=t["pair"],method=t["method"],stimulus_filename=t["stimulus_filename"],correct_answer=correct,is_correct=body.selected_answer==correct,**body.model_dump())
        session.add(r)
        try: await session.commit()
        except IntegrityError:
            await session.rollback()
            existing=await session.scalar(select(TrialResponse).where(TrialResponse.participant_id==p.id,TrialResponse.trial_position==position))
            if existing and _same_submission(existing, body):
                return {"stored": True,"position":position}
            raise HTTPException(409,"Trial already submitted")
        return {"stored":True,"position":position}

    @app.post("/api/session/preference")
    async def preference(body: PreferenceSubmission,p=Depends(participant),session:AsyncSession=Depends(db)):
        count=len((await session.scalars(select(TrialResponse.id).where(TrialResponse.participant_id==p.id))).all())
        if count != 6: raise HTTPException(409,"All six trials are required")
        if p.preference and p.preference != body.preference: raise HTTPException(409,"Preference already submitted")
        p.preference=body.preference; p.status="preference_recorded"; await session.commit(); return {"stored":True}

    @app.post("/api/session/complete")
    async def complete(p=Depends(participant),session:AsyncSession=Depends(db)):
        if not p.preference: raise HTTPException(409,"Preference is required")
        p.status="completed"; p.completed_at=p.completed_at or datetime.now(timezone.utc); await session.commit(); return {"status":"completed"}

    @app.get("/api/admin/export.csv")
    async def export(x_admin_secret: str=Header(...),session:AsyncSession=Depends(db)):
        if not hmac.compare_digest(x_admin_secret,settings.admin_secret): raise HTTPException(401,"Invalid admin secret")
        rows=(await session.execute(select(TrialResponse,Participant).join(Participant))).all(); out=io.StringIO(); fields=["participant_id","assigned_version","consented_at","consent_version","age","gender","cartographic_background","screen_width","screen_height","viewport_width","viewport_height","device_pixel_ratio","user_agent","preference","status","trial_position","task_id","task_family","geography","pair","method","stimulus_filename","selected_answer","correct_answer","is_correct","rt_selection_ms","rt_submit_ms","answer_changes","zoom_used","zoom_count","zoom_duration_ms","max_zoom_pct","trial_restarted","restart_count","trial_started_at","submitted_at"]
        w=csv.DictWriter(out,fields); w.writeheader()
        for r,p in rows: w.writerow({f:getattr(r,f,getattr(p,f,None)) for f in fields}|{"participant_id":str(p.id)})
        return Response(out.getvalue(),media_type="text/csv",headers={"Content-Disposition":"attachment; filename=joyplot-trials.csv"})
    return app

def _options(experiment, version, position):
    t=experiment.trial(version,position); task=experiment.tasks[t["task_id"]]
    return experiment.option_sets[task["option_set_id"]]

def _same_submission(existing, body):
    return all(getattr(existing, key) == value for key, value in body.model_dump().items())

app = create_app()
