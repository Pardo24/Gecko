# Prepares the Windows installer bundle and runs NSIS to produce the .exe.
#
# Run from project root:  pwsh installer/windows/build-windows.ps1
#
# Requires:  NSIS 3.x          (winget install NSIS.NSIS)
#            internet access   (downloads portable Node + NSSM once, cached)
#
# Output:  dist/Gecko-Setup-<version>-x64.exe (~50 MB)

[CmdletBinding()]
param(
  [string]$NodeVersion = '20.18.0',         # LTS, change cautiously
  [string]$WinSwVersion = '2.12.0'          # stable from github.com/winsw/winsw
)

$ErrorActionPreference = 'Stop'

$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = Resolve-Path "$Here\..\.."
$Bundle = "$Here\bundle"

# Single source of truth for the version is package.json.
$Pkg = Get-Content "$Root\package.json" -Raw | ConvertFrom-Json
$Version = $Pkg.version

Write-Host "[build-windows] working in $Here (version $Version)" -ForegroundColor Cyan

# ── 1. Ensure UI bundles exist ────────────────────────────────────
if (-not (Test-Path "$Root\dist-server\server.js") -or -not (Test-Path "$Root\dist\index.html")) {
  Write-Host "[build-windows] UI bundles missing; running npm run build:headless..."
  Push-Location $Root
  try { npm run build:headless | Out-Null } finally { Pop-Location }
}

# ── 2. Download portable Node.js (cached) ─────────────────────────
$NodeDir = "$Bundle\node"
$NodeZip = "$Bundle\node-v$NodeVersion-win-x64.zip"
$NodeUrl = "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip"

if (-not (Test-Path "$NodeDir\node.exe")) {
  if (-not (Test-Path $NodeZip)) {
    Write-Host "[build-windows] downloading Node.js v$NodeVersion..."
    New-Item -ItemType Directory -Force -Path $Bundle | Out-Null
    Invoke-WebRequest -Uri $NodeUrl -OutFile $NodeZip
  }
  Write-Host "[build-windows] extracting Node..."
  Expand-Archive -Path $NodeZip -DestinationPath $Bundle -Force
  # Extracted to bundle/node-v<version>-win-x64/ ; flatten to bundle/node/
  $extractedDir = Get-ChildItem -Path $Bundle -Directory -Filter "node-v*-win-x64" | Select-Object -First 1
  if (Test-Path $NodeDir) { Remove-Item -Recurse -Force $NodeDir }
  Move-Item -Path $extractedDir.FullName -Destination $NodeDir
}

# Strip the bundled Node down to just what we need: node.exe + LICENSE.
# Saves ~50 MB of npm cache, headers, docs the service doesn't need.
Get-ChildItem -Path $NodeDir -Exclude 'node.exe','LICENSE','README.md' |
  Where-Object { $_.PSIsContainer } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# ── 3. Download WinSW (Windows Service Wrapper, GitHub-hosted) ────
# Replaces NSSM — nssm.cc has been unreliable, GitHub is not. WinSW v2
# is a stable single-binary service wrapper, MIT licensed.
$WinSwDir = "$Bundle\winsw"
$WinSwExe = "$WinSwDir\WinSW.exe"
$WinSwUrl = "https://github.com/winsw/winsw/releases/download/v$WinSwVersion/WinSW-x64.exe"

if (-not (Test-Path $WinSwExe)) {
  Write-Host "[build-windows] downloading WinSW v$WinSwVersion..."
  New-Item -ItemType Directory -Force -Path $WinSwDir | Out-Null
  Invoke-WebRequest -Uri $WinSwUrl -OutFile $WinSwExe
}

# ── 4. Run NSIS ───────────────────────────────────────────────────
# Locate makensis: PATH first, then standard NSIS install dirs.
# (Note: PS 5.1 compatible — no ?. operator.)
$MakensisCmd = Get-Command makensis -ErrorAction SilentlyContinue
$Makensis = if ($MakensisCmd) { $MakensisCmd.Source } else { $null }
if (-not $Makensis) {
  $Candidates = @(
    "${env:ProgramFiles(x86)}\NSIS\makensis.exe",
    "${env:ProgramFiles}\NSIS\makensis.exe"
  )
  $Makensis = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $Makensis) {
  throw "makensis not found. Install NSIS: winget install NSIS.NSIS"
}

Write-Host "[build-windows] compiling installer with $Makensis (v$Version)..."
& $Makensis "/DAPP_VERSION=$Version" "$Here\gecko.nsi"
if ($LASTEXITCODE -ne 0) { throw "NSIS exited $LASTEXITCODE" }

$OutFile = Get-ChildItem "$Root\dist\Gecko-Setup-*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
$SizeMb = [math]::Round($OutFile.Length / 1MB, 1)
Write-Host "[build-windows] OK: $($OutFile.FullName)  ($SizeMb MB)" -ForegroundColor Green
