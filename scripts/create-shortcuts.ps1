param(
    [string]$AppDir = (Resolve-Path "$PSScriptRoot\..").Path
)

$ErrorActionPreference = 'Stop'

try {
    $WshShell = New-Object -ComObject WScript.Shell
    
    $DesktopDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::DesktopDirectory)
    if (-not $DesktopDir -or -not (Test-Path $DesktopDir)) {
        $DesktopDir = Join-Path $env:USERPROFILE 'Desktop'
    }
    
    $ProgramsDir = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Programs)
    if (-not $ProgramsDir -or -not (Test-Path $ProgramsDir)) {
        $ProgramsDir = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs'
    }
    $StartMenuDir = Join-Path $ProgramsDir 'Deuce Park'
    
    $LaunchBat = Join-Path $AppDir 'Launch-App.bat'
    $StopBat = Join-Path $AppDir 'Stop-App.bat'
    $IconPath = Join-Path $AppDir 'public\favicon.ico'

    if (-not (Test-Path $StartMenuDir)) {
        New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
    }

    # 1. Desktop Shortcut
    $DesktopShortcut = Join-Path $DesktopDir 'Deuce Adventure Park OS.lnk'
    $Shortcut = $WshShell.CreateShortcut($DesktopShortcut)
    $Shortcut.TargetPath = $LaunchBat
    $Shortcut.WorkingDirectory = $AppDir
    $Shortcut.Description = 'Deuce Adventure Park OS'
    if (Test-Path $IconPath) {
        $Shortcut.IconLocation = "$IconPath,0"
    }
    $Shortcut.Save()
    Write-Host "[OK] Desktop shortcut created: $DesktopShortcut"

    # 2. Start Menu App Shortcut
    $StartMenuApp = Join-Path $StartMenuDir 'Deuce Adventure Park OS.lnk'
    $ShortcutApp = $WshShell.CreateShortcut($StartMenuApp)
    $ShortcutApp.TargetPath = $LaunchBat
    $ShortcutApp.WorkingDirectory = $AppDir
    $ShortcutApp.Description = 'Deuce Adventure Park OS'
    if (Test-Path $IconPath) {
        $ShortcutApp.IconLocation = "$IconPath,0"
    }
    $ShortcutApp.Save()

    # 3. Start Menu Stop Shortcut
    $StartMenuStop = Join-Path $StartMenuDir 'Stop Deuce Park Service.lnk'
    $ShortcutStop = $WshShell.CreateShortcut($StartMenuStop)
    $ShortcutStop.TargetPath = $StopBat
    $ShortcutStop.WorkingDirectory = $AppDir
    $ShortcutStop.Description = 'Stop Deuce Park Background Server'
    $ShortcutStop.Save()

    Write-Host "[OK] Start Menu shortcuts created: $StartMenuDir"
    exit 0
} catch {
    Write-Error "Failed creating shortcut: $_"
    exit 1
}
