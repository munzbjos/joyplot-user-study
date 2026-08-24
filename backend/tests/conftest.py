import os
from pathlib import Path
os.environ.setdefault("ADMIN_SECRET", "import-only-test-secret")
os.environ.setdefault("TOKEN_PEPPER", "import-only-test-pepper")
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.main import create_app
from app.models import AllocationState, Base
from app.settings import Settings

@pytest.fixture
async def client(tmp_path):
    db=tmp_path/"test.db"
    settings=Settings(database_url=f"sqlite+aiosqlite:///{db}",admin_secret="admin-test-secret",token_pepper="pepper-test",config_dir=Path(__file__).parents[2]/"config")
    app=create_app(settings)
    async with app.router.lifespan_context(app):
        async with app.state.engine.begin() as conn: await conn.run_sync(Base.metadata.create_all)
        async with app.state.sessionmaker() as s:
            s.add(AllocationState(id=1)); await s.commit()
        async with AsyncClient(transport=ASGITransport(app=app),base_url="http://test") as c: yield c

async def new_ready(client):
    created=(await client.post("/api/sessions",json={})).json(); headers={"Authorization":f"Bearer {created['session_token']}"}
    r=await client.put("/api/session/demographics",headers=headers,json={"age":30,"gender":"man","cartographic_background":False}); assert r.status_code==200
    return created,headers
