# DevKiller v3

Snapshot do motor local em `K:/devkiller_v3/devkiller-executor`, preparado em 07/11/2026. O `package.json` registra a versão **0.14.0**. Inclui o código atual, compiladores, interface, recursos, base de conhecimento, testes e documentação de planejamento. As correções locais mais recentes datam de 23/09/2026.

Credenciais, configurações pessoais, projetos gerados, dependências instaladas, caches, logs e backups ZIP foram excluídos. Configure suas próprias credenciais conforme `SEGREDOS.md`. A pasta original foi preservada. Este envio não representa uma nova validação de todas as funcionalidades.

Para começar, leia as instruções abaixo e use `Preparar.ps1`/`Iniciar.cmd`, ou instale as dependências e execute `npm start`. Os documentos históricos abaixo descrevem marcos anteriores à versão atual do pacote. Planejamento adicional está em `docs/project-planning/`.

---

# DevKiller Engine — edição local

**Versão 0.12.0:** RAG local com busca textual e semântica, referências rastreáveis e opção de desligar. Leia [KNOWLEDGE.md](KNOWLEDGE.md) para uso e arquitetura, e [VALIDATION-0.12.md](VALIDATION-0.12.md) para o comparativo com aplicativos reais. A geração persistente da versão anterior continua disponível; modelo padrão e stack mantidos.

Uma bancada local para transformar arquivos de um aplicativo em um preview utilizável. Criada do zero, sem código ou configurações das tentativas anteriores.

## Abrir e experimentar

1. Deixe o **Docker Desktop** aberto, usando contêineres Linux.
2. Na primeira utilização em outra máquina, execute `Preparar.ps1` para baixar a imagem. É necessário Node.js 24 ou superior.
3. Dê dois cliques em **Iniciar.cmd**. Ele abre **Under the hood** em **http://127.0.0.1:4310/#under-the-hood**. Use **Generate app** para abrir o estúdio.
4. Para testar a base sem IA, clique em **Usar exemplo** e depois em **Iniciar aplicativo**. Para seu próprio app, descreva o pedido no gerador.
5. Adicione, conclua e exclua uma tarefa. Experimente **Reiniciar**, **Abrir em outra aba** e **Parar**.

O rodapé contém **Encerrar painel**, que encerra também o aplicativo. Fechar apenas a aba deixa a execução ativa até o limite de 30 minutos. É possível voltar abrindo Iniciar.cmd.

O exemplo pronto e a importação de arquivos não usam IA. O botão **Generate app** usa a chave que você informar e consome a API da sua conta OpenAI. O Docker e o navegador usam recursos da sua máquina. A configuração inicial baixa uma imagem; as execuções seguintes usam a imagem local.

## O que este pacote entrega

- Interface em português, estado da execução, histórico e diagnóstico.
- Exemplo funcional de tarefas, salvo no armazenamento do navegador.
- Importação de arquivos de texto HTML, CSS, JavaScript, JSON, TXT e SVG. A interface importa arquivos na raiz; a API aceita subpastas.
- Um contêiner Docker por versão, 128 MB de memória, 0,5 CPU, limite de 64 processos, usuário sem privilégios e arquivos montados somente para leitura.
- Preview em origem separada, com permissões de navegador restritas. Nenhum segredo ou socket Docker é montado no contêiner.
- Uma tentativa por clique. Uma atualização precisa responder antes de substituir o preview disponível.
- Encerramento após 30 minutos por versão, imposto também dentro do contêiner caso o painel seja encerrado inesperadamente.

Durante uma atualização podem existir dois contêineres: o atual e o candidato. Na correção, a alternativa pode permanecer disponível para comparação e restauração durante a sessão, respeitando seu prazo de 30 minutos. Os limites agregados são até 256 MB e 1 CPU para os aplicativos, além dos recursos do Docker, painel e navegador.

## Escopo e limites claros

Este é um gerador e executor local para uma pessoa, com vários projetos salvos e um preview principal por vez. A IA produz HTML/CSS/JavaScript ou componentes React/JSX com acesso ao banco local pelo módulo DevKillerDB. O perfil React usa dependências fixas e compilação isolada. Backends arbitrários, Next.js, autenticação, cobrança e publicação na internet são etapas futuras.

Bibliotecas, fontes, imagens e APIs externas não são carregadas pelo preview devido à política de conteúdo. Inclua os arquivos necessários no pacote. Não importe segredos. Projetos novos têm origens separadas e banco local próprio. O exemplo antigo de tarefas continua usando localStorage, dependente do navegador; ele não é convertido automaticamente para SQLite.

O isolamento implementado é uma base local, não uma certificação para hospedar código hostil de clientes. O navegador executa o JavaScript do aplicativo; os limites do contêiner não limitam a CPU ou a memória da aba. O processo fixo do contêiner só serve os arquivos. O contêiner usa a rede padrão do Docker; não há promessa de isolamento de rede para código de servidor arbitrário.

