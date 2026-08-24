# Deployment and operations

The production topology is deliberately small: Caddy is the only public
service, FastAPI and PostgreSQL share a Docker-internal network, and PostgreSQL
has no host port. Caddy serves the compiled frontend and the immutable PNG
stimuli, proxies `/api/*` and `/health` to FastAPI, and obtains/renews HTTPS
certificates when `SITE_ADDRESS` is a public DNS name.

## Initial deployment

Requirements: Docker Engine with Compose v2, DNS for the study hostname pointed
at the VPS, and inbound TCP 80/443 plus UDP 443. Do not expose port 5432.

```sh
cp .env.example .env
chmod 600 .env
```

Replace all `CHANGE_ME` values with independently generated high-entropy
secrets. The password embedded in `DATABASE_URL` must exactly equal
`POSTGRES_PASSWORD`; URL-encode punctuation if needed. Set `SITE_ADDRESS` to the
public hostname. Replace every bracketed `VITE_*` value with researcher-approved
copy; these values are compiled into the frontend image at build time. Keep the
training asset values empty until approved non-measured assets are supplied.
Never commit `.env`. A simple way to generate URL-safe values
is `openssl rand -base64 48 | tr -d '\\n'`; generate each value separately.

Validate and start:

```sh
python3 config/validate_config.py
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps
docker compose logs --tail=100 api web
curl --fail https://YOUR_HOST/health
```

The API image is expected to run database migrations before starting FastAPI.
Deployment must stop if a migration fails. Confirm this behaviour in the
backend Docker entrypoint before production launch.

For local HTTP smoke testing, retain `SITE_ADDRESS=http://localhost` and
`PUBLIC_ORIGIN=http://localhost`, then browse to `http://localhost`.

## Updating

Create a database backup first. Record the currently deployed Git commit and
image IDs, then update only from a reviewed stable commit:

```sh
mkdir -p backups
chmod 700 backups
docker compose exec -T db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "backups/joyplot-$(date -u +%Y%m%dT%H%M%SZ).dump"
git rev-parse HEAD
docker compose images
git pull --ff-only origin main
python3 config/validate_config.py
docker compose build
docker compose up -d --remove-orphans
docker compose ps
curl --fail https://YOUR_HOST/health
```

Run the backup command from a shell that has loaded the deployment `.env`
(`set -a; . ./.env; set +a`) or substitute the non-secret database/user names.
Backups contain participant data: keep them outside Git, encrypted at rest,
access-restricted, and under a researcher-approved retention policy. Regularly
test restoration into a separate disposable database.

## Rollback

Application-only rollback: check out the previously recorded stable commit,
rebuild, and restart. Use `git switch --detach PREVIOUS_COMMIT`; do not rewrite
shared branch history. Database migrations should be designed backward-compatible
for at least one application release.

If a migration must be reversed, stop public traffic first and follow that
migration's reviewed downgrade procedure. Restore a dump only as a last resort,
because it discards all responses recorded after the backup. Never run a blind
database rollback on live participant data.

## Logs, privacy, and maintenance

Caddy access logs are stored in the `caddy_logs` volume, rotated at 10 MiB,
retained for at most five files/seven days, and filter out client IP fields,
cookies, and authorization headers. Docker's own container logs remain subject
to the host daemon's logging policy; configure bounded rotation globally (for
example `max-size=10m`, `max-file=3`). Application code must not log session
tokens, response bodies, admin tokens, participant demographics, or full CSV
exports.

Useful operations:

```sh
docker compose ps
docker compose logs --tail=100 api web db
docker compose restart api
docker compose down                 # persistent volumes remain
docker compose up -d
```

Do not use `docker compose down -v` in normal operations: it deletes the
database and Caddy state. Monitor disk space, container health, certificate
renewal, backup success, and PostgreSQL volume growth. Rotate the admin token
and database credentials through a planned maintenance procedure.

## Research export

Use the backend's authenticated researcher export endpoint or documented CLI.
Keep `ADMIN_SECRET` out of shell history where possible, transfer exports
over an encrypted channel, and delete working copies according to the approved
data-retention plan. The public frontend must never contain the answer key.
