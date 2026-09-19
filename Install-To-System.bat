@echo off
title Deuce Adventure Park OS - System Installer
color 0B
cls
echo =======================================================================
echo            DEUCE ADVENTURE PARK - ONE-CLICK SYSTEM INSTALLER
echo =======================================================================
echo.
echo Installing Deuce Adventure Park OS directly onto this PC...
echo Target Directory: %LOCALAPPDATA%\DeucePark
echo.

set TARGET_DIR=%LOCALAPPDATA%\DeucePark
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

echo [*] Copying application files...
xcopy "%~dp0*" "%TARGET_DIR%\" /E /I /H /Y /Q >nul

echo [*] Building production assets...
cd /d "%TARGET_DIR%"

where node >nul 2>nul
if %errorlevel% equ 0 (
    call npm run build >nul 2>&1
)

echo [*] Creating Desktop Shortcut...
set VBS_SCRIPT=%TEMP%\create_deuce_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"
echo oLink.TargetPath = "%TARGET_DIR%\Launch-App.bat" >> "%VBS_SCRIPT%"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT%"
echo oLink.Description = "Launch Deuce Adventure Park OS" >> "%VBS_SCRIPT%"
echo oLink.IconLocation = "%TARGET_DIR%\public\favicon.ico" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"
cscript //nologo "%VBS_SCRIPT%"
del "%VBS_SCRIPT%" >nul 2>&1

echo [*] Creating Start Menu Shortcut...
set START_MENU_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Deuce Park
if not exist "%START_MENU_DIR%" mkdir "%START_MENU_DIR%"
set VBS_SCRIPT_START=%TEMP%\create_deuce_start_shortcut.vbs
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT_START%"
echo sLinkFile = "%START_MENU_DIR%\Deuce Adventure Park OS.lnk" >> "%VBS_SCRIPT_START%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT_START%"
echo oLink.TargetPath = "%TARGET_DIR%\Launch-App.bat" >> "%VBS_SCRIPT_START%"
echo oLink.WorkingDirectory = "%TARGET_DIR%" >> "%VBS_SCRIPT_START%"
echo oLink.Description = "Launch Deuce Adventure Park OS" >> "%VBS_SCRIPT_START%"
echo oLink.IconLocation = "%TARGET_DIR%\public\favicon.ico" >> "%VBS_SCRIPT_START%"
echo oLink.Save >> "%VBS_SCRIPT_START%"
cscript //nologo "%VBS_SCRIPT_START%"
del "%VBS_SCRIPT_START%" >nul 2>&1

echo.
echo =======================================================================
echo  SUCCESS! DEUCE ADVENTURE PARK HAS BEEN INSTALLED ON THIS PC!
echo  Desktop Shortcut: Created ("Deuce Adventure Park OS")
echo  Start Menu Link: Created
echo =======================================================================
echo.
echo Launching application now...
timeout /t 2 /nobreak >nul
start "" "%USERPROFILE%\Desktop\Deuce Adventure Park OS.lnk"
pause
