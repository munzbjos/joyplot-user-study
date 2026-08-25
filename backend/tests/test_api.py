import csv, io, json
from collections import Counter
from pathlib import Path
from .conftest import new_ready


async def test_consent_is_required_for_demographics_and_start(client):
    created=(await client.post("/api/sessions",json={})).json()
    headers={"Authorization":f"Bearer {created['session_token']}"}
    demographics={"age":30,"gender":"man","cartographic_background":False}
    assert (await client.put("/api/session/demographics",headers=headers,json=demographics)).status_code==409
    assert (await client.post("/api/session/start",headers=headers)).status_code==409
    state=(await client.get("/api/session",headers=headers)).json()
    assert state["consent_recorded"] is False
    assert state["consent_version"] is None
    assert "consented_at" not in state


async def test_consent_validates_version_and_explicit_acceptance(client):
    created=(await client.post("/api/sessions",json={})).json()
    headers={"Authorization":f"Bearer {created['session_token']}"}
    assert (await client.put("/api/session/consent",headers=headers,json={"consented":False,"consent_version":"test-v1"})).status_code==422
    assert (await client.put("/api/session/consent",headers=headers,json={"consented":True,"consent_version":"stale-v0"})).status_code==409
    state=(await client.get("/api/session",headers=headers)).json()
    assert state["consent_recorded"] is False


async def test_consent_is_idempotent_but_conflicting_reconsent_is_rejected(client):
    created=(await client.post("/api/sessions",json={})).json()
    headers={"Authorization":f"Bearer {created['session_token']}"}
    payload={"consented":True,"consent_version":"test-v1"}
    first=await client.put("/api/session/consent",headers=headers,json=payload)
    replay=await client.put("/api/session/consent",headers=headers,json=payload)
    conflict=await client.put("/api/session/consent",headers=headers,json={"consented":True,"consent_version":"other-v2"})
    assert first.status_code==200 and replay.status_code==200
    assert replay.json()=={"status":"consent_recorded","consent_recorded":True,"consent_version":"test-v1"}
    assert conflict.status_code==409


async def test_minimum_age_is_eighteen(client):
    created=(await client.post("/api/sessions",json={})).json()
    headers={"Authorization":f"Bearer {created['session_token']}"}
    await client.put("/api/session/consent",headers=headers,json={"consented":True,"consent_version":"test-v1"})
    underage=await client.put("/api/session/demographics",headers=headers,json={"age":17,"gender":"man","cartographic_background":False})
    adult=await client.put("/api/session/demographics",headers=headers,json={"age":18,"gender":"man","cartographic_background":False})
    assert underage.status_code==422
    assert adult.status_code==200

async def test_session_token_is_recoverable_but_not_returned_in_state(client):
    created,headers=await new_ready(client)
    state=await client.get("/api/session",headers=headers)
    assert state.status_code==200 and "session_token" not in state.json()
    assert (await client.get("/api/session",headers={"Authorization":"Bearer wrong"})).status_code==401

async def test_start_is_immutable_and_safe_config_has_no_answer(client):
    _,headers=await new_ready(client)
    one=(await client.post("/api/session/start",headers=headers)).json()
    two=(await client.post("/api/session/start",headers=headers)).json()
    assert one["assigned_version"]==two["assigned_version"]
    assert len(one["trials"])==6
    assert all("correct_answer" not in t and len(t["options"])==4 for t in one["trials"])

async def test_permuted_block_contains_every_version(client):
    versions=[]
    for _ in range(6):
        _,h=await new_ready(client); versions.append((await client.post("/api/session/start",headers=h)).json()["assigned_version"])
    assert set(versions)=={f"V{i}" for i in range(1,7)}

