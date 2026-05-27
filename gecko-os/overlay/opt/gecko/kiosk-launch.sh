#!/usr/bin/env bash
#
# Gecko kiosk launcher.
#
# Started by gecko-kiosk.service as user `gecko`. Waits for the UI server
# (gecko-ui.service on :3000), then uses xinit to start Xorg on tty1 with
# the kiosk session script as the WM target.

set -euo pipefail
exec > >(tee -a /var/log/gecko-kiosk.log) 2>&1

WIZARD_URL="http://localhost:3000/wizard"
DASHBOARD_URL="http://localhost:3000/"
STATE_FILE="/var/lib/gecko/wizard-done"

# 1. Wait for the UI server to be ready. Up to 90 s — apt-installed Node +
#    bundled server should start in under 5 s, but cold disk on cheap eMMC
#    can be slow.
for i in {1..90}; do
  if curl -sf "${DASHBOARD_URL}" >/dev/null 2>&1; then
    echo "[kiosk] UI server ready"
    break
  fi
  sleep 1
done

# 2. Pick URL based on wizard state
if [[ -f "${STATE_FILE}" ]]; then
  URL="${DASHBOARD_URL}"
else
  URL="${WIZARD_URL}"
fi
export GECKO_URL="${URL}"
echo "[kiosk] target: ${URL}"

# 3. Start Xorg + the session script.
# xinit handles Xorg lifecycle cleanly; vt1 = first virtual terminal which is
# what most BIOS/UEFI hand off the display to. `-nocursor` hides the X cursor
# (unclutter handles the X11 cursor that some apps draw).
exec xinit /opt/gecko/x-session.sh -- :0 vt1 -nocursor
