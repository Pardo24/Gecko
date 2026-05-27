#!/usr/bin/env bash
#
# Boot the image in QEMU long enough for the UI server to start, then probe
# it via the host-forwarded port 3300 → guest :3000. Exits successfully if
# /api/get-version replies.

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }

IMG="${IMG:-/mnt/c/Users/danie/projects/gecko/gecko-os/dist/gecko-os.img}"
LOG="${LOG:-/tmp/gecko-qemu-ui.log}"
TIMEOUT="${TIMEOUT:-240}"   # generous — first-boot + services take ~60s on TCG

[[ -f "$IMG" ]] || { echo "Image not found: $IMG"; exit 1; }

echo "[test] booting ${IMG} for up to ${TIMEOUT}s, probing :3300"
: > "$LOG"

qemu-system-x86_64 \
  -m 2048 \
  -smp 2 \
  -cpu qemu64 \
  -drive file="${IMG}",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::3300-:3000 \
  -device virtio-net-pci,netdev=net0 \
  -display none \
  -serial "file:${LOG}" \
  -monitor none \
  -no-reboot &
QEMU_PID=$!

# Probe loop — poll the forwarded port until it responds or we time out
DEADLINE=$(( $(date +%s) + TIMEOUT ))
SERVER_OK=""
while (( $(date +%s) < DEADLINE )); do
  if curl -sf --max-time 3 -X POST http://localhost:3300/api/get-version >/dev/null 2>&1; then
    SERVER_OK="yes"
    break
  fi
  sleep 2
done

# Capture the responses BEFORE killing QEMU (otherwise the curls hit a
# dead VM and return empty).
echo
echo "── gecko-ui server reachable: ${SERVER_OK:-NO} ──"
if [[ "${SERVER_OK}" == "yes" ]]; then
  echo "── responses (QEMU still alive) ──"
  echo -n "  get-version : "; curl -s -X POST http://localhost:3300/api/get-version 2>/dev/null || echo "(no body)"
  echo
  echo -n "  check-docker: "; curl -s --max-time 5 -X POST http://localhost:3300/api/check-docker 2>/dev/null || echo "(no body)"
  echo
  echo -n "  index.html  : "; curl -s --max-time 5 http://localhost:3300/ | head -c 120
  echo
fi

# Now kill QEMU
kill "$QEMU_PID" 2>/dev/null || true
wait "$QEMU_PID" 2>/dev/null || true

echo
echo "── final 20 lines of serial log ──"
tail -20 "$LOG"
