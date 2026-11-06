$farmDir = "C:\Users\User\Neptune-Print-Farm"
$nodePath = "C:\nvm4w\nodejs\node.exe"
$cfPath = "$farmDir\tools\cloudflared.exe"
$logFile = "$farmDir\data\cloudflared.log"

Set-Location $farmDir

# Check if node already running on 3080
$running = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
    Start-Process -FilePath $nodePath -ArgumentList "server/index.js" -WorkingDirectory $farmDir -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Check if cloudflared is running
$cfProc = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
if (-not $cfProc) {
    if (Test-Path $logFile) { Remove-Item $logFile -Force -ErrorAction SilentlyContinue }
    Start-Process -FilePath $cfPath -ArgumentList "tunnel --url http://localhost:3080 --logfile `"$logFile`"" -WorkingDirectory $farmDir -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

# Report status
$portOk = Get-NetTCPConnection -LocalPort 3080 -State Listen -ErrorAction SilentlyContinue
$cfOk = Get-Process -Name cloudflared -ErrorAction SilentlyContinue
Write-Host "Port 3080 Listening: $([bool]$portOk)"
Write-Host "Cloudflared Process: $([bool]$cfOk)"
