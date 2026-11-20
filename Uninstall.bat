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
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [*] Removing Desktop Shortcut...
if exist "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk" (
    del "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk" >nul 2>&1
)

echo [*] Removing Start Menu Shortcuts...
set START_MENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Deuce Park
if exist "%START_MENU_DIR%" (
    rmdir /s /q "%START_MENU_DIR%" >nul 2>&1
)

set TARGET_DIR=%LOCALAPPDATA%\DeucePark
if exist "%TARGET_DIR%" (
    echo [*] Removing installed application directory (%TARGET_DIR%)...
    REM If script is running inside TARGET_DIR, self-remove via temp batch
    if /i "%~dp0"=="%TARGET_DIR%\" (
        set CLEANUP_BAT=%TEMP%\deuce_cleanup.bat
        echo @echo off > "%CLEANUP_BAT%"
        echo timeout /t 2 /nobreak >nul >> "%CLEANUP_BAT%"
        echo rmdir /s /q "%TARGET_DIR%" >> "%CLEANUP_BAT%"
        echo del "%%~f0" >> "%CLEANUP_BAT%"
        start "" /b "%CLEANUP_BAT%"
    ) else (
        rmdir /s /q "%TARGET_DIR%" >nul 2>&1
    )
)

echo.
echo =======================================================================
echo  SUCCESS: Deuce Adventure Park OS has been uninstalled from your PC.
echo =======================================================================
echo.
pause
exit /b 0
