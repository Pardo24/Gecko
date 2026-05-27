; Gecko Windows installer (NSIS script)
;
; Builds a ~50 MB .exe that installs Gecko as a Windows service. The
; service runs our headless Node server (the same one Gecko OS kiosk uses).
; The Start Menu shortcut opens the user's default browser to localhost:3000.
;
; Replaces the Electron .exe (which was ~150 MB and bundled Chromium).
;
; Build:  makensis gecko.nsi   (requires NSIS 3.x — `winget install NSIS.NSIS`)
;         Bundled binaries must be present beforehand — run build-windows.ps1
;         which downloads portable Node + NSSM into ./bundle/.

;--------------------------------
; Configuration
;--------------------------------

!define APP_NAME       "Gecko"
!define APP_PUBLISHER  "Pardo24"
!define APP_URL        "https://github.com/Pardo24/Gecko"
!define APP_VERSION    "1.3.0"
!define SERVICE_NAME   "GeckoServer"
!define INSTALL_ROOT   "$PROGRAMFILES64\Gecko"
!define DATA_ROOT      "$APPDATA\gecko"

;--------------------------------
; Includes
;--------------------------------

!include "MUI2.nsh"
!include "LogicLib.nsh"

;--------------------------------
; General
;--------------------------------

Name "${APP_NAME}"
OutFile "..\..\dist\Gecko-Setup-${APP_VERSION}-x64.exe"
InstallDir "${INSTALL_ROOT}"
InstallDirRegKey HKLM "Software\${APP_NAME}" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey "ProductName" "${APP_NAME}"
VIAddVersionKey "FileDescription" "Gecko home media server installer"
VIAddVersionKey "CompanyName" "${APP_PUBLISHER}"
VIAddVersionKey "FileVersion" "${APP_VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License"

;--------------------------------
; UI
;--------------------------------

!define MUI_ABORTWARNING

!insertmacro MUI_PAGE_WELCOME
; TODO: add MUI_PAGE_LICENSE when we ship a top-level LICENSE file
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN_TEXT "Open Gecko in your browser"
!define MUI_FINISHPAGE_RUN ""
!define MUI_FINISHPAGE_RUN_FUNCTION "OpenBrowser"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Spanish"
!insertmacro MUI_LANGUAGE "Catalan"

;--------------------------------
; Install section
;--------------------------------

Section "Gecko (required)" SecCore
  SectionIn RO   ; required, can't deselect

  ; ── Portable Node.js runtime + WinSW service wrapper ──────────────
  ; Both come from bundle/ (prepared by build-windows.ps1).
  SetOutPath "$INSTDIR"
  File /r "bundle\node\*"
  ; Rename WinSW.exe → GeckoServer.exe; WinSW looks for a sibling XML with
  ; the same basename, so we ship GeckoServer.xml below.
  File "/oname=GeckoServer.exe" "bundle\winsw\WinSW.exe"

  ; ── Gecko server entry point ───────────────────────────────────────
  File "..\..\dist-server\server.js"

  ; ── React bundle → INSTDIR\renderer\ ───────────────────────────────
  SetOutPath "$INSTDIR\renderer"
  File /r "..\..\dist\*"

  ; ── Docker stack files → INSTDIR\stack\ ────────────────────────────
  SetOutPath "$INSTDIR\stack"
  File /r "..\..\stack\*"

  SetOutPath "$INSTDIR"

  ; ── WinSW service config (XML, sibling of GeckoServer.exe) ─────────
  ; WinSW reads this on `install`/`start` and uses it as the service spec.
  FileOpen $0 "$INSTDIR\GeckoServer.xml" w
  FileWrite $0 '<service>$\r$\n'
  FileWrite $0 '  <id>${SERVICE_NAME}</id>$\r$\n'
  FileWrite $0 '  <name>Gecko Server</name>$\r$\n'
  FileWrite $0 '  <description>Gecko home media server (Express + React)</description>$\r$\n'
  FileWrite $0 '  <executable>%BASE%\node.exe</executable>$\r$\n'
  FileWrite $0 '  <arguments>%BASE%\server.js</arguments>$\r$\n'
  FileWrite $0 '  <workingdirectory>%BASE%</workingdirectory>$\r$\n'
  FileWrite $0 '  <env name="STATIC_DIR" value="%BASE%\renderer"/>$\r$\n'
  FileWrite $0 '  <env name="STACK_BASE" value="%BASE%\stack"/>$\r$\n'
  FileWrite $0 '  <env name="COMPOSE_DIR" value="${DATA_ROOT}\stack"/>$\r$\n'
  FileWrite $0 '  <env name="GECKO_VERSION" value="${APP_VERSION}"/>$\r$\n'
  FileWrite $0 '  <log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>4</keepFiles></log>$\r$\n'
  FileWrite $0 '  <logpath>${DATA_ROOT}\logs</logpath>$\r$\n'
  FileWrite $0 '  <onfailure action="restart" delay="5 sec"/>$\r$\n'
  FileWrite $0 '  <startmode>Automatic</startmode>$\r$\n'
  FileWrite $0 '</service>$\r$\n'
  FileClose $0

  ; Create data dirs up front so the service can write logs immediately
  CreateDirectory "${DATA_ROOT}"
  CreateDirectory "${DATA_ROOT}\logs"

  ; ── Register + start the Windows service ───────────────────────────
  DetailPrint "Registering Gecko Windows service..."
  ExecWait '"$INSTDIR\GeckoServer.exe" install' $0
  ${If} $0 != 0
    MessageBox MB_OK|MB_ICONSTOP "Failed to register service (WinSW exit $0). Make sure the installer is running as administrator."
    Abort
  ${EndIf}

  DetailPrint "Starting Gecko service..."
  ExecWait '"$INSTDIR\GeckoServer.exe" start'

  ; ── Start Menu + uninstaller ───────────────────────────────────────
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Open Gecko.lnk" "$WINDIR\explorer.exe" "http://localhost:3000" "$INSTDIR\gecko.ico"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall Gecko.lnk" "$INSTDIR\Uninstall.exe"

  ; Register in Add/Remove Programs
  WriteRegStr HKLM "Software\${APP_NAME}" "InstallDir" "$INSTDIR"
  WriteRegStr HKLM "Software\${APP_NAME}" "Version" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "URLInfoAbout" "${APP_URL}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1

  WriteUninstaller "$INSTDIR\Uninstall.exe"
SectionEnd

;--------------------------------
; Functions
;--------------------------------

Function OpenBrowser
  ExecShell "open" "http://localhost:3000"
FunctionEnd

;--------------------------------
; Uninstaller
;--------------------------------

Section "Uninstall"
  ; Stop + remove the service
  ExecWait '"$INSTDIR\GeckoServer.exe" stop'
  ExecWait '"$INSTDIR\GeckoServer.exe" uninstall'

  ; Files
  RMDir /r "$INSTDIR"
  RMDir /r "$SMPROGRAMS\${APP_NAME}"

  ; Registry
  DeleteRegKey HKLM "Software\${APP_NAME}"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"

  ; Note: we do NOT delete ${DATA_ROOT} — the user may want to keep their
  ; configured stack data. Document the cleanup separately for users who
  ; want a full wipe.
SectionEnd
