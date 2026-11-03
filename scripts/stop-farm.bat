@echo off
setlocal
echo ===================================================
echo   Stopping Neptune Print Farm Background Services
echo ===================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Get-Process -Name node, cloudflared -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*Neptune-Print-Farm*' -or $_.CommandLine -like '*3080*' } | Stop-Process -Force -ErrorAction SilentlyContinue;"

echo Stopped background services.
echo.
pause

