#!/usr/bin/env bash
#
# X session entry — run by xinit after Xorg is up.
# Starts the WM, cursor hider, then exec into Chromium kiosk.

set -euo pipefail
exec > >(tee -a /var/log/gecko-x-session.log) 2>&1

URL="${GECKO_URL:-http://localhost:3000/wizard}"

# Minimal window manager (no titlebars, no decorations)
openbox-session &
OPENBOX_PID=$!

# Wait briefly for openbox to settle
sleep 1

# Hide the mouse pointer after 1 s of inactivity
unclutter -idle 1 -root &

# Disable screen blanking / power saving — TVs go to sleep otherwise.
xset s off
xset s noblank
xset -dpms

# Launch Chromium kiosk. exec replaces the shell — when Chromium exits
# (rare), the systemd service will restart us.
exec chromium \
  --kiosk \
  --noerrdialogs \
  --disable-translate \
  --disable-infobars \
  --disable-features=TranslateUI,IsolateOrigins,site-per-process \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --no-first-run \
  --no-default-browser-check \
  --start-fullscreen \
  --user-data-dir=/home/gecko/.chromium-kiosk \
  "${URL}"
