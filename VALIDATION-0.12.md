# DevKiller 0.12 — implementação e avaliação do RAG

Data: 14 de setembro de 2026. Modelo mantido: **gpt-5.6-luna**. Decisão: **RAG implementado, índice local pronto, modo padrão Off**. Os testes não demonstraram ganho consistente que justifique ligá-lo para toda geração. Há um resultado favorável em um cenário de correção, insuficiente para generalizar.

## O que foi entregue

SQLite FTS5/BM25 + LanceDB local, embeddings `text-embedding-3-small` com 512 dimensões, 16 referências curadas, filtro por stack e fontes habilitadas, combinação RRF, até seis referências e 4.000 tokens de contexto. A interface permite desligar, usar busca textual ou híbrida, construir o índice e inspecionar referências. O contexto é salvo antes da chamada do gerador e reutilizado na retomada. [Arquitetura, operação e limites](KNOWLEDGE.md).

A instalação principal, na porta 4310, foi atualizada para 0.12.0. O índice real foi construído com uma chamada e 3.015 tokens de embeddings reportados. A construção não liga o recurso automaticamente. O pacote 0.11.0 e uma cópia do código anterior foram preservados no diretório superior.

## Testes de implementação

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Suíte Node, incluindo HTTP e interface de Knowledge | 77 passaram, zero falhas | [Log](validation/rag-final-tests.log) |
| Busca, embeddings e HTTP após o ajuste do padrão Off | 24 passaram, zero falhas; subconjunto da suíte, não somar como casos distintos | [Log](validation/rag-final-default.log) |
| Percursos Playwright anteriores do DevKiller | 9 passaram | [Log](validation/rag-e2e.log) |
| Auditoria das dependências de produção | Zero vulnerabilidades reportadas pelo npm audit no momento da consulta | [Registro](validation/rag-audit.json) |
| Instalação principal | Versão 0.12.0, 16 fontes, índice pronto, Off | [Captura](evidencias/rag/knowledge-installed.png) |

Os testes usam SQLite e LanceDB reais. Testes de integração usam respostas simuladas para poder reproduzir transporte, erros, interface e interrupções; não medem a qualidade do modelo. Incluem encerramento real do processo após salvar o contexto, retomada sem repetir busca ou geração, revogação de fonte antes de reservar chamada, cache, falhas de indexação, fallback explícito, limites de tokens e ausência de segredo na resposta HTTP.

## Recuperação com embeddings reais

Foram preparadas 40 perguntas independentes do catálogo: 32 positivas e oito fora do domínio. Elas não foram indexadas. O mesmo corpus e os mesmos parâmetros foram mantidos durante o piloto.

| Métrica | Textual | Híbrida |
| --- | ---: | ---: |
| Referência esperada entre as três primeiras, perguntas positivas | 29/32 | 30/32 |
| Referência esperada entre as seis primeiras, perguntas positivas | 30/32 | 30/32 |
| Abstém corretamente nas perguntas fora do domínio | 7/8 | 7/8 |
| Acerto combinado: referência em até seis ou abstinência esperada | 37/40 | 37/40 |

A híbrida melhorou uma posição no ranking, sem aumentar o total de acertos nesse conjunto. Ambas omitiram uma referência importante em dois pedidos em português e recuperaram material irrelevante para uma pergunta sobre a fossa oceânica mais profunda. Similaridade não é confiança calibrada. [Consultas e resultados completos](evidencias/rag/live-2026-09-14T03-38-48-416Z/retrieval.json).

## Aplicativos gerados de verdade

Três pedidos: despesas, estoque e tarefas. Duas repetições em cada modo, totalizando 12 chamadas reais de geração. A ordem dos modos foi invertida na segunda repetição. Pedidos e modelo permaneceram iguais. Os testes de aceitação foram escritos independentemente dos cenários propostos pelo próprio modelo. Nenhum aplicativo foi gerado novamente para substituir uma tentativa ruim.

