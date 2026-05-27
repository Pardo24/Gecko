# Gecko macOS installer

Produces `Gecko-<version>-<arch>.pkg` (~30 MB) that installs Gecko as a
launchd daemon. Same approach as Windows: one Node.js server + React
bundle, registered as a system service, exposes UI at localhost:3000.

## Build (must run on macOS)

```bash
# Apple Silicon
./build-macos.sh

# Intel
ARCH=x86_64 ./build-macos.sh
```

Output: `dist/Gecko-1.3.0-arm64.pkg` (or x86_64).

## What it installs

- `/usr/local/gecko/`              — node + server.js + renderer + stack
- `/Library/LaunchDaemons/com.gecko.server.plist` — system daemon definition
- `/Library/Application Support/Gecko/stack/` — user's compose dir + .env
- `/Library/Logs/Gecko/server.log` — service stdout/stderr (rotated by macOS)

The post-install script loads the daemon (so the service starts
immediately, no reboot needed) and opens the user's default browser to
`http://localhost:3000`.

## Uninstall

The macOS Installer.app doesn't ship a built-in uninstaller, so we drop a
script at `/usr/local/gecko/uninstall.sh`. Users run:

```bash
sudo /usr/local/gecko/uninstall.sh
```

It stops the daemon, deletes the install location, but preserves
`/Library/Application Support/Gecko/` (so a re-install resumes from the
same stack).

## Code signing + notarization (later)

This script produces an UNSIGNED .pkg. macOS Gatekeeper will warn
"unidentified developer" on first run (user can right-click → Open as
workaround).

To ship without that warning we need:
- Apple Developer Program: $99/year
- Developer ID Installer certificate
- `productsign --sign "Developer ID Installer: ..."` step
- `xcrun notarytool submit ... --wait` for notarization

Deferred until we have revenue to justify the $99/year. The Windows
SmartScreen story is solved by SignPath (free for OSS); macOS has no
equivalent free programme.

## Why root-level install (not user-level)

The Docker daemon Gecko orchestrates is system-wide on macOS (Docker
Desktop runs as the user, but the daemon is a system service). Running
Gecko as launchd ensures it's always available and survives user
sessions. Trade-off: requires sudo at install.
