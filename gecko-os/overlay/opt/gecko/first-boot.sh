#!/usr/bin/env bash
#
# Gecko OS first-boot orchestration.
#
# Runs once on first power-on, before the kiosk Chromium opens. Responsible for:
#   1. Expanding the root partition to fill the disk (image is ~4 GB; user's
#      USB or disk is typically much bigger).
#   2. Generating a machine-id so logs and Avahi work.
#   3. Starting the wizard backend (the Electron app's main process, but
#      headless — serves the UI over localhost:3000 for Chromium to render).
#   4. Marking first-boot done so this service doesn't fire again.
#
# Stage 0: skeleton. Real work happens once the kiosk Electron app exists.

set -euo pipefail
exec > >(tee -a /var/log/gecko-first-boot.log) 2>&1

log() { echo "[first-boot $(date '+%H:%M:%S')] $*"; }

# ── 1. Expand rootfs to fill the device ─────────────────────────────
expand_rootfs() {
  log "Expanding rootfs to fill the device"
  local root_part
  root_part=$(findmnt -no SOURCE / | sed 's|/dev/||')
  local disk="${root_part%[0-9]}"     # strip partition number
  local partnum="${root_part##*[!0-9]}"

  growpart "/dev/${disk}" "${partnum}" || log "growpart skipped (already max)"
  resize2fs "/dev/${root_part}" || log "resize2fs skipped"
}

# ── 2. Ensure unique machine-id ─────────────────────────────────────
ensure_machine_id() {
  if [[ ! -s /etc/machine-id ]] || [[ "$(cat /etc/machine-id)" == "uninitialized" ]]; then
    log "Generating new machine-id"
    rm -f /etc/machine-id /var/lib/dbus/machine-id
    systemd-machine-id-setup
    ln -sf /etc/machine-id /var/lib/dbus/machine-id
  fi
}

# ── 3. Prepare directories for the Docker stack ─────────────────────
prepare_stack_dirs() {
  log "Preparing /opt/gecko"
  mkdir -p /opt/gecko/data
  mkdir -p /opt/gecko/userData/stack
  # Copy stack files (compose, gecko-init, recyclarr, buildarr) to userData
  # — the wizard's `install` IPC handler will fill in .env from user input.
  rsync -a --ignore-existing /opt/gecko/stack/ /opt/gecko/userData/stack/
  chown -R gecko:gecko /opt/gecko
}

# ── 4. Mark done ────────────────────────────────────────────────────
mark_done() {
  log "Marking first-boot complete"
  mkdir -p /var/lib/gecko
  touch /var/lib/gecko/first-boot-done
}

# ── Main ────────────────────────────────────────────────────────────
main() {
  log "Gecko OS first boot starting"
  expand_rootfs
  ensure_machine_id
  prepare_stack_dirs
  mark_done
  log "First-boot tasks complete — handing control to the wizard kiosk"
}

main
