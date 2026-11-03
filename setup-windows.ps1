$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
Write-Host 'Neptune Print Farm - Windows Setup' -ForegroundColor Cyan
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Install Node.js from nodejs.org first.'; exit 1 }
if (-not (Test-Path '.env')) {
  $password = Read-Host 'Set an admin password (minimum 12 characters)'
  if ($password.Length -lt 12) { Write-Host 'Password is too short'; exit 1 }
  $bytes = New-Object byte[] 48
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $secret = [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_')
  $envText = "PORT=3080`nADMIN_PASSWORD=$password`nJWT_SECRET=$secret`nCOOKIE_SECURE=false`nPOLL_MS=5000`n"
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot '.env'), $envText)
  Write-Host 'Local .env created. Never upload it to GitHub.'
}
npm install
if ($LASTEXITCODE -ne 0) { Write-Host 'npm install failed'; exit $LASTEXITCODE }
Write-Host 'Open http://localhost:5173 after Vite starts' -ForegroundColor Green
npm run dev
