#!/usr/bin/env bash
#
# Launches the Gecko kiosk: Xorg + openbox + Chromium pointed at the wizard.
#
# Flow:
#   - If first-boot wizard hasn't run yet  → point at the wizard URL
#   - Otherwise                            → point at the dashboard
#
# Chromium runs in --kiosk mode (no chrome, no titlebar, full-screen, no
# right-click menus). Output is HDMI by default. Mouse cursor auto-hides
# via unclutter after 1 second of inactivity.

set -euo pipefail
exec > >(tee -a /var/log/gecko-kiosk.log) 2>&1

WIZARD_URL="http://localhost:3000/wizard"
DASHBOARD_URL="http://localhost:3000/"
STATE_FILE="/var/lib/gecko/wizard-done"

# Wait for the Gecko UI server to be ready (started by gecko-ui.service)
for i in {1..60}; do
  if curl -sf "${DASHBOARD_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if [[ -f "${STATE_FILE}" ]]; then
  URL="${DASHBOARD_URL}"
else
  URL="${WIZARD_URL}"
fi

echo "[kiosk] Starting X + Chromium → ${URL}"

# Start Xorg via startx, run openbox in the background, then Chromium kiosk.
exec startx /usr/bin/openbox-session -- \
  -nocursor \
  > /var/log/gecko-xorg.log 2>&1 &

# Wait for X to come up
for i in {1..30}; do
  if xset -display :0 q >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Hide cursor + run Chromium in kiosk mode
unclutter -idle 1 -display :0 &

exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-translate \
  --disable-infobars \
  --disable-features=TranslateUI,IsolateOrigins,site-per-process \
  --no-first-run \
  --start-fullscreen \
  --display=:0 \
  --user-data-dir=/home/gecko/.chromium-kiosk \
  "${URL}"