O último preview é preservado quando uma atualização falha na validação de entrada, na preparação ou na disponibilidade HTTP. No fluxo **Tentar corrigir**, uma falha na verificação de inicialização também impede a substituição automática, e a tentativa fica acessível separadamente. Ao encerrar o painel, os contêineres temporários são descartados; código, histórico e dados do banco continuam salvos. Na geração nova ou importação, uma versão que responde pode abrir com erros sinalizados.

## O que o QA verifica

O QA verifica **disponibilidade do ambiente** e **erros de inicialização no navegador**. A página inicial deve responder HTTP 200 com conteúdo não vazio em até 10 segundos; o preview então abre e o navegador verifica sua inicialização. Erros detectados aparecem com requisito, resultado esperado, evidência e orientação. Ações específicas e aparência continuam pendentes. Veja [DIAGNOSTICO.md](DIAGNOSTICO.md).

Os testes de desenvolvimento deste pacote exercitam os botões reais no navegador e a falha de atualização. Eles não são automaticamente aplicados a todo aplicativo importado. Não há comparação rígida de pixels. A correção por IA depende de um clique e não se repete sozinha.

Para experimentar uma falha com preservação: inicie o exemplo, importe um `index.html` contendo apenas espaços e publique a nova versão. O QA de ambiente reprova o documento vazio; o preview anterior permanece acessível. Depois escolha **Usar exemplo** para recuperar a entrada.

## As peças e seus encaixes

| Peça | Arquivo | Responsabilidade |
|---|---|---|
| Interface | `ui/` | Controles, preview e explicações |
| Coordenador | `server.mjs` | Estados, versões e troca do preview |
| Entrada | `modules/files.mjs` | Validação de nomes, formatos e tamanho |
| Executor | `modules/docker.mjs` | Iniciar e remover contêineres limitados |
| QA básico | `modules/qa.mjs` | Verificação de disponibilidade com evidência |
| QA de navegador | `modules/browser-qa.mjs` | Detectar e explicar erros de inicialização |
| Gerador OpenAI | `modules/openai.mjs` | Chamada limitada, resposta estruturada e streaming |
| Comparação da correção | `modules/repair.mjs` | Detectar resposta igual e comparar os diagnósticos |
| Projetos persistentes | `modules/projects.mjs` | Um banco SQLite por projeto, versões, histórico e dados |
| Dados do aplicativo | `modules/app-data.mjs` | API local limitada e interface DevKillerDB |
| Contrato da stack | `modules/stacks.mjs` | Perfis suportados e instruções para gerar código compatível |
| Preparação | `modules/compiler.mjs` e `compiler/` | Compilação isolada com ferramentas fixas |
| Servidor do app | `runtime/static-server.cjs` | Servir arquivos estáticos no contêiner |
| App de exemplo | `example/` | Lista de tarefas independente do painel |

O gerador produz `{ "files": [{ "name": "index.html", "content": "..." }] }`, com título, resumo e limitações. O executor devolve estado, versão, verificações e endereço de preview. Essa interface conectou o gerador à bancada existente.

API local: `GET /api/state`, `GET /api/example`, `POST /api/start`, `POST /api/restart`, `POST /api/stop`, `POST /api/environment`, `POST /api/shutdown`. As mutações exigem a origem exata do painel e `X-DevKiller-Token`, obtido em `/api/state`. O serviço escuta apenas em 127.0.0.1. Não há autenticação multiusuário.

Geração: `POST /api/openai/key`, `POST /api/openai/clear`, `POST /api/generate`, `POST /api/generation/cancel` e `GET /api/current-files`. A chave nunca faz parte de `/api/state`; só o indicador de configuração é retornado.

## Verificações reproduzíveis

Com o painel iniciado e Docker pronto:

```powershell
npm ci
npx playwright install chromium
npm test
npm run test:e2e
```

Os testes de navegador usam a bancada e param o aplicativo ao terminar; rode-os quando não estiver usando seu preview. Capturas ficam em `test-results/`. O painel usa módulos nativos do Node.js e Playwright para o diagnóstico automático. O pacote de testes é uma dependência de desenvolvimento.

Para iniciar pelo terminal: `npm start`. Para outra porta, defina `DEVKILLER_PORT` e `DEVKILLER_PREVIEW_PORT`; o atalho utiliza sempre 4310/4311. Se o Docker estiver indisponível, o painel abre com uma explicação e o botão **Check Docker** permite consultar novamente.

Arquivos temporários ficam em `.runtime/`. Versões encerradas normalmente são removidas. Depois de um encerramento forçado, podem restar arquivos locais; não são importados como código nem recuperados automaticamente. Contêineres da mesma instalação são identificados por etiqueta e removidos na próxima inicialização.
