# Art direction v2 — implementação

Checkpoint anterior: `checkpoints/before-art-direction-20260922`. O script `Restore.ps1` nesse diretório restaura os arquivos anteriores depois que os serviços forem parados e verifica alterações posteriores antes de copiar.

## Alterações

- Removidos `max_output_tokens` dos caminhos padrão de planejamento, geração, revisão de imagens, revisão visual e edição/refinamento. O transporte mantém a possibilidade de um limite explícito para consumidores que o solicitarem; a geração do Engine não fornece esse limite. Limites do provedor continuam valendo.
- Removidas a meta de 70%, instruções de 20.000 tokens e os tetos cumulativos informativos de 44k/56k. Interfaces passaram a mostrar limite do provedor.
- Mantidos cancelamento, prazos, validação de caminhos/pacotes, proibição de repetir chamadas incertas e controle de continuações. Não significa execução infinita. Standard/efficient ainda têm cinco chamadas de código, incluindo até duas continuações; ultimate conserva sua política anterior de continuações com detecção de ausência de progresso.
- Efficient usa raciocínio médio em vez de baixo nas etapas de planejamento, código e revisão.
- Plano visual contém composição, tipografia, paleta, imagens, assinatura, coreografia e descrição da hierarquia/layout/estados/mobile de cada tela principal.
- Saíram as obrigações globais de fontes do sistema e animações discretas. Fontes DM Sans, Space Grotesk e Manrope acompanham preview e exportação com licenças OFL; nenhuma rede externa é necessária no app gerado.
- Refinamento pode tratar oportunidades de composição mesmo se o app estiver funcional. Usa arquivos completos alterados, pode adicionar componentes de apresentação e preserva os arquivos não alterados. Módulos de domínio, dados, servidor, migrações, testes e contratos são protegidos. Cenários originais são reaplicados.
- Uma tentativa de refinamento; promoção somente com revisão concluída e preservação das verificações que passavam. Se falhar, a versão anterior permanece. Sem transformar sugestões estéticas em reprovação funcional.
- Quando imagens já foram autorizadas e há um achado relevante, o refinamento pode tentar uma fotografia editorial complementar, com recibo persistido e inspeção antes de fornecê-la ao modelo. Sem repetição automática de chamadas incertas. Não é fotografia de inventário real.
- Revisão amostra três rotas em desktop/mobile, mais a tela principal em movimento normal/reduzido. Controles de abertura anotados podem ser examinados em QA isolado; não há envio de formulários. As amostras são imagens estáticas, não avaliação completa de vídeo/animação.

## Economia sem reduzir a entrega

- Mantidos arquivos completos no contexto e entrega apenas de arquivos alterados.
- Imagens visuais são enviadas à implementação de telas; não à etapa de dados nem repetidas nas continuações. Metadados e caminhos aprovados continuam presentes.
- Trechos RAG idênticos são deduplicados por conteúdo, sem truncar o código.
- Recibos de etapas concluídas impedem repetição. Cache de planejamento considera modelo, versão das instruções, referências e assets; trocar modelo não reutiliza silenciosamente um plano antigo.
- Nenhuma porcentagem de economia prometida: depende do pedido, imagens, modelo e refinamento necessário.

## Limites da validação

Testes de transporte usam respostas simuladas; testes de captura, fontes e compilação usam execução real local. Isso comprova o comportamento do pipeline, não uma melhoria estética em uma nova geração paga. Nenhuma nova geração paga foi iniciada nesta alteração. O próximo teste visual deve usar o mesmo briefing/modelo de uma referência anterior e registrar custo, tempo e avaliação humana.

Pesquisa complementar: `planning/JEV-DKV3-RESEARCH.md`. JEV não foi instalado nem integrado.

## Evidências desta entrega

- `art-direction-full-tests-final.txt`: 169/170 passaram; a única falha restante era uma asserção antiga que exigia 3.500 tokens na conversa. Atualizada para verificar a ausência do teto solicitado pelo usuário.
- `art-direction-chat-tests.txt`: os cinco testes dessa conversa passaram depois da atualização da asserção.
- `art-direction-final-additions.txt`: 12/12 passaram, incluindo conversa, refinamento, preservação de domínio/cenários, rejeição de caminhos inválidos, deduplicação, fontes/exportação e inspeção real de menu sem submeter o controle de salvar.
- `art-direction-regression.txt`: 35/35 testes de regressão dos caminhos alterados passaram.
- `art-direction-mvp-tests.txt`: 8/8 testes do produto MVP passaram.
- Engine reiniciado pela API de encerramento, sem geração ativa. Estado real informa `maxOutputTokens: null` e perfil efficient com raciocínio médio.
- Previews anteriores reabertos nas versões salvas: `http://127.0.0.1:52333/` (v1) e `http://127.0.0.1:50823/` (v2). Fonte Manrope respondeu HTTP 200 com 164.700 bytes no preview.
- `Restore.ps1 -CheckOnly` conferiu os hashes de 35 arquivos restauráveis. Nenhum projeto ou versão gerada foi alterado pelo checkpoint.
