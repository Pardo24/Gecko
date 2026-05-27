#!/usr/bin/env bash
#
# End-to-end build: UI bundles (host) + bootable image (chroot).
#
# Step 1 — run as the user, in the project root:
#   $ npm install   (only if not done yet)
#   $ npm run build:headless     # vite + esbuild → dist/ + dist-server/
#
# Step 2 — run this script as root (or `wsl --user root`):
#   $ sudo ./gecko-os/build-all.sh
#
# This script just validates Step 1 ran successfully, then calls build.sh.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${HERE}/.." && pwd)"

# Validate the UI bundles exist
if [[ ! -f "${PROJECT_ROOT}/dist-server/server.js" ]] || [[ ! -d "${PROJECT_ROOT}/dist" ]]; then
  echo "[build-all] UI bundles missing. Run from project root first:"
  echo "[build-all]   npm run build:headless"
  exit 1
fi

# Run the actual image builder (via bash — files lose +x on Windows checkouts)
exec bash "${HERE}/build.sh"
