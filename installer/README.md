# Gecko installers

Native installers for the Gecko desktop app. The "app" is the same
Express + React headless server that Gecko OS ships — these installers
wrap it as a platform-native service.

## Why we ditched Electron

See `gecko-os/docs/DESKTOP_STACK_DECISION.md`. Short version: one codebase
shared with Gecko OS, ~6× smaller installer (~25 MB vs Electron's 150 MB),
no Chromium CVE chase.

## Layout

```
installer/
├── windows/                  # Windows .exe via NSIS
│   ├── gecko.nsi             # NSIS script
│   ├── build-windows.ps1     # build wrapper (downloads Node + WinSW)
│   └── bundle/               # downloaded artefacts (gitignored)
│       ├── node/             # portable Node.js x64
│       └── winsw/            # WinSW.exe service wrapper
└── macos/                    # macOS .pkg (TODO Phase 0.3)
```

## Building the Windows installer

Requirements:
- Windows host (NSIS 3.x — `winget install NSIS.NSIS`)
- PowerShell 5.1+
- Internet access (first run only — Node + WinSW download to `bundle/`,
  reused on subsequent builds)

```powershell
# From project root
npm install                                       # if not done
npm run build:headless                            # builds UI + server bundles
pwsh installer/windows/build-windows.ps1          # produces dist/Gecko-Setup-X.Y.Z-x64.exe
```

Output: `dist/Gecko-Setup-<version>-x64.exe` (~25 MB).

## What the Windows installer does

1. Copies portable Node.js + WinSW + Gecko bundles to `C:\Program
   Files\Gecko\`
2. Writes `GeckoServer.xml` (WinSW service config) with environment vars
   for static dir, stack dir, compose dir
3. Registers and starts the **Gecko Server** Windows service via
   `GeckoServer.exe install` (WinSW handles `sc create` under the hood)
4. Creates Start Menu shortcut → opens default browser to
   `http://localhost:3000`
5. Adds entry to Add/Remove Programs

## Service runtime locations

- App: `C:\Program Files\Gecko\`
- User data (compose dir, .env): `%APPDATA%\gecko\stack\` (= `C:\Users\<user>\AppData\Roaming\gecko\stack\`)
- Service logs (auto-rolled): `%APPDATA%\gecko\logs\`

## Uninstalling

Two paths:
- Start Menu → "Gecko" → "Uninstall Gecko" — runs the standard uninstaller
- Settings → Apps → Gecko → Uninstall

Both stop the service, remove it from SCM, and delete the install dir.
User data in `%APPDATA%\gecko\` is **preserved** (so re-installing doesn't
wipe the user's configured stack). Document `Remove-Item -Recurse
$env:APPDATA\gecko` for users who want a full wipe.

## Testing

Production validation runs in a clean Windows 10/11 VM:

1. Spin up clean VM (VirtualBox / Hyper-V)
2. Install Docker Desktop (Gecko depends on it)
3. Copy `Gecko-Setup-*.exe` over
4. Run installer — accept admin prompt
5. Verify:
   - Service "GeckoServer" exists and is running (`Get-Service GeckoServer`)
   - `http://localhost:3000` opens to the wizard
   - Wizard completes an install end-to-end
   - Uninstaller cleans up

For dev iteration on the build host (not full validation):

```powershell
# Build only
pwsh installer/windows/build-windows.ps1

# Inspect output without installing
Get-Item dist/Gecko-Setup-*.exe
# Or run silent install to a temp dir (don't use prod path):
.\dist\Gecko-Setup-1.3.0-x64.exe /D=C:\temp\gecko-test /S
```
