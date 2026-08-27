# Joy Plot User Study

Research web application for a controlled comparison of bivariate joy plots
and 3×3 bivariate choropleth maps. The authoritative experimental design is in
[`PROJECT_SPEC.md`](PROJECT_SPEC.md).

## Locked inputs

- `config/` contains the canonical task bank, V1–V6 rotation and server-only
  answer key.
- `stimuli/` contains 36 frozen master PNGs. Do not modify, rename or
  recompress them.
- The answer key and `experiment.server.json` must never be served to the
  browser.

Validate these inputs before every build or deployment:

```sh
python3 config/validate_config.py
```

The expected result is `EXPERIMENT CONFIGURATION: PASS`, including validation
of all 36 PNGs in the repository-root `stimuli/` directory.

## Application

- `frontend/`: React, TypeScript and Vite participant interface
- `backend/`: FastAPI, SQLAlchemy and Alembic API
- `deploy/`: Caddy configuration and operational documentation
- `docker-compose.yml`: PostgreSQL, API and HTTPS/static web topology

See [`backend/README.md`](backend/README.md) for the API and
[`deploy/README.md`](deploy/README.md) for deployment, backup, update and
rollback procedures.

## Development checks

```sh
cd frontend
npm ci
npm test -- --run
npm run build

cd ../backend
python3.12 -m venv .venv
.venv/bin/pip install -e '.[test]'
.venv/bin/pytest
```

Do not commit `.env` files, credentials, database dumps, exports or participant
data. `main` is the stable branch; integration work occurs on `develop`.

## Researcher inputs still required before production recruitment

- approved non-measured training stimuli for both visualisation methods;
- final institution, investigator, consent, privacy, withdrawal and ethics
  wording;
- approved participant minimum age and minimum viewport threshold;
- production domain and data-retention policy.

The application intentionally exposes placeholders until these materials are
approved. They must not be inferred from the measured stimuli.
