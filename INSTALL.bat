@echo off
title Deuce Adventure Park OS - One-Click Installer
color 0B
cls

echo =======================================================================
echo          DEUCE ADVENTURE PARK OS - ONE-CLICK INSTALLER WIZARD
echo =======================================================================
echo.
echo Welcome to the Deuce Adventure Park OS installer.
echo This wizard will configure all prerequisites, build assets, and create
echo desktop and start menu shortcuts for one-click access.
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
npm -v
echo.

echo =======================================================================
echo  STEP 2: PREPARING APPLICATION PACKAGES AND ASSETS
echo =======================================================================
echo.

cd /d "%~dp0"

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
echo [*] Building optimized production assets...
call npm run build
if not exist "dist\index.html" (
    echo [!] Build failed. Please verify dependencies.
    pause
    exit /b 1
)
echo [OK] Production build verified.
echo.

echo =======================================================================
echo  STEP 3: INSTALLATION DESTINATION
echo =======================================================================
echo.
echo Choose installation type:
echo   [1] Full System Install into AppData - Recommended dedicated directory
echo   [2] Portable or In-Place Install - Run directly from current folder or USB
echo.
set /p INSTALL_CHOICE="Enter selection [1 or 2, default is 1]: "
if "%INSTALL_CHOICE%"=="" set INSTALL_CHOICE=1

if "%INSTALL_CHOICE%"=="2" goto setup_portable

:setup_system
set TARGET_DIR=%LOCALAPPDATA%\DeucePark
echo [*] Target installation directory: %TARGET_DIR%
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [*] Copying application files to system folder...
robocopy "%~dp0." "%TARGET_DIR%" /E /XD .git dist_electron /XF *.log /R:1 /W:1 >nul
if %errorlevel% geq 8 (
    xcopy "%~dp0*" "%TARGET_DIR%\" /E /I /H /Y /Q >nul
)
echo [OK] Files installed to system directory.
goto create_shortcuts

:setup_portable
set TARGET_DIR=%~dp0
if "%TARGET_DIR:~-1%"=="\" set TARGET_DIR=%TARGET_DIR:~0,-1%
echo [*] Using portable location: %TARGET_DIR%

:create_shortcuts
echo.
echo =======================================================================
echo  STEP 4: CREATING SHORTCUTS
echo =======================================================================
echo.

set ICON_PATH=%TARGET_DIR%\public\favicon.ico

echo [*] Creating Desktop Shortcut...
set VBS_SCRIPT=%TEMP%\create_deuce_desktop.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_DIR%\Launch-App.bat" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "Launch Deuce Adventure Park OS" >> "%VBS_SCRIPT%"
if exist "%ICON_PATH%" echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul 2>&1
echo [OK] Desktop shortcut created.

echo [*] Creating Start Menu Shortcuts...
set START_MENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Deuce Park
if not exist "%START_MENU_DIR%" mkdir "%START_MENU_DIR%"

set VBS_SCRIPT_START=%TEMP%\create_deuce_start.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT_START%"
echo sLinkFile = "%START_MENU_DIR%\Deuce Adventure Park OS.lnk" >> "%VBS_SCRIPT_START%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT_START%"
echo oLink.TargetPath = "%TARGET_DIR%\Launch-App.bat" >> "%VBS_SCRIPT_START%"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT_START%"
echo oLink.Description = "Launch Deuce Adventure Park OS" >> "%VBS_SCRIPT_START%"
if exist "%ICON_PATH%" echo oLink.IconLocation = "%ICON_PATH%" >> "%VBS_SCRIPT_START%"
echo oLink.Save >> "%VBS_SCRIPT_START%"

echo sLinkStop = "%START_MENU_DIR%\Stop Deuce Park Service.lnk" >> "%VBS_SCRIPT_START%"
echo Set oLinkStop = oWS.CreateShortcut(sLinkStop) >> "%VBS_SCRIPT_START%"
echo oLinkStop.TargetPath = "%TARGET_DIR%\Stop-App.bat" >> "%VBS_SCRIPT_START%"
echo oLinkStop.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT_START%"
echo oLinkStop.Description = "Stop Deuce Adventure Park Background Server" >> "%VBS_SCRIPT_START%"
echo oLinkStop.Save >> "%VBS_SCRIPT_START%"

echo sLinkUninstall = "%START_MENU_DIR%\Uninstall Deuce Park.lnk" >> "%VBS_SCRIPT_START%"
echo Set oLinkUninstall = oWS.CreateShortcut(sLinkUninstall) >> "%VBS_SCRIPT_START%"
echo oLinkUninstall.TargetPath = "%TARGET_DIR%\Uninstall.bat" >> "%VBS_SCRIPT_START%"
echo oLinkUninstall.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT_START%"
echo oLinkUninstall.Description = "Uninstall Deuce Adventure Park OS" >> "%VBS_SCRIPT_START%"
echo oLinkUninstall.Save >> "%VBS_SCRIPT_START%"

cscript //nologo "%VBS_SCRIPT_START%"
del "%VBS_SCRIPT_START%" >nul 2>&1
echo [OK] Start Menu shortcuts created.
echo.

echo =======================================================================
echo  INSTALLATION COMPLETED SUCCESSFULLY!
echo =======================================================================
echo.
echo  * Desktop Icon: Deuce Adventure Park OS
echo  * Start Menu: Programs to Deuce Park
echo  * App URL: http://localhost:3000
echo  * Dedicated Window Mode: Enabled Edge and Chrome app mode
echo.

set /p LAUNCH_NOW="Launch Deuce Adventure Park OS now? (Y/N) [Default: Y]: "
if "%LAUNCH_NOW%"=="" set LAUNCH_NOW=Y
if /i "%LAUNCH_NOW%"=="Y" (
    echo [*] Starting Deuce Adventure Park OS...
    start "" "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk"
)

echo.
echo Press any key to exit installer.
pause >nul
exit /b 0
