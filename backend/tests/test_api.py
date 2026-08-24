import csv, io
from .conftest import new_ready

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

async def test_metric_consistency_validation(client):
    _,h=await new_ready(client); await client.post("/api/session/start",headers=h)
    bad={"selected_answer":"region_1","rt_selection_ms":300,"rt_submit_ms":200,"answer_changes":0,"zoom_used":False,"zoom_count":1,"trial_restarted":False,"restart_count":0}
    assert (await client.post("/api/trials/1/response",headers=h,json=bad)).status_code==422
