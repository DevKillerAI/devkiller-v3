$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'Instalando o verificador local de aplicativos.'
npm.cmd ci
if ($LASTEXITCODE -ne 0) { Write-Host 'Nao foi possivel instalar as dependencias.'; exit 1 }
npx.cmd playwright install chromium
if ($LASTEXITCODE -ne 0) { Write-Host 'Nao foi possivel instalar o navegador de verificacao.'; exit 1 }
Write-Host 'Preparando a imagem do executor. O Docker Desktop deve estar aberto.'
docker pull node:24-alpine
if ($LASTEXITCODE -ne 0) { Write-Host 'Não foi possível preparar. Confira o Docker e sua conexão.'; exit 1 }
Write-Host 'Preparando o compilador React com dependencias fixas.'
docker build --build-arg PROFILE=legacy --tag devkiller-react:1 compiler
if ($LASTEXITCODE -ne 0) { exit 1 }
docker build --tag devkiller-react:2 compiler
if ($LASTEXITCODE -ne 0) { Write-Host 'O compilador React nao ficou pronto. O modo HTML continua disponivel.'; exit 1 }
docker build --build-arg PROFILE=studio --tag devkiller-react:3 compiler
if ($LASTEXITCODE -ne 0) { Write-Host 'React Studio nao ficou pronto.'; exit 1 }

docker build --build-arg PROFILE=pro-v4 --tag devkiller-react:4 compiler
if ($LASTEXITCODE -ne 0) { throw 'React Pro compiler setup failed' }



foreach ($profile in @(@('pro','devkiller-react:5'),@('vue','devkiller-vue:1'),@('angular','devkiller-angular:1'),@('next','devkiller-next:1'))) {
 docker build -f compiler/Dockerfile.extended --build-arg "PROFILE=$($profile[0])" -t $profile[1] compiler
 if ($LASTEXITCODE -ne 0) { throw "Compiler setup failed: $($profile[0])" }
}
docker build -t devkiller-backend:1 compiler/backend
if ($LASTEXITCODE -ne 0) { throw 'Backend setup failed' }
docker pull postgres:17-alpine
if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL setup failed' }

Write-Host 'Pronto. Execute Iniciar.ps1 para abrir o painel.'
