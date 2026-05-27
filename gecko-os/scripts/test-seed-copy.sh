#!/usr/bin/env bash
# Quick test: docker volume seed + SQL readback.
set -euo pipefail

VOL="gecko_test_bazarr_seed_$$"
SEED_DIR=/mnt/c/Users/danie/projects/gecko/stack/seeds/bazarr

docker volume rm "$VOL" 2>/dev/null || true
docker volume create "$VOL" >/dev/null

CMD='if [ -z "$(ls -A /dest 2>/dev/null)" ]; then cp -a /src/. /dest/ && echo SEEDED; else echo SKIPPED_NONEMPTY; fi'

echo "── first run (volume empty) ──"
docker run --rm -v "${VOL}:/dest" -v "${SEED_DIR}:/src:ro" alpine sh -c "$CMD"

echo "── inspect: rows? ──"
docker run --rm -v "${VOL}:/data" alpine sh -c \
  "apk add --no-cache sqlite >/dev/null && sqlite3 /data/bazarr.db 'SELECT profileId, name FROM table_languages_profiles;'"

echo "── second run (volume has data, should skip) ──"
docker run --rm -v "${VOL}:/dest" -v "${SEED_DIR}:/src:ro" alpine sh -c "$CMD"

docker volume rm "$VOL" >/dev/null
echo "── test cleanup done ──"
