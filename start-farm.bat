@echo off
cd /d "C:\Users\User\Neptune-Print-Farm"

echo Checking and starting Neptune Farm server...
netstat -ano | findstr :3080 | findstr LISTENING >nul
if errorlevel 1 (
    start "Neptune Server" /min cmd /c "node server/index.js > data\server.log 2>&1"
)

ping -n 3 127.0.0.1 >nul

echo Checking and starting Cloudflare tunnel (neptunemonitor.com)...
tasklist /FI "IMAGENAME eq cloudflared.exe" | findstr cloudflared.exe >nul
if errorlevel 1 (
    start "Neptune Tunnel" /min cmd /c "tools\cloudflared.exe tunnel run neptune-farm > data\cloudflared.log 2>&1"
)

ping -n 3 127.0.0.1 >nul
echo Neptune Farm is running:
echo   Local LAN  : http://172.16.20.139:3080
echo   Public Web : https://neptunemonitor.com
