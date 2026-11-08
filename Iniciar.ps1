$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Host 'Instale o Node.js 24 ou superior para iniciar.'; Read-Host 'Pressione Enter para sair'; exit 1 }
try {
  $running = Invoke-RestMethod -Uri 'http://127.0.0.1:4310/api/state' -TimeoutSec 2
  if ($running.limits.memory -eq '128 MB') { Start-Process 'http://127.0.0.1:4310/#under-the-hood'; exit 0 }
} catch {}
$runtimeDir = Join-Path $PSScriptRoot '.runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$serverFile = Join-Path $PSScriptRoot 'server.mjs'
$process = Start-Process -FilePath (Get-Command node).Source -ArgumentList ('"{0}"' -f $serverFile) -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'launcher.log') -RedirectStandardError (Join-Path $runtimeDir 'launcher-error.log') -PassThru
for ($attempt = 0; $attempt -lt 30; $attempt++) {
  try {
    $state = Invoke-RestMethod -Uri 'http://127.0.0.1:4310/api/state' -TimeoutSec 2
    if ($state.token) { Start-Process 'http://127.0.0.1:4310/#under-the-hood'; exit 0 }
  } catch {}
  if ($process.HasExited) { break }
  Start-Sleep -Milliseconds 500
}
Write-Host 'O painel nao iniciou. Confira se as portas 4310 e 4311 estao livres.'
Get-Content -LiteralPath (Join-Path $runtimeDir 'launcher-error.log') -ErrorAction SilentlyContinue
Read-Host 'Pressione Enter para sair'
