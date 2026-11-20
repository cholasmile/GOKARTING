@echo off
title Deuce Adventure Park OS - Uninstaller
color 0C
cls
echo =======================================================================
echo          DEUCE ADVENTURE PARK OS - UNINSTALLATION WIZARD
echo =======================================================================
echo.
echo This wizard will remove Deuce Adventure Park OS shortcuts and files.
echo.
set /p CONFIRM="Are you sure you want to uninstall Deuce Adventure Park OS? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo.
    echo Uninstallation cancelled.
    pause
    exit /b 0
)

echo.
echo [*] Stopping running background processes...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-servers.ps1" >nul 2>&1

echo [*] Removing Desktop Shortcut...
powershell -NoProfile -Command "$desk = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::DesktopDirectory); if ($desk) { Remove-Item (Join-Path $desk 'Deuce Adventure Park OS.lnk') -Force -ErrorAction SilentlyContinue }; Remove-Item \"$env:USERPROFILE\Desktop\Deuce Adventure Park OS.lnk\" -Force -ErrorAction SilentlyContinue" >nul 2>&1

echo [*] Removing Start Menu Shortcuts...
powershell -NoProfile -Command "$prog = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs); if ($prog) { Remove-Item (Join-Path $prog 'Deuce Park') -Recurse -Force -ErrorAction SilentlyContinue }" >nul 2>&1

echo.
echo =======================================================================
echo  SUCCESS: Deuce Adventure Park OS shortcuts have been removed.
echo =======================================================================
echo.
pause
exit /b 0
