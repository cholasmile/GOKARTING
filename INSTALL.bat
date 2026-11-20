@echo off
title Deuce Adventure Park OS - One-Click Installer
color 0B
cls
cd /d "%~dp0"

echo =======================================================================
echo          DEUCE ADVENTURE PARK OS - ONE-CLICK INSTALLER WIZARD
echo =======================================================================
echo.
echo Welcome to the Deuce Adventure Park OS installer.
echo This wizard will configure all prerequisites, compile production assets,
echo and create desktop and start menu shortcuts for one-click access.
echo.
echo =======================================================================
echo  STEP 1: CHECKING SYSTEM REQUIREMENTS
echo =======================================================================
echo.

REM 1. Check for Node.js (System or Embedded Portable)
if exist "%~dp0.runtime\node.exe" (
    set "PATH=%~dp0.runtime;%PATH%"
    goto node_ok
)

where node >nul 2>nul
if %errorlevel% equ 0 goto node_ok

echo [!] Node.js runtime was not found on this system.
echo [*] Checking for Windows Package Manager winget...
where winget >nul 2>nul
if %errorlevel% neq 0 goto try_portable_download

echo [*] Installing Node.js LTS automatically via winget. Please wait...
winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent

REM Refresh PATH in current session
for /f "tokens=2*" %%a in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYS_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USER_PATH=%%b"
set "PATH=%SYS_PATH%;%USER_PATH%;%PATH%"

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [*] Node.js LTS installed successfully!
    goto node_ok
)

:try_portable_download
echo [*] Attempting to download portable Node.js runtime (no admin rights needed)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path '%~dp0.runtime' | Out-Null; Write-Host '[*] Fetching portable Node.js v22 LTS...'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v22.14.0/node-v22.14.0-win-x64.zip' -OutFile '%~dp0.runtime\node.zip'; Expand-Archive -Path '%~dp0.runtime\node.zip' -DestinationPath '%~dp0.runtime\tmp' -Force; Move-Item -Path '%~dp0.runtime\tmp\node-v22.14.0-win-x64\*' -Destination '%~dp0.runtime' -Force; Remove-Item -Recurse -Force '%~dp0.runtime\tmp', '%~dp0.runtime\node.zip' -ErrorAction SilentlyContinue"

if exist "%~dp0.runtime\node.exe" (
    set "PATH=%~dp0.runtime;%PATH%"
    echo [*] Portable Node.js engine installed successfully into .runtime folder!
    goto node_ok
)

:winget_missing
echo [!] Node.js must be installed to run the application.
echo [*] Opening official Node.js download page...
start https://nodejs.org/en/download
echo Please complete the Node.js installation, then re-run this script.
echo.
pause
exit /b 1

:node_ok
echo [OK] Node.js detected:
node -v
echo [OK] NPM detected:
call npm -v
echo.

echo =======================================================================
echo  STEP 2: PREPARING APPLICATION PACKAGES AND ASSETS
echo =======================================================================
echo.

if exist "node_modules" goto modules_ok
echo [*] Installing npm dependencies, please wait...
call npm install
if %errorlevel% neq 0 (
    echo [!] Failed to install dependencies. Please check internet connection.
    pause
    exit /b 1
)

:modules_ok
echo [OK] Dependencies verified.

if exist "dist\index.html" (
    echo [OK] Production assets already compiled.
    goto step3_shortcuts
)

echo [*] Building optimized production assets...
call npm run build
if not exist "dist\index.html" (
    echo [!] Build failed. Please verify dependencies.
    pause
    exit /b 1
)
echo [OK] Production build verified.

:step3_shortcuts
echo.
echo =======================================================================
echo  STEP 3: CONFIGURING DESKTOP AND START MENU SHORTCUTS
echo =======================================================================
echo.

echo [*] Creating Desktop and Start Menu Shortcuts...
powershell -NoProfile -ExecutionPolicy Bypass -File "%CD%\scripts\create-shortcuts.ps1" -AppDir "%CD%"
if %errorlevel% neq 0 (
    echo [!] Warning: PowerShell shortcut creation encountered an issue. Creating fallback...
    powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Deuce Adventure Park OS.lnk')); $s.TargetPath = '%~dp0Launch-App.bat'; $s.WorkingDirectory = '%~dp0'; $s.Save()"
)

echo.
echo =======================================================================
echo  INSTALLATION COMPLETED SUCCESSFULLY!
echo =======================================================================
echo.
echo  * Desktop Icon: "Deuce Adventure Park OS" (Check your Desktop)
echo  * Start Menu: Programs to Deuce Park
echo  * Interface: http://localhost:3000
echo  * Dedicated App Window: Ready
echo.

set /p LAUNCH_NOW="Launch Deuce Adventure Park OS now? (Y/N) [Default: Y]: "
if "%LAUNCH_NOW%"=="" set LAUNCH_NOW=Y
if /i "%LAUNCH_NOW%"=="Y" (
    echo [*] Starting Deuce Adventure Park OS...
    start "" "%~dp0Launch-App.bat"
)

echo.
echo Press any key to exit installer.
pause >nul
exit /b 0
