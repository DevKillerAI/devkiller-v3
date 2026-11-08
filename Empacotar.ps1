$ErrorActionPreference = 'Stop'
# Explicit allowlist: .secrets, .runtime, .env and arbitrary files can never enter exports.
$packageFiles = @('modules','compiler','runtime','ui','example','knowledge','tests','package.json','package-lock.json','playwright.config.mjs','server.mjs','Iniciar.cmd','Iniciar.ps1','Preparar.ps1','Empacotar.ps1','README.md','OPENAI.md','SEGREDOS.md','DIAGNOSTICO.md','CORRECAO.md','PROJETOS.md','STACK-REACT.md','VERIFICACAO.md','ENGINE.md','ORCHESTRATION.md','VALIDATION-0.11.md','KNOWLEDGE.md','VALIDATION-0.12.md','validation','.gitignore')
$sources = foreach ($entry in $packageFiles) { $full = Join-Path $PSScriptRoot $entry; if (Test-Path -LiteralPath $full) { $full } }
$destination = Join-Path (Split-Path -Parent $PSScriptRoot) 'DevKiller-Engine-v0.12.0.zip'
Compress-Archive -LiteralPath $sources -DestinationPath $destination -Force
Write-Host "Pacote criado: $destination"
