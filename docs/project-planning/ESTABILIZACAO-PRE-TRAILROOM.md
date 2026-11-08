# Estabilização do DevKiller — marco pré-Trailroom

Registro: 16/09/2026. Este documento registra o marco solicitado pelo usuário e o plano de implementação. Não executa rollback, não certifica segurança técnica e não autoriza automaticamente novas gerações pagas.

## Marco histórico solicitado

**PRE-TRAILROOM — último estado considerado seguro pelo usuário**, imediatamente antes da primeira criação de Trailroom. “Seguro” aqui significa referência de confiança operacional do usuário, não auditoria de segurança ou garantia de ausência de bugs.

Primeiro Trailroom encontrado nos bancos preservados nesta inspeção:
- Namespace: 50106.
- Projeto: 04fab516-6fba-4eec-a33c-4467c6a3c91a.
- Título: Trailroom — outdoor rental workspace.
- Criação: 2026-09-16T07:22:38.410Z (04:22:38.410 em São Paulo).
- Banco: devkiller-executor/projects/50106/04fab516-6fba-4eec-a33c-4467c6a3c91a/application.sqlite.

Esse horário é um limite histórico baseado nos registros encontrados, não prova de que não houve tentativa anterior ausente dos registros. Não foi identificado um snapshot exato do código do Engine imediatamente anterior a esse limite. Não apresentar este marco documental como backup restaurável. Há pacotes anteriores, incluindo DevKiller-Engine-v0.12.0.zip, mas são mais antigos e não equivalem ao estado pré-Trailroom. Restaurá-los poderia remover melhorias posteriores legítimas.

O Trailroom revisão 5 (projeto 691122d4-b57d-4f78-a2dd-73517e632d0a, namespace 4310) é apenas uma amostra atual para regressão. Não substitui o marco pré-Trailroom nem é evidência de geração autônoma reproduzível.

## Diagnóstico e fonte

Segunda avaliação independente, conversa 01a0a96b-3217-7e12-90f3-6f37ed27cc25, somente leitura:
- QA contém expectativas e seletores incorretos; falhas acceptance-3 e acceptance-5 do Trailroom não demonstram defeitos atuais.
- Proteção durável contra repetição existe para geração, mas não cobre uniformemente o reparo genérico.
- Limites locais não formam orçamento agregado por objetivo; uso desconhecido e operações auxiliares precisam ser contabilizados.
- Hash alterado não prova redução do defeito.
- Relatórios e revisões divergem; verificações independentes existentes não têm evidência completa para reprodução.

## Plano por entregas verificáveis

1. Preservação e proveniência: criar snapshot consistente do código/configuração não secreta e backup consistente dos bancos antes de alterar implementação; registrar hashes e versões. Separar histórico copiado de novas chamadas. Vincular cada resultado ao projeto, revisão, hash, versão do teste e execução. Corrigir relatório antigo mantendo histórico. Critério: snapshot recuperável validado em diretório isolado, sem substituir instalação atual.
2. QA confiável: revisar cenários, usar dados explícitos e independentes, seletores válidos e asserções com semântica definida. Não trocar globalmente comparação exata por contains. Classificar falha como teste, código, ambiente ou visual; selector ausente requer diagnóstico, pois pode indicar requisito realmente ausente. Cenário pendente/inválido não autoriza reparo pago. Critério: casos sabidamente corretos passam, defeitos reais deliberadamente introduzidos são detectados, falhas de teste não são atribuídas ao app.
3. Controle central de chamadas: objectiveId persistente, reservas atômicas e idempotência para geração, conversa, reparo, revisão, embeddings e imagens. Registrar tokens/custo reportados separadamente de estimativas; reservar pessimisticamente chamadas de resultado desconhecido e não repeti-las automaticamente. Duplo clique, concorrência e reinício não podem duplicar reserva/chamada. Critério: testes locais com provedor simulado demonstram limites e recuperação sem consumo real.
4. Reparo por evidência: guardar requisito, reprodução, esperado/observado e identidade do defeito. Revalidar a mesma falha na mesma base antes de editar; promover candidato somente com melhoria comprovada e sem regressões críticas. Parar se uma tentativa não reduzir defeitos confirmados; limite proposto de até duas correções por objetivo, sujeito ao orçamento total. Mudança de hash isolada não conta. Preservar último preview funcional e explicar a parada em linguagem humana.
5. Persistência e regressões: consolidar adaptador/contrato de armazenamento e confirmação após gravação; suíte fixa para seed único, reload, falha de gravação, busca inequívoca, estoque, cancelamento/devolução separados e menu móvel. Regras de aluguel ficam no teste de domínio, não impostas a todos os apps. Evidências devem conter passos, valores, revisão e hash.
6. Validação controlada de geração: somente após controles locais aprovados, repetir um briefing fixo com teto explícito de consumo. Avaliar funcionamento e design separadamente. Expandir gradualmente para outros domínios; não ampliar stack durante estabilização. Resultado insuficiente encerra o experimento com diagnóstico, não abre série indefinida de novas tentativas.

## Escopo deste registro

Somente documentação alterada. Nenhum código do Engine/MVP modificado, serviço reiniciado, rollback executado ou chamada de geração iniciada nesta etapa. A prioridade é tornar o processo controlável antes de exigir mais qualidade por novas gerações.
