import asyncio
import os
import subprocess
import sys
from collections import Counter
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import make_url
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.main import create_app
from app.models import AllocationState, Base
from app.settings import Settings


DATABASE_URL = os.getenv("POSTGRES_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="set POSTGRES_TEST_DATABASE_URL to an isolated PostgreSQL test database",
)


@pytest.mark.asyncio
async def test_000_ui_language_migration_backfills_without_changing_counts_or_allocator():
    assert DATABASE_URL is not None
    database_name = make_url(DATABASE_URL).database or ""
    assert "test" in database_name.lower(), "refusing to reset a non-test database"
    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as connection:
        await connection.execute(text("DROP SCHEMA public CASCADE"))
        await connection.execute(text("CREATE SCHEMA public"))
    await engine.dispose()

    environment = os.environ | {"DATABASE_URL": DATABASE_URL}
    backend_dir = Path(__file__).parents[1]
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "0003_trial_max_zoom"], cwd=backend_dir, env=environment, check=True)

    engine = create_async_engine(DATABASE_URL)
    async with engine.begin() as connection:
        await connection.execute(text("INSERT INTO participants (id, token_hash, status) VALUES ('00000000-0000-0000-0000-000000000001', 'legacy', 'created')"))
        await connection.execute(text("UPDATE allocation_state SET block_json='[\"V4\", \"V1\"]', next_index=1 WHERE id=1"))
    await engine.dispose()

    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend_dir, env=environment, check=True)
    engine = create_async_engine(DATABASE_URL)
    async with engine.connect() as connection:
        participant = (await connection.execute(text("SELECT count(*), min(ui_language) FROM participants"))).one()
        allocator = (await connection.execute(text("SELECT block_json, next_index FROM allocation_state WHERE id=1"))).one()
        revision = await connection.scalar(text("SELECT version_num FROM alembic_version"))
    await engine.dispose()
    assert participant == (1, "en")
    assert allocator == ('["V4", "V1"]', 1)
    assert revision == "0004_participant_ui_language"


@pytest.mark.asyncio
async def test_concurrent_blocks_and_same_session_start_are_safe():
    assert DATABASE_URL is not None
    database_name = make_url(DATABASE_URL).database or ""
    assert "test" in database_name.lower(), "refusing to reset a non-test database"

    settings = Settings(
        database_url=DATABASE_URL,
        admin_secret="postgres-test-admin-secret",
        token_pepper="postgres-test-token-pepper",
        consent_text_version="test-v1",
        config_dir=Path(__file__).parents[2] / "config",
    )
    app = create_app(settings)

    async with app.router.lifespan_context(app):
        async with app.state.engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
            await connection.run_sync(Base.metadata.create_all)
        async with app.state.sessionmaker() as session:
            session.add(AllocationState(id=1))
            await session.commit()

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            headers = []
            for _ in range(12):
                created = (await client.post("/api/sessions", json={})).json()
                auth = {"Authorization": f"Bearer {created['session_token']}"}
                consent = await client.put(
                    "/api/session/consent",
                    headers=auth,
                    json={"consented": True, "consent_version": "test-v1"},
                )
                assert consent.status_code == 200
                saved = await client.put(
                    "/api/session/demographics",
                    headers=auth,
                    json={
                        "age": 30,
                        "gender": "prefer_not_to_say",
                        "cartographic_background": False,
                    },
                )
                assert saved.status_code == 200
                headers.append(auth)

            starts = await asyncio.gather(
                *(client.post("/api/session/start", headers=auth) for auth in headers)
            )
            versions = [response.json()["assigned_version"] for response in starts]
            assert Counter(versions) == Counter({f"V{i}": 2 for i in range(1, 7)})

            created = (await client.post("/api/sessions", json={})).json()
            same_auth = {"Authorization": f"Bearer {created['session_token']}"}
            consent = await client.put(
                "/api/session/consent",
                headers=same_auth,
                json={"consented": True, "consent_version": "test-v1"},
            )
            assert consent.status_code == 200
            await client.put(
                "/api/session/demographics",
                headers=same_auth,
                json={
                    "age": 31,
                    "gender": "prefer_not_to_say",
                    "cartographic_background": False,
                },
            )
            duplicate_starts = await asyncio.gather(
                *(client.post("/api/session/start", headers=same_auth) for _ in range(8))
            )
            assert all(response.status_code == 200 for response in duplicate_starts)
            assert len(
                {response.json()["assigned_version"] for response in duplicate_starts}
            ) == 1

        async with app.state.engine.begin() as connection:
            await connection.run_sync(Base.metadata.drop_all)
