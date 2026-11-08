# Evidências da entrega — 13/09/2026

## Atualização v0.9.0 — DevKiller Engine e Under the hood

32 testes de unidade/integração e oito testes de navegador passaram. A suíte inclui geração simulada com compilação real, persistência depois de reiniciar, proteção da chave, erros, cancelamento, correção e preservação do preview anterior. Não houve chamada real à OpenAI nesta entrega.

O novo painel foi verificado em 1512, 1024, 768, 391 e 320 pixels, além de inspeção visual dos screenshots no desktop e no celular. O teste comprova navegação entre o estúdio e Under the hood sem perder o pedido digitado, correspondência das contagens com a API local, resposta visual à perda de leitura e recuperação, respeito à preferência por reduzir movimento e ausência de rolagem horizontal. Os indicadores de CPU, memória, disco, sessão e consumo têm origens explícitas. Chave configurada não é apresentada como saldo ou acesso verificado.

Os testes de telemetria verificam contagem de consumo conhecido/incompleto, cache e compartilhamento de consultas, atualização manual e classificação de Docker indisponível ou banco ilegível. Na primeira rodada de navegador, dois testes ainda buscavam o rótulo antigo “Excluir segredo”, alterado para “Excluir chave”. Os seletores foram atualizados; a execução completa posterior passou.

O painel principal foi atualizado e consultado: executor, compilador e leitura dos bancos disponíveis; chave carregada; nenhum preview iniciado durante a entrega. As imagens da marca são locais e o pacote não inclui projetos, segredos ou arquivos temporários. A API pública para incorporar o Engine em outros produtos e o backend gerado continuam etapas futuras, conforme ENGINE.md.

## Atualização v0.8.0 — capacidade e design

Passaram 28 testes de unidade/integração na suíte completa e um novo teste de preservação das dependências entre perfis (29 casos distintos). Os testes de limites, correção e persistência foram repetidos após os últimos ajustes e passaram. Sete testes de navegador passaram.

O novo percurso usa resposta explicitamente simulada, seguida de compilação real em Docker e execução real no Chromium. Verifica ícones Lucide, gráfico Recharts, alteração e persistência do valor pelo botão, consulta das fontes/lockfile/dependências, reutilização da versão preparada e adaptação a 1440, 391 e 320 pixels sem erro de execução. Nenhuma chamada real à OpenAI foi feita nesta atualização; a qualidade de design do modelo ainda precisa ser avaliada em uma geração real.

A primeira execução do teste mediu a largura antes de o ResizeObserver do gráfico atualizar a tela. O teste agora aguarda a condição de ajuste, sem aumentar a tolerância de largura. Também limpa seu estado em finally para não interferir no teste seguinte. A execução completa posterior passou.

No painel principal, foi confirmado o perfil padrão react-v2, descrição de até 8 mil caracteres, saída de até 20 mil tokens e chave configurada. O preview de teste anterior foi encerrado a pedido do usuário; a exclusão da pasta desse projeto foi bloqueada pela revisão automática, portanto seus arquivos não foram apagados.

## Atualização v0.7.0 — React, arquivos e preparação

27 testes de unidade/integração passaram. Seis testes de navegador também passaram, incluindo geração React com resposta simulada, compilação real, salvamento pelo aplicativo e consulta dos arquivos originais e compilados no painel e no filesystem.

O teste provocou um erro de sintaxe em uma nova versão: o preview anterior permaneceu funcionando e com os dados salvos. A correção simulada recebeu a versão que falhou, gerou uma nova versão compilável e preservou os dados. A restauração e reabertura usaram versões salvas, e o resultado compilado foi reutilizado.

Um teste separado encerrou o processo do servidor, abriu novamente o projeto React em um navegador novo e confirmou o valor persistido e a separação dos dados de dois aplicativos. Também foram testadas recusa de importações não suportadas e distinção entre falha de código e compilador indisponível.

