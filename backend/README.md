# Backend

FastAPI service for the Joy Plot user study. Experimental configuration is read
from the repository's locked `config/` directory at server startup. The answer
key is never returned by a public endpoint.

## Authentication

`POST /api/sessions` returns a high-entropy session token once. Store it in the
browser and send it as `Authorization: Bearer <token>`. Only an HMAC-SHA-256
digest is stored in PostgreSQL. Research export requires `X-Admin-Secret`.

## API flow

1. `POST /api/sessions`
2. `PUT /api/session/consent`
3. `PUT /api/session/demographics`
4. `POST /api/session/start`
5. `GET /api/trials/current`
6. `POST /api/trials/{position}/response` for each trial
7. `POST /api/session/preference`
8. `POST /api/session/complete`

Session state is recovered with `GET /api/session`. Starting and response
submission are idempotent. A replay with conflicting response data returns
HTTP 409.

## Development

```sh
python -m pip install -e '.[test]'
pytest
```

Set `DATABASE_URL`, `ADMIN_SECRET`, `TOKEN_PEPPER`, and `CONSENT_TEXT_VERSION`. Apply schema changes with
`alembic upgrade head`. Production uses PostgreSQL; tests use SQLite only as a
fast API-level abstraction. The PostgreSQL row-locking allocation strategy must
also be exercised in deployment QA.

`CONSENT_TEXT_VERSION` is required and must identify the exact consent copy
shown by the frontend. Bump it whenever that text changes; the API rejects stale
or mismatched versions so consent cannot silently apply to different wording.

For the PostgreSQL locking regression test, point only at a disposable database
whose name contains `test`:

```sh
POSTGRES_TEST_DATABASE_URL='postgresql+asyncpg://.../joyplot_test' \
  pytest tests/test_postgres_concurrency.py
```

The test deliberately drops and recreates its schema and refuses database names
that do not contain `test`.
