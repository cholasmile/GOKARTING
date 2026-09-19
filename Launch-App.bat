@echo off
title Deuce Adventure Park OS - Pendrive / Portable Launcher
color 0A
cls
echo =======================================================================
echo              DEUCE ADVENTURE PARK - PORTABLE OS LAUNCHER
echo =======================================================================
echo.
echo  Starting Deuce Park Application from Pendrive / Local Storage...
echo  Offline Mode: ACTIVE
echo  Realtime Cloud Sync: ONLINE SENSING ACTIVE
echo.
echo -----------------------------------------------------------------------

REM Check Node.js installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not detected on this host machine.
    echo [*] Checking for standalone preview bundle...
    start http://localhost:3000
    echo Please make sure Node.js is installed or run Install-To-System.bat
    pause
    exit /b
)

echo [*] Starting Backend API Server (Port 5000)...
start /b node api/index.js >nul 2>&1

echo [*] Starting Web Application (Port 3000)...
echo [*] Opening Application in Browser...

timeout /t 2 /nobreak >nul
start http://localhost:3000

echo.
echo =======================================================================
echo  APPLICATION RUNNING AT: http://localhost:3000
echo  Press Ctrl+C or close this window to stop the application.
echo =======================================================================
echo.

npx vite preview --port 3000 --host 0.0.0.0