Nenhuma chamada real à OpenAI foi feita nesta entrega. A primeira geração real com o novo contrato ficará para o teste do usuário. As verificações comprovam o mecanismo e os exemplos controlados; o QA genérico permanece limitado à inicialização. A inspeção automática de todas as regras e a tradução de erros de runtime por source maps ainda não estão implementadas.

## Atualização v0.6.0 — projeto e dados persistentes

24 testes de unidade/integração e os cinco testes de navegador passaram, incluindo um percurso com navegador e servidor real: gerar com resposta simulada, gravar pelo botão do aplicativo, encerrar o processo, reiniciar, reabrir em um navegador novo e recuperar o mesmo valor. O pedido original, código e consumo continuaram salvos; reabrir não criou outra chamada nem versão.

Dois aplicativos receberam bancos e origens distintos. O segundo começou sem os dados do primeiro. Uma escrita enviada com a origem do primeiro para o segundo foi rejeitada. A inicialização automática do QA não criou registros no banco real. A recuperação de uma tentativa interrompida foi testada sem repetição da chamada.

Esses testes usam uma resposta simulada da IA em processo isolado e execução real de Docker, SQLite e Chromium. Não foi necessário usar a chave real nesta entrega. Não comprovam que toda geração futura usará corretamente a API do banco; esse comportamento deve ser validado em cada app.

## Atualização v0.5.0 — correção acompanhada

22 testes de unidade/integração passaram. Os quatro testes de navegador anteriores passaram; o novo teste de correção passou após ajustar a sincronização da espera e permitir substituir a credencial simulada ao repetir o teste. A verificação da correção usa uma instância isolada, sem consumo da chave real.

No jogo existente do usuário, foi realizada **uma chamada real** à OpenAI: 4.644 tokens de entrada, 4.131 de saída, aproximadamente 40 segundos incluindo preparação e verificação. O backend estava em execução normal, sem o simulador usado nos testes. O pedido original não havia sido preservado; foram enviados os arquivos e o diagnóstico, com instruções para conservar o aplicativo.

A resposta manteve HTML e CSS idênticos. A única mudança em `app.js` foi declarar `let jogoAtivo = true;`, eliminando a referência a uma variável inexistente. Essa alteração veio da resposta da OpenAI, sem edição manual do código do jogo. O executor gravou os arquivos, iniciou a versão, verificou-a e trocou o preview. Não houve compilação, pois são arquivos estáticos HTML/CSS/JavaScript.

| Verificação | Resultado observado |
|---|---|
| Inicialização automática | Erro anterior deixou de aparecer; 27 casas foram criadas |
| Preservação | Versão anterior disponível na porta 4314; versão corrigida na 4311 |
| Cinco cliques reais na camada superior | X e O alternaram; sequência terminou em vitória de X |
| Encerramento da partida | As 27 casas ficaram desabilitadas após a vitória |
| Reiniciar | Casas limpas e jogador X reiniciou |
| Clique automatizado na camada inferior, sem girar o tabuleiro | O teste não alcançou a casa nessa posição; não comprova impedimento ao jogar interativamente |

**Resultado e correção da interpretação:** o erro de inicialização foi resolvido. Inicialmente, o teste de clique na camada inferior foi interpretado como impedimento ao uso do jogo. Essa conclusão foi excessiva: o teste tentou uma casa na posição inicial, sem explorar a rotação interativa. O usuário experimentou o resultado e informou que os cliques funcionam e que deu certo. O registro desse teste específico é inconclusivo quanto a um defeito de interação; não deve ser apresentado como reprovação do jogo. O QA genérico do produto continua limitado à inicialização. Não foi realizada uma segunda chamada à IA.

O relato textual da OpenAI inclui afirmações de funcionamento que não equivalem a testes. O painel distingue esse relato das verificações efetivamente realizadas. Ainda não foi validado o conjunto completo de vitórias em 3D, empate, toque em dispositivos móveis ou acessibilidade.

