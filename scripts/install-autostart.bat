@echo off
setlocal
echo ===================================================
echo   Neptune Print Farm - Install Windows Auto-Start
echo ===================================================
echo.

set "SCRIPT_DIR=%~dp0"
set "TARGET_VBS=%SCRIPT_DIR%start-silent.vbs"
set "SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\NeptunePrintFarm.lnk"

echo Creating startup shortcut...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%TARGET_VBS%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%..'; $s.WindowStyle = 7; $s.Save();"

if exist "%SHORTCUT_PATH%" (
  echo.
  echo [SUCCESS] Neptune Print Farm will now automatically start in background when Windows boots up!
  echo Shortcut placed at: "%SHORTCUT_PATH%"
) else (
  echo.
  echo [ERROR] Could not create startup shortcut.
)

echo.
pause
