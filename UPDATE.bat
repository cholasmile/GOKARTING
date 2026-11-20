@echo off
title Deuce Adventure Park OS - One-Click Updater
color 0B
cls
cd /d "%~dp0"

echo =======================================================================
echo          DEUCE ADVENTURE PARK OS - ONE-CLICK UPDATER
echo =======================================================================
echo.
echo Checking for Git and fetching the latest updates from GitHub...
echo.

REM 1. Detect Git
set "GIT_EXE=git"
where git >nul 2>nul
if %errorlevel% equ 0 goto git_found

if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    goto git_found
)

if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
    set "GIT_EXE=C:\Program Files (x86)\Git\cmd\git.exe"
    goto git_found
)

if exist "%LOCALAPPDATA%\Programs\Git\cmd\git.exe" (
    set "GIT_EXE=%LOCALAPPDATA%\Programs\Git\cmd\git.exe"
    goto git_found
)

echo [!] Git is not installed or not found on this computer.
echo [*] Checking for Windows Package Manager winget to install Git...
where winget >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Please install Git from https://git-scm.com/download/win and run this updater again.
    pause
    exit /b 1
)

echo [*] Installing Git for Windows automatically via winget. Please wait...
winget install Git.Git --accept-package-agreements --accept-source-agreements --silent
if exist "C:\Program Files\Git\cmd\git.exe" (
    set "GIT_EXE=C:\Program Files\Git\cmd\git.exe"
    goto git_found
)

echo [ERROR] Git installation could not be completed automatically.
echo Please download and install Git from: https://git-scm.com/download/win
pause
exit /b 1

:git_found
echo [*] Using Git at: "%GIT_EXE%"
echo.

REM 2. Check Node
if exist "%~dp0.runtime\node.exe" (
    set "PATH=%~dp0.runtime;%PATH%"
)

echo [*] Pulling latest updates from GitHub repository...
"%GIT_EXE%" pull origin main
if %errorlevel% neq 0 (
    echo.
    echo [!] Git pull encountered an error. Please check your internet connection or git status.
    pause
    exit /b %errorlevel%
)

echo.
echo [*] Rebuilding production assets...
where npm >nul 2>nul
if %errorlevel% equ 0 (
    call npm run build
) else if exist "%~dp0.runtime\npm.cmd" (
    call "%~dp0.runtime\npm.cmd" run build
)

echo.
echo =======================================================================
echo          UPDATE COMPLETED SUCCESSFULLY!
echo =======================================================================
echo.
echo Your project is now up to date with the latest GitHub version.
echo You can launch the application with Launch-App.bat or your desktop shortcut.
echo.
pause
exit /b 0
