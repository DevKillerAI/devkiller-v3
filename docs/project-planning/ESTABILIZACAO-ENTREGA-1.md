# Estabilização — primeira barreira, 16/09/2026

Sem rollback. Snapshot anterior às alterações em `checkpoints/stabilization-20260916`: 388 arquivos, incluindo 81 cópias SQLite feitas com VACUUM INTO e integrity_check. Hashes das cópias verificados. Não é o estado pré-Trailroom; não inclui segredos, dependências, runtime ou biblioteca de mídia. Não é um pacote de recuperação completa da instalação.

Implementado:
- repairInput rejeita falhas oriundas de cenários propostos pelo modelo, inclusive registros antigos acceptance-*. Continua exibindo os resultados, sem transformar divergência em aprovação.
- Diagnóstico com hash divergente dos arquivos não é enviado ao reparo.
- /api/repair reserva persistentemente a combinação de arquivos e conjunto de verificações antes de consultas de conhecimento ou chamada de reparo. Reabrir o banco não permite repetir a mesma combinação. Reserva não é liberada silenciosamente após falha.
- Interface desabilita reparo quando só há cenários não confirmados e explica a necessidade de revisão.
- Proveniência atual registrada separadamente em validation/stabilization-provenance.json, preservando relatório histórico.

Validação: suíte geral de 113 testes passou (validation/stabilization-tests.log). Depois foi acrescentado um cenário reproduzindo texto de confirmação com botão auxiliar: os nove testes do conjunto scenarios + repair-guard passaram. Esses testes não gastam chamadas reais de geração. O conjunto geral anterior não inclui esse teste adicional.

Limitações e próximos incrementos:
- Ainda não existe fluxo de confirmação independente para promover um cenário do modelo a defeito reparável; a política atual é deliberadamente conservadora.
- Reserva cobre apenas reparo genérico; não representa orçamento agregado de geração/conversa/edição/imagem/revisão/embeddings.
- Alterar os arquivos pode produzir nova reserva. Ainda falta medida de progresso e limite por objetivo compartilhado entre rotas.
- Não foram apagados falsos negativos históricos nem declarada aprovação completa do Trailroom.
- Restam suíte fixa de domínio, confirmação de testes, orçamento agregado e validação controlada de geração.

Revisão externa: busca do catálogo encontrou Codex Security já instalado, voltado a segurança. CodeRabbit documenta revisão de alterações Git e integração com Codex, inclusive suporte a instalação Windows: https://docs.coderabbit.ai/cli . Não instalado, autenticado ou usado nesta etapa; nenhum código enviado a esse serviço. O workspace ainda não é repositório Git. Revisão por IA complementa testes, não certifica ausência de erros.