As evidências locais desta tentativa ficam em `.runtime/real-repair-before.json`, `.runtime/real-repair-after.json`, `.runtime/real-gameplay-evidence.json` e nas capturas `.runtime/tictactoe-after.png` e `.runtime/repair-panel.png`. Arquivos temporários e segredos não entram no ZIP.

## Histórico da primeira entrega

Ambiente: Windows, Node.js 24.19.0, Docker Engine 29.7.2, contêiner Linux node:24-alpine e Chromium instalado pelo Playwright.

## Resultado observado

`npm test`: **5 testes passaram**.

`npm run test:e2e`: **2 testes passaram**, execução final em aproximadamente 19 segundos. O primeiro teste percorre diversas ações reais do aplicativo; o segundo verifica o bloqueio de mutações sem credencial/origem.

| Requisito | Resultado esperado | Evidência |
|---|---|---|
| Abrir o exemplo | Contêiner iniciado e app utilizável no iframe | Título “Meu dia.” localizado no navegador |
| Adicionar tarefa | Texto aparece na lista | “Validar o DevKiller” encontrado após clicar em adicionar |
| Concluir tarefa | Estado marcado e contador atualizado | Checkbox marcado e “1 de 1 concluídas” |
| Persistir dados | Tarefa mantida ao recarregar e reiniciar | Checkbox continuou marcado nas duas operações |
| Abrir separado | Link abre um app funcional | Nova aba exibiu o título do aplicativo |
| Excluir tarefa | Item removido | Contagem de itens passou a zero |
| Impedir tarefa vazia | Nenhum item criado com espaços | Lista permaneceu vazia |
| Preservar versão em falha | Candidato vazio não substitui o app anterior | Versão permaneceu v2; título visível; QA exibiu “AMBIENTE · Falhou” |
| Recuperar após erro | Publicar o exemplo funciona novamente | Nova versão v3 disponível |
| Mostrar limite do QA | Não afirmar funcionalidade sem testá-la | Painel mostrou “FUNCIONAL · Pendente” |
| Usar em tela estreita | Sem transbordamento horizontal em 391 e 392 px | Medição de largura do painel e do iframe; tarefa adicionada em tela de 392 px |
| Parar | Preview deixa de servir o aplicativo | Estado “Parado” e HTTP 503 no endereço do preview |
| Restringir controle do painel | POST sem credencial/origem rejeitado | HTTP 403 |
| Validar entrada | Rejeitar caminhos externos, duplicatas e excesso | Cinco testes de validação aprovados |

Capturas inspecionadas visualmente: `evidencias/desktop.png` e `evidencias/mobile.png`.

## Falha encontrada e corrigida

O primeiro teste encontrou um erro funcional: o sandbox do iframe bloqueava o envio do formulário antes de sua lógica JavaScript executar. O preview visual abria, mas o botão de adicionar não produzia uma tarefa. Foi concedida a permissão de formulários ao sandbox; a política de conteúdo continua impedindo navegação por envio de formulários. Depois da correção, o percurso completo passou, incluindo adicionar e excluir.

## O que não foi comprovado por estes testes

- Validação funcional automática de aplicativos diferentes do exemplo.
- Hospedagem pública, segurança multiusuário ou cobrança comercial.
- Recuperação de um projeto após reiniciar o painel.
- A passagem real de 30 minutos em um teste de longa duração. O limite existe no coordenador e no processo do contêiner; sua expiração não foi aguardada nesta entrega.
- Contenção de CPU e memória do JavaScript executado na aba do navegador.

As capturas e testes comprovam esta entrega e este ambiente, sem promessa de ausência de erros futuros.


## v0.10.0 — English control room and persistent models

34 backend tests passed, including model persistence across server restarts, unchanged model IDs in provider requests, unsupported-model rejection, key protection, builds and per-app data isolation. All 9 browser scenarios passed across the full run and an executor rerun after updating its sample-content assertion: Connections, Under the hood, responsive layout down to 320 px, generation, persistence, preview preservation, repair, restore and cancellation. Provider responses were simulated; compilation, Docker and browser interactions were real. No real GPT-5.6 Luna generation or API-account access was verified.
