# Architecture and Phase 0 decisions

## Source-of-truth boundaries

- `config/` and root `stimuli/` are locked experimental inputs.
- The backend resolves versions/tasks and computes correctness from the
  server-only answer key. The browser never receives that key.
- Caddy may expose only the compiled frontend and root `stimuli/`; configuration
  carrying answers remains inside the API image/runtime.

## Runtime

```text
browser -- HTTPS --> Caddy -- /api, /health --> FastAPI --> PostgreSQL volume
                       |
                       +-- / and /stimuli --> local immutable static files
```

Caddy is the sole published service. PostgreSQL and the API share an isolated
database network; Caddy and the API share a separate web network so Caddy can
reach the public ACME service for certificates. PostgreSQL has no route through
the web network and no published port. The database uses a named persistent
volume. Caddy certificate state is persistent so restarts do not cause
unnecessary reissuance.

The frontend is compiled in a multi-stage container build, then copied into the
minimal Caddy runtime image together with the unchanged root stimuli. Same-origin
routing avoids broad CORS permissions and makes a future university-server move
primarily an environment/DNS change.

## Security and privacy decisions

- Secrets exist only in an ignored, permission-restricted `.env` file.
- PostgreSQL is never published to the host or internet.
- Research export requires a separate high-entropy admin bearer token.
- Access logs remove IP/cookie/authorization fields and use bounded rotation.
- No third-party scripts, analytics, fonts, or trackers are required.
- HTTPS is automatic for a valid public hostname; local smoke tests use HTTP.

## Operational decisions

- Container health checks order startup and expose deployment failures.
- Database migrations run as an API startup prerequisite (implemented by the
  backend image/entrypoint).
- Backups use PostgreSQL custom format and are treated as sensitive participant
  data. Restore tests and retention policy remain operational responsibilities.
- Rollbacks prefer the prior immutable Git commit/application image. Destructive
  database restoration requires an explicit impact assessment.

## Phase 0 record

The selected stack is React/TypeScript/Vite, FastAPI, PostgreSQL, Docker Compose,
and Caddy. `develop` is the integration branch; `main` remains stable. The
canonical validator and an explicit root-stimuli filename audit must pass before
build/deployment. Final domain, ethics wording, training assets, and retention
period are researcher-provided inputs and are intentionally not invented here.