| Resultado | Off | Híbrido |
| --- | ---: | ---: |
| Aplicativos que cumpriram todos os critérios | **2/6** | **2/6** |
| Verificações individuais aprovadas, após corrigir a interação do avaliador | **88/102** | **85/102** |
| Chamadas de geração | 6 | 6 |

| Aplicativo | Off: rodada 1 / rodada 2 | Híbrido: rodada 1 / rodada 2 |
| --- | --- | --- |
| Despesas | 18/18 · 17/18 | 17/18 · 17/18 |
| Estoque | 8/16 · 13/16 | 9/16 · 8/16 |
| Tarefas | 17/17 · 15/17 | 17/17 · 17/17 |

As verificações incluem criar, editar e excluir, centavos, filtros com totais globais, recarregamento, datas, rejeição de dados inválidos, falha controlada de gravação, preservação do estado confirmado, texto literal, largura de celular e exceções do navegador.

O agregado inclui requisitos de formato. Por exemplo, o pedido exigia que `#valuation` contivesse apenas o número; várias saídas exibiram `$0.80`. Isso é descumprimento de formato, não prova de soma incorreta. Cinco ou seis verificações do mesmo aplicativo podem falhar por esse único motivo. Portanto, 102 verificações não equivalem a 102 experimentos independentes.

### Consumo observado

| Nas seis gerações de cada modo | Off | Híbrido |
| --- | ---: | ---: |
| Tokens de entrada reportados | 12.454 | 22.392 |
| Tokens de saída reportados | 39.819 | 39.291 |
| Média de entrada por aplicativo | 2.076 | 3.732 |
| Tempo médio até concluir geração e preparação | 58,7 s | 60,5 s |

A entrada aumentou **79,8%**, com saída semelhante. Isso não significa aumento de 79,8% na cobrança total: preços e pesos de entrada e saída diferem, e não foi feita reconciliação com a fatura. Na campanha inteira, incluindo os quatro reparos exploratórios, foram reportados 55.933 tokens de entrada e 121.065 de saída. Não houve uso desconhecido nas 20 chamadas registradas.

Embeddings: 49 chamadas e 7.732 tokens nos estudos, mais uma chamada e 3.015 tokens para deixar o índice da instalação principal pronto. Total observado: **50 chamadas e 10.747 tokens**, sem uso desconhecido. A maioria das chamadas foi de consultas curtas da avaliação, não da indexação. As reexecuções de navegador não usaram embeddings nem geração. Na comparação de recuperação, as médias observadas foram 3,6 ms para texto e 368,6 ms para híbrido, incluindo a chamada remota; estes tempos não constituem medição isolada de desempenho.

Também houve falhas reais de exclusão: alguns aplicativos usaram `window.confirm`, bloqueado pela política de sandbox do preview. Em outros, o testador precisava confirmar um diálogo da própria página. O RAG não eliminou esse problema consistentemente. Os excessos de largura no celular também permaneceram.

## Correções em projetos isolados

Foram usados dois defeitos conhecidos em um contador persistente: variável inexistente na inicialização e chamada de `render` antes de sua declaração. Cada combinação defeito/modo recebeu uma chamada, em projeto novo. As funções de incrementar, persistir e zerar também foram testadas.

| Defeito | Off | Híbrido |
| --- | --- | --- |
| Variável inexistente | 6/7: corrigiu início, mas zerar falhou | 6/7: mesma regressão |
| Render antes da declaração | Tentativa rejeitada pelo QA; recurso de banco apontava para caminho inexistente | 7/7 |
| Correções integralmente aprovadas | **0/2** | **1/2** |

O caso rejeitado continua no denominador de tentativas. Não se deve comparar 6/7 com 13/14 como taxas gerais: a tentativa rejeitada não chegou às sete ações do navegador. O diagnóstico da tentativa recusada registra HTTP 404 em `/__/devkiller/db.js`. Nas duas tentativas com regressão no botão de zerar, o modelo introduziu confirmação nativa incompatível com o sandbox.

Esse pequeno resultado favorece a híbrida em um defeito, mas não sustenta uma promessa de superioridade em correções gerais. [Lote isolado](evidencias/rag/live-2026-09-14T03-38-48-416Z/clean-repairs/results.json).

