#!/usr/bin/env bash
#
# Build the macOS .pkg installer.
#
# Must run on macOS — uses Apple's `pkgbuild` and `productbuild`.
# (Linux/Windows can't build .pkg files; CI uses a macos-latest runner.)
#
# Output: dist/Gecko-<version>-arm64.pkg (Apple Silicon)
#         dist/Gecko-<version>-x86_64.pkg (Intel)

set -euo pipefail

NODE_VERSION="${NODE_VERSION:-20.18.0}"
HERE="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HERE/../.." && pwd)"
BUILD_DIR="$HERE/build"

# Single source of truth for the version is package.json. Caller can still
# override with VERSION=… for local experiments.
VERSION="${VERSION:-$(node -p "require('$PROJECT_ROOT/package.json').version" 2>/dev/null || echo 0.0.0-dev)}"

# Detect architecture (caller can override with ARCH=arm64 / x86_64)
ARCH="${ARCH:-$(uname -m)}"
case "$ARCH" in
  arm64|aarch64) NODE_ARCH="arm64" ;;
  x86_64|amd64)  NODE_ARCH="x64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

log() { echo "[build-macos] $*"; }

log "Building Gecko ${VERSION} for ${NODE_ARCH}"

# ── 1. Build UI bundles if missing ────────────────────────────────
if [[ ! -f "$PROJECT_ROOT/dist-server/server.js" ]] || [[ ! -d "$PROJECT_ROOT/dist" ]]; then
  log "UI bundles missing; running npm run build..."
  (cd "$PROJECT_ROOT" && npm run build)
fi

# ── 2. Stage payload ──────────────────────────────────────────────
PAYLOAD="$BUILD_DIR/payload"
rm -rf "$BUILD_DIR"
mkdir -p "$PAYLOAD/usr/local/gecko"
mkdir -p "$PAYLOAD/Library/LaunchDaemons"

# Portable Node — downloaded once, cached under $HERE/cache/
CACHE="$HERE/cache"
mkdir -p "$CACHE"
NODE_TGZ="$CACHE/node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz"
if [[ ! -f "$NODE_TGZ" ]]; then
  log "Downloading Node ${NODE_VERSION} for darwin-${NODE_ARCH}..."
  curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-darwin-${NODE_ARCH}.tar.gz" -o "$NODE_TGZ"
fi
tar -xzf "$NODE_TGZ" -C "$BUILD_DIR"
mv "$BUILD_DIR/node-v${NODE_VERSION}-darwin-${NODE_ARCH}"/bin/node "$PAYLOAD/usr/local/gecko/node"
chmod 755 "$PAYLOAD/usr/local/gecko/node"

# Gecko bundles
cp "$PROJECT_ROOT/dist-server/server.js" "$PAYLOAD/usr/local/gecko/"
mkdir -p "$PAYLOAD/usr/local/gecko/renderer"
cp -R "$PROJECT_ROOT/dist/." "$PAYLOAD/usr/local/gecko/renderer/"
mkdir -p "$PAYLOAD/usr/local/gecko/stack"
cp -R "$PROJECT_ROOT/stack/." "$PAYLOAD/usr/local/gecko/stack/"

# Launch daemon plist — starts Gecko at boot as root
cat > "$PAYLOAD/Library/LaunchDaemons/com.gecko.server.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gecko.server</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/gecko/node</string>
    <string>/usr/local/gecko/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/usr/local/gecko</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>STATIC_DIR</key>
    <string>/usr/local/gecko/renderer</string>
    <key>STACK_BASE</key>
    <string>/usr/local/gecko/stack</string>
    <key>COMPOSE_DIR</key>
    <string>/Library/Application Support/Gecko/stack</string>
    <key>GECKO_VERSION</key>
    <string>${VERSION}</string>
    <key>PATH</key>
    <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/Library/Logs/Gecko/server.log</string>
  <key>StandardErrorPath</key>
  <string>/Library/Logs/Gecko/server.log</string>
</dict>
</plist>
PLIST

# ── 3. Post-install script: load daemon + open browser ────────────
SCRIPTS="$BUILD_DIR/scripts"
mkdir -p "$SCRIPTS"
cat > "$SCRIPTS/postinstall" <<'POST'
#!/bin/bash
set -e
# Ensure log dir + data dir exist with right perms before launchd starts us
mkdir -p /Library/Logs/Gecko
mkdir -p "/Library/Application Support/Gecko/stack"
chmod 755 /Library/Logs/Gecko

# Load the launch daemon — starts the service immediately
launchctl load -w /Library/LaunchDaemons/com.gecko.server.plist 2>/dev/null || true

# Wait briefly then open the browser (run as the actual user, not root)
USER_NAME=$(stat -f "%Su" /dev/console)
sleep 3
sudo -u "$USER_NAME" open "http://localhost:3000" || true
exit 0
POST
chmod +x "$SCRIPTS/postinstall"

# Pre-uninstall hook (called by a separate uninstall script users run manually)
# productbuild doesn't auto-generate uninstallers; we ship a separate script
# under /usr/local/gecko/uninstall.sh.
cat > "$PAYLOAD/usr/local/gecko/uninstall.sh" <<'UNINST'
#!/bin/bash
# Removes Gecko from a macOS system. Run as root.
set -e
if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo $0"; exit 1; fi

launchctl unload -w /Library/LaunchDaemons/com.gecko.server.plist 2>/dev/null || true
rm -f /Library/LaunchDaemons/com.gecko.server.plist
rm -rf /usr/local/gecko
rm -rf /Library/Logs/Gecko
# Note: we do NOT delete /Library/Application Support/Gecko — preserves
# user data. Delete that manually for a full wipe.
echo "Gecko uninstalled. Stack data preserved at /Library/Application Support/Gecko/"
UNINST
chmod +x "$PAYLOAD/usr/local/gecko/uninstall.sh"

# ── 4. Build the .pkg ─────────────────────────────────────────────
mkdir -p "$PROJECT_ROOT/dist"
OUTPUT_PKG="$PROJECT_ROOT/dist/Gecko-${VERSION}-${NODE_ARCH}.pkg"

log "Running pkgbuild..."
pkgbuild \
  --root "$PAYLOAD" \
  --identifier "com.gecko.server" \
  --version "$VERSION" \
  --scripts "$SCRIPTS" \
  --install-location "/" \
  "$BUILD_DIR/Gecko-component.pkg"

log "Running productbuild..."
productbuild \
  --package "$BUILD_DIR/Gecko-component.pkg" \
  --identifier "com.gecko.server" \
  --version "$VERSION" \
  "$OUTPUT_PKG"

SIZE_MB=$(du -h "$OUTPUT_PKG" | awk '{print $1}')
log "OK: $OUTPUT_PKG  ($SIZE_MB)"
