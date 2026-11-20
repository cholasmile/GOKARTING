@echo off
title Deuce Adventure Park OS - Stop Application
color 0C
cls
echo =======================================================================
echo              DEUCE ADVENTURE PARK - STOP SERVICE
echo =======================================================================
echo.
echo [*] Terminating application background servers on ports 3000 and 5000...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [*] Application servers stopped cleanly.
echo.
echo =======================================================================
echo  SERVICE STOPPED
echo =======================================================================
timeout /t 2 /nobreak >nul 2>&1 || ping 127.0.0.1 -n 3 >nul
exit /b 0
