@echo off
setlocal
echo ================================================================
echo   Neptune Print Farm - Permanent Cloudflare Service Installer
echo ================================================================
echo.
echo This turns Cloudflare Tunnel into an official Windows Service.
echo Your farm will stay permanently live 24/7, even after PC reboot!
echo.
echo Requirements:
echo  1. Free Cloudflare account at cloudflare.com
echo  2. In Zero Trust -> Networks -> Tunnels, click 'Create a Tunnel'
echo  3. Copy the tunnel token provided by Cloudflare.
echo.
set /p TOKEN="Enter your Cloudflare Tunnel Token (or press Enter to cancel): "

if "%TOKEN%"=="" (
  echo Cancelled.
  pause
  exit /b 0
)

set "CLOUDFLARED=%~dp0..\tools\cloudflared.exe"

if not exist "%CLOUDFLARED%" (
  echo [ERROR] cloudflared.exe not found in tools folder.
  pause
  exit /b 1
)

echo.
echo Installing Cloudflare Tunnel as a Windows Service...
powershell -Command "Start-Process '%CLOUDFLARED%' -ArgumentList 'service install %TOKEN%' -Verb RunAs -Wait"

echo.
echo [DONE] Cloudflare Tunnel is now installed as a Windows Service!
echo It will now run 24/7 in the background automatically.
echo.
pause

