@echo off
cd /d "C:\Users\User\Neptune-Print-Farm"

taskkill /F /IM cloudflared.exe >nul 2>&1

echo Starting Neptune Print Farm server on port 3080...
start "" /B "C:\nvm4w\nodejs\node.exe" server/index.js > data\server.log 2>&1

ping -n 3 127.0.0.1 >nul

echo Starting Cloudflare tunnel for neptunemonitor.com...
start "" /B "C:\Users\User\Neptune-Print-Farm\tools\cloudflared.exe" tunnel run neptune-farm > data\cloudflared.log 2>&1

ping -n 5 127.0.0.1 >nul
echo Neptune Farm is running permanently on https://neptunemonitor.com
