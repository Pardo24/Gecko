#!/usr/bin/env bash
#
# Generate stack/seeds/bazarr/bazarr.db with 3 pre-built language profiles.
#
# Why: Bazarr's REST API (/api/system/languages/profiles) is GET-only — we
# can't create profiles at runtime. So we ship a SQLite database that
# already has them, and the install handler copies it into the bazarr_config
# volume before the bazarr container first starts.
#
# How: boot a clean linuxserver/bazarr container, wait for it to create the
# DB, INSERT the 3 profile rows, then copy bazarr.db out.
#
# Idempotent — re-run when Bazarr's image tag bumps and schema may have
# drifted. Updates stack/seeds/bazarr/bazarr.db in place.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SEED_DIR="${REPO_ROOT}/stack/seeds/bazarr"
META_FILE="${REPO_ROOT}/stack/seeds/_meta/versions.txt"
IMAGE="${BAZARR_IMAGE:-lscr.io/linuxserver/bazarr:latest}"
CONTAINER_NAME="gecko-bazarr-seed-gen-$$"
TMPDIR=$(mktemp -d)
trap 'rm -rf "${TMPDIR}"; docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true' EXIT

log() { echo "[regen-bazarr-seed] $*"; }

log "Booting clean ${IMAGE}"
docker run -d --name "${CONTAINER_NAME}" \
  -e PUID=1000 -e PGID=1000 -e TZ=Europe/Madrid \
  -v "${TMPDIR}:/config" \
  "${IMAGE}" >/dev/null

log "Waiting for Bazarr to create its SQLite DB (up to 90 s)"
for i in {1..90}; do
  if docker exec "${CONTAINER_NAME}" test -f /config/db/bazarr.db 2>/dev/null; then
    sleep 2   # give it a moment to finish initial writes
    break
  fi
  sleep 1
done

if ! docker exec "${CONTAINER_NAME}" test -f /config/db/bazarr.db; then
  log "FATAL: bazarr.db never appeared"
  exit 1
fi

log "Stopping Bazarr (avoid concurrent writes during SQL injection)"
docker stop "${CONTAINER_NAME}" >/dev/null

log "Inserting 3 language profiles via sqlite3"
SQL_FILE="$(dirname "$0")/bazarr-seed-profiles.sql"
# Mount both the bazarr config and the SQL file into alpine, run sqlite3.
docker run --rm \
  -v "${TMPDIR}:/config" \
  -v "${SQL_FILE}:/seed.sql:ro" \
  alpine:latest sh -c '
    apk add --no-cache sqlite >/dev/null
    sqlite3 /config/db/bazarr.db < /seed.sql
  '

log "Copying bazarr.db to seed dir"
mkdir -p "${SEED_DIR}"
cp "${TMPDIR}/db/bazarr.db" "${SEED_DIR}/bazarr.db"

log "Recording image version"
mkdir -p "$(dirname "${META_FILE}")"
IMAGE_DIGEST=$(docker image inspect "${IMAGE}" --format '{{index .RepoDigests 0}}' 2>/dev/null || echo "$IMAGE")
{
  # Replace any existing bazarr line; preserve others
  grep -v '^bazarr=' "${META_FILE}" 2>/dev/null || true
  echo "bazarr=${IMAGE_DIGEST}"
} > "${META_FILE}.new"
mv "${META_FILE}.new" "${META_FILE}"

log "Done — seed at ${SEED_DIR}/bazarr.db ($(du -h "${SEED_DIR}/bazarr.db" | cut -f1))"
