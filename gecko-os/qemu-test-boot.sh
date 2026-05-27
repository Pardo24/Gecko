#!/usr/bin/env bash
#
# Boot Gecko OS image in QEMU headless for ~90s, log all serial output,
# then kill it. For Stage 1 validation: just confirm kernel boots and
# systemd reaches a login prompt.

set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root"; exit 1; }

IMG="${IMG:-/mnt/c/Users/danie/projects/gecko/gecko-os/dist/gecko-os.img}"
LOG="${LOG:-/tmp/gecko-qemu-boot.log}"
TIMEOUT="${TIMEOUT:-120}"

[[ -f "$IMG" ]] || { echo "Image not found: $IMG"; exit 1; }

echo "[test] Booting ${IMG} via SeaBIOS for ${TIMEOUT}s; logging to ${LOG}"
: > "$LOG"

# SeaBIOS (QEMU default) for legacy boot — exercises the BIOS GRUB path we
# embedded in the bios_grub partition. UEFI testing needs `apt install ovmf`.
timeout --foreground "${TIMEOUT}" qemu-system-x86_64 \
  -m 2048 \
  -smp 2 \
  -cpu qemu64 \
  -drive file="${IMG}",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22,hostfwd=tcp::3300-:3000 \
  -device virtio-net-pci,netdev=net0 \
  -display none \
  -serial "file:${LOG}" \
  -monitor none \
  -no-reboot 2>&1 | tail -5 || true

echo
echo "── boot log summary (key milestones) ──"
grep -nE "GRUB|Linux version|systemd\[1\]|Reached target|Started|gecko-first-boot|gecko-ui|gecko-kiosk|Welcome to|login:" "$LOG" | head -50
echo
echo "── tail of boot log ──"
tail -30 "$LOG"