async def test_response_validation_order_and_idempotency(client):
    _,h=await new_ready(client); start=(await client.post("/api/session/start",headers=h)).json(); trial=start["trials"][0]
    payload={"selected_answer":trial["options"][0]["id"],"rt_selection_ms":100,"rt_submit_ms":200,"answer_changes":0,"zoom_used":False,"zoom_count":0,"trial_restarted":False,"restart_count":0}
    assert (await client.post("/api/trials/2/response",headers=h,json=payload)).status_code==409
    first=await client.post("/api/trials/1/response",headers=h,json=payload); duplicate=await client.post("/api/trials/1/response",headers=h,json=payload)
    assert first.status_code==200 and duplicate.status_code==200
    changed=payload|{"selected_answer":trial["options"][1]["id"]}
    assert (await client.post("/api/trials/1/response",headers=h,json=changed)).status_code==409
    assert (await client.get("/api/session",headers=h)).json()["current_trial_position"]==2

async def test_full_flow_and_protected_export(client):
    created,h=await new_ready(client); trials=(await client.post("/api/session/start",headers=h)).json()["trials"]
    for t in trials:
        payload={"selected_answer":t["options"][0]["id"],"rt_selection_ms":100,"rt_submit_ms":200,"answer_changes":0,"zoom_used":False,"zoom_count":0,"trial_restarted":False,"restart_count":0}
        assert (await client.post(f"/api/trials/{t['position']}/response",headers=h,json=payload)).status_code==200
    assert (await client.post("/api/session/complete",headers=h)).status_code==409
    assert (await client.post("/api/session/preference",headers=h,json={"preference":"no_preference"})).status_code==200
    assert (await client.post("/api/session/complete",headers=h)).json()=={"status":"completed"}
    assert (await client.get("/api/admin/export.csv",headers={"X-Admin-Secret":"bad"})).status_code==401
    exported=await client.get("/api/admin/export.csv",headers={"X-Admin-Secret":"admin-test-secret"})
    rows=list(csv.DictReader(io.StringIO(exported.text)))
    assert len(rows)==6 and all(r["participant_id"]==created["session_id"] for r in rows)
    assert all(r["consent_version"]=="test-v1" and r["consented_at"] for r in rows)

async def test_metric_consistency_validation(client):
    _,h=await new_ready(client); await client.post("/api/session/start",headers=h)
    bad={"selected_answer":"region_1","rt_selection_ms":300,"rt_submit_ms":200,"answer_changes":0,"zoom_used":False,"zoom_count":1,"trial_restarted":False,"restart_count":0}
    assert (await client.post("/api/trials/1/response",headers=h,json=bad)).status_code==422


async def test_complete_six_version_simulation_and_export(client):
    config_dir = Path(__file__).parents[2] / "config"
    answers = json.loads(
        (config_dir / "answer_key.server.json").read_text(encoding="utf-8")
    )["answers"]
    assigned_versions = []

    for participant_index in range(6):
        created, headers = await new_ready(client)
        started = (await client.post("/api/session/start", headers=headers)).json()
        assigned_versions.append(started["assigned_version"])
        assert len(started["trials"]) == 6

        for trial in started["trials"]:
            answer = answers[trial["task_id"]]
            assert answer in {option["id"] for option in trial["options"]}
            payload = {
                "selected_answer": answer,
                "rt_selection_ms": 100 + participant_index,
                "rt_submit_ms": 200 + participant_index,
                "answer_changes": 0,
                "zoom_used": False,
                "zoom_count": 0,
                "trial_restarted": False,
                "restart_count": 0,
            }
            response = await client.post(
                f"/api/trials/{trial['position']}/response",
                headers=headers,
                json=payload,
            )
            assert response.status_code == 200

        await client.post(
            "/api/session/preference",
            headers=headers,
            json={"preference": "no_preference"},
        )
        assert (await client.post("/api/session/complete", headers=headers)).status_code == 200

    assert set(assigned_versions) == {f"V{i}" for i in range(1, 7)}
    exported = await client.get(
        "/api/admin/export.csv", headers={"X-Admin-Secret": "admin-test-secret"}
    )
    rows = list(csv.DictReader(io.StringIO(exported.text)))
    simulated = [row for row in rows if row["assigned_version"] in assigned_versions]
    assert len(simulated) >= 36
    assert all(row["is_correct"] == "True" for row in simulated)
    assert Counter(row["method"] for row in simulated) == Counter({"J": 18, "CH": 18})
