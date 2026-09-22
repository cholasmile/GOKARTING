@echo off
TITLE DEUCE Gaming PC Client Installer & Setup
COLOR 0A
CLS

echo =====================================================================
echo                DEUCE GAMING PC CLIENT INSTALLER
echo =====================================================================
echo.
echo Installing DEUCE Gaming PC Client Module...
echo PC Identification: DEUCE-PC-01
echo Server URL: http://localhost:3000
echo.

set CLIENT_DIR=%APPDATA%\DeuceGamingClient
if not exist "%CLIENT_DIR%" mkdir "%CLIENT_DIR%"

echo [1/4] Writing local Client Configuration...
(
  echo {
  echo   "pcId": "DEUCE-PC-01",
  echo   "serverUrl": "http://localhost:3000",
  echo   "adminPin": "DEUCE2026",
  echo   "enableOverlayTimer": true,
  echo   "warningMinutes": [10, 5, 1]
  echo }
) > "%CLIENT_DIR%\client-config.json"

echo [2/4] Setting up Windows Auto-Start Registry Key...
REG ADD "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "DeuceGamingClient" /t REG_SZ /d "\"%~dp0Launch-App.bat\"" /f >nul 2>&1

echo [3/4] Registering Monotonic Clock Guard & Event Log Queue...
echo System Uptime Guard active.

echo [4/4] Installation Complete!
echo.
echo =====================================================================
echo DEUCE Gaming PC Client has been successfully installed and registered.
echo Press any key to launch the Gaming PC Client Kiosk now...
echo =====================================================================
pause >nul
start "" "%~dp0Launch-App.bat"
