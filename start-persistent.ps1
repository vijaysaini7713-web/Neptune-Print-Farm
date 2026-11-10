$farmDir = "C:\Users\User\Neptune-Print-Farm"
$nodePath = "C:\nvm4w\nodejs\node.exe"
$cfPath = "$farmDir\tools\cloudflared.exe"

Set-Location $farmDir

# Check if node already running on 3080
$running = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath $nodePath -ArgumentList "server/index.js" -WorkingDirectory $farmDir -WindowStyle Hidden -RedirectStandardOutput "$farmDir\data\server.log" -RedirectStandardError "$farmDir\data\server-err.log"
    Start-Sleep -Seconds 2
}

# Check if cloudflared is running
$cfProc = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if (-not $cfProc) {
    Start-Process -FilePath $cfPath -ArgumentList "tunnel run neptune-farm" -WorkingDirectory $farmDir -WindowStyle Hidden -RedirectStandardOutput "$farmDir\data\cloudflared.log" -RedirectStandardError "$farmDir\data\cloudflared-err.log"
    Start-Sleep -Seconds 3
}

# Report status
$portOk = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
$cfOk = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
Write-Host "Port 3080 Listening: $([bool]$portOk)"
Write-Host "Cloudflared Process: $([bool]$cfOk)"