## Correções do próprio protocolo e transparência

O primeiro avaliador descartava diálogos nativos, não confirmava os diálogos de exclusão da página e verificava imediatamente o estado de checkboxes cujo salvamento era assíncrono. Também tentava clicar diretamente em um input visualmente oculto em vez do rótulo visível. As interações foram corrigidas e os mesmos arquivos foram reexecutados com banco limpo. A correção final de checkbox foi aplicada aos quatro aplicativos de tarefas, em ambos os modos. Não houve chamada adicional de geração nesses replays. A política de sandbox permaneceu igual: confirmação nativa bloqueada continua sendo defeito do aplicativo.

Os quatro reparos do primeiro roteiro herdaram o pedido do último projeto gerado. Esse lote foi preservado como **exploratório e excluído da conclusão principal sobre reparos**. Foram feitas quatro chamadas adicionais em projetos novos para corrigir esse problema de isolamento. Assim, a campanha consumiu **20 chamadas reais de geração/correção**: 12 gerações, quatro reparos exploratórios e quatro reparos isolados. Os registros não ocultam as tentativas exploratórias.

Os resultados originais e todos os replays ficam separados. Os arquivos das 12 gerações e dos reparos aceitos foram preservados. No reparo isolado recusado, esta execução preservou o diagnóstico, uso e estado da tentativa, mas o arquivo exportado era o preview anterior; não há cópia completa do código candidato recusado neste lote. O roteiro foi corrigido para buscar a revisão candidata nas próximas execuções.

## Interpretação e próximos critérios

A infraestrutura passou nos testes. **A utilidade de adicionar esse corpus ao gerador não ficou demonstrada de forma consistente.** Uma explicação plausível é que notas curtas e genéricas repetem parte dos cuidados já presentes no contrato do DevKiller, e a busca ainda seleciona algumas referências pouco pertinentes. Isso é uma hipótese, não uma conclusão causal comprovada.

A amostra contém apenas três tipos de aplicativo, duas repetições, dois defeitos e um modelo. Não cobre PDFs, grandes bases, clientes comerciais, outros modelos ou pedidos longos. Não houve avaliação estética cega nem estudo estatístico com poder definido. A busca textual foi comparada à híbrida na recuperação; não foi feito um terceiro grupo de geração com contexto exclusivamente textual. O conjunto atual não deve ser usado simultaneamente para ajustar receitas e declarar ganho no mesmo benchmark.

Antes de ligar por padrão, a próxima versão precisa de conhecimento mais específico dos erros reais do DevKiller, exemplos cuja execução foi verificada, seleção mais precisa e **outro conjunto de pedidos reservado para avaliação**, incluindo português. Ela deve aumentar a proporção de aplicativos aprovados sem introduzir regressões relevantes, com consumo e latência registrados.

Até lá, **Off preserva o comportamento original**. Para experimentar conscientemente, selecione Hybrid retrieval e salve em Knowledge; o índice já está pronto nesta máquina. Text retrieval permite testar referências sem chamadas de embeddings. É possível voltar a Off a qualquer momento para as próximas execuções.

## Evidências

- [Manifesto original](evidencias/rag/live-2026-09-14T03-38-48-416Z/manifest.json) e [resultados originais](evidencias/rag/live-2026-09-14T03-38-48-416Z/results.json).
- [Replay com confirmações](evidencias/rag/live-2026-09-14T03-38-48-416Z/dialog-recheck/results.json) e [replay final dos quatro planejadores de tarefas](evidencias/rag/live-2026-09-14T03-38-48-416Z/task-label-recheck/results.json).
- [Análise consolidada](validation/rag-results.json), incluindo tokens, latência observada, falhas por critério e custos em chamadas. Latências incluem geração e preparação do preview e sofreram concorrência com testes locais; não são um benchmark isolado de desempenho.
- [Hashes dos arquivos da entrega](validation/rag-release-hashes.json). As evidências detalhadas ficam no workspace; o ZIP do Engine inclui a análise consolidada e os roteiros, sem credenciais ou projetos pessoais.
