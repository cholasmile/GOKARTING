@echo off
title Deuce Adventure Park OS - Launcher
color 0A
cls
cd /d "%~dp0"

echo =======================================================================
echo              DEUCE ADVENTURE PARK - OS LAUNCHER
echo =======================================================================
echo.
echo [*] Initializing Deuce Adventure Park OS...

REM Support embedded / portable Node.js if present
if exist "%~dp0.runtime\node.exe" (
    set "PATH=%~dp0.runtime;%PATH%"
)

REM Check Node.js runtime
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js runtime not detected on this machine.
    echo [*] Please run INSTALL.bat first to set up the system automatically.
    echo.
    pause
    exit /b 1
)

REM Stop any hanging or previous instances on port 3000 or 5000
echo [*] Verifying network ports (3000, 5000)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM Ensure production assets are built
if not exist "dist\index.html" (
    echo [*] Compiling production build (first-time launch)...
    call npm run build
    if not exist "dist\index.html" (
        echo [!] Build failed. Please check dependencies with INSTALL.bat.
        pause
        exit /b 1
    )
)

REM Start unified backend & frontend server on port 3000
echo [*] Starting Deuce Park Unified Server on Port 3000...
set PORT=3000
start /b node api/index.js > app_server.log 2>&1

REM Wait for server to bind
timeout /t 2 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 3 >nul

REM Launch in dedicated App Window mode
echo [*] Launching application interface...
set BROWSER_LAUNCHED=0

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    set BROWSER_LAUNCHED=1
) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:3000
    set BROWSER_LAUNCHED=1
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
    set BROWSER_LAUNCHED=1
) else if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    start "" "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" --app=http://localhost:3000
    set BROWSER_LAUNCHED=1
)

if "%BROWSER_LAUNCHED%"=="0" (
    start http://localhost:3000
)

cls
echo =======================================================================
echo          DEUCE ADVENTURE PARK OS IS RUNNING SUCCESSFULLY!
echo =======================================================================
echo.
echo  - Status: ONLINE (Offline SQLite Sync Active)
echo  - Interface: http://localhost:3000
echo  - Server Port: 3000
echo  - Dedicated Window: ACTIVE
echo.
echo  To close the application, press any key or run Stop-App.bat.
echo =======================================================================
echo.

pause >nul

echo [*] Shutting down application...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo [*] Shutdown complete. Goodbye!
timeout /t 1 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 2 >nul
exit /b 0
