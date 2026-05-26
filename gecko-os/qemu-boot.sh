#!/usr/bin/env bash
#
# Boot the built Gecko OS image in QEMU for testing.
#
# WSL note: nested KVM is unreliable on WSL2 (KVM-on-Hyper-V). The script
# falls back to TCG (software emulation) if KVM isn't available — slower but
# works. Real hardware testing is still the final validation.
#
# Display: VNC on localhost:5901 (use TightVNC viewer / TigerVNC / RealVNC).
# Kernel console: also mirrored to serial → stdout for build-time debugging.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
IMG_PATH="${IMG_PATH:-${HERE}/dist/gecko-os.img}"
RAM_MB="${RAM_MB:-2048}"
CPUS="${CPUS:-2}"
VNC_PORT="${VNC_PORT:-1}"   # → maps to localhost:$((5900+VNC_PORT))

[[ -f "${IMG_PATH}" ]] || { echo "Image not found: ${IMG_PATH}"; exit 1; }

# Pick acceleration: KVM if available, else TCG.
ACCEL_ARGS=()
if [[ -e /dev/kvm ]] && [[ -r /dev/kvm ]] && [[ -w /dev/kvm ]]; then
  echo "[qemu] KVM acceleration available"
  ACCEL_ARGS=(-enable-kvm -cpu host)
else
  echo "[qemu] No KVM — running with TCG (software emulation, slow)"
  ACCEL_ARGS=(-cpu qemu64)
fi

# OVMF firmware for UEFI boot. Path varies between distros.
OVMF_CODE=""
for candidate in \
  /usr/share/OVMF/OVMF_CODE.fd \
  /usr/share/ovmf/OVMF.fd \
  /usr/share/qemu/OVMF.fd; do
  [[ -f "$candidate" ]] && { OVMF_CODE="$candidate"; break; }
done
[[ -n "${OVMF_CODE}" ]] || { echo "OVMF firmware not found. apt install ovmf"; exit 1; }
echo "[qemu] UEFI firmware: ${OVMF_CODE}"

echo "[qemu] Booting ${IMG_PATH} (${RAM_MB} MB RAM, ${CPUS} CPUs)"
echo "[qemu] VNC: localhost:$((5900 + VNC_PORT))  (also TCP-forward from Windows)"
echo "[qemu] Serial: stdout (Ctrl-A X to quit)"

exec qemu-system-x86_64 \
  "${ACCEL_ARGS[@]}" \
  -m "${RAM_MB}" \
  -smp "${CPUS}" \
  -drive if=pflash,format=raw,readonly=on,file="${OVMF_CODE}" \
  -drive file="${IMG_PATH}",format=raw,if=virtio \
  -netdev user,id=net0,hostfwd=tcp::2222-:22 \
  -device virtio-net-pci,netdev=net0 \
  -vnc "127.0.0.1:${VNC_PORT}" \
  -serial mon:stdio \
  -no-reboot
