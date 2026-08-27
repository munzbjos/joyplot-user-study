import asyncio
import os
from collections import Counter
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.engine import make_url

from app.main import create_app
from app.models import AllocationState, Base
from app.settings import Settings


DATABASE_URL = os.getenv("POSTGRES_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="set POSTGRES_TEST_DATABASE_URL to an isolated PostgreSQL test database",
)


@pytest.mark.asyncio
async def test_concurrent_blocks_and_same_session_start_are_safe():
    assert DATABASE_URL is not None
    database_name = make_url(DATABASE_URL).database or ""
    assert "test" in database_name.lower(), "refusing to reset a non-test database"

    settings = Settings(
        database_url=DATABASE_URL,
        admin_secret="postgres-test-admin-secret",
        token_pepper="postgres-test-token-pepper",
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
