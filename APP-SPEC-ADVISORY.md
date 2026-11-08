# AppSpec + verificação informativa — 22/09/2026

## O que foi implementado

O plano já existente vira um snapshot AppSpec com schemaVersion e revisão SHA-256. Não são criados requisitos extras nem outra chamada de planejamento. O snapshot é guardado no job e na versão gerada, e enviado às três etapas modulares. O código simples continua recebendo o plano existente.

O relatório do projeto associa apenas cenários cujo texto corresponde exatamente ao critério de aceite. Sem correspondência, aparece “Not verified”. Um cenário aprovado significa somente “Recorded scenario passed”, nunca comprovação integral do pedido. Critérios continuam sendo extraídos pela IA e não têm confirmação humana automática. Arquivos declarados não são evidência funcional.

O relatório é calculado em leitura, separado de qa/status. Não bloqueia preview, não aciona repair, não muda limites de testes nem cria chamadas extras. As políticas de QA e refinamento que já existiam continuam como antes. Falhas desta camada não interrompem geração ou consulta do projeto.

No MVP: abra o projeto, procure a área de checks e expanda “Requirements · informational only”. O relatório corresponde à versão ativa, ou à mais recente quando não houver preview ativo. Versões antigas sem AppSpec não recebem uma especificação inventada retroativamente. Edições manuais posteriores sem snapshot não herdam resultados antigos.

## Desativar imediatamente

Na pasta devkiller-executor:

    node tools/toggle-app-spec.mjs off

Ou edite settings/app-spec.json para enabled: false. O arquivo é consultado em cada uso, inclusive por workers. Recarregue o MVP. O histórico permanece salvo; uma chamada já enviada pode conter o contexto anterior. Para reativar: use on.

## Restaurar o código anterior

Checkpoint: K:/devkiller_v3/checkpoints/before-appspec-advisory-20260922

Execute Restore.ps1 dessa pasta com o Engine e MVP parados. Ele confere hashes antes de restaurar os quatro arquivos modificados; se houver alterações posteriores, recusa sobrescrevê-las. Desativa o recurso e não apaga projetos, bancos, chaves ou arquivos novos. Reinicie Engine e MVP depois.

## Escopo e evidência

Testes locais usam respostas simuladas: snapshot/revisão, falta de plano, ausência de falsos passes, falha de ambiente, passagem do contexto às três chamadas e replay sem nova chamada. Testes existentes de geração, orquestração, persistência e MVP também foram executados. Nenhuma geração paga foi necessária para implementar a camada.

Isso comprova o mecanismo, não melhora estética nem qualidade de uma geração real. A comparação de qualidade continua pendente. A AppSpec é versionada por conteúdo nas versões geradas; não é um editor colaborativo de requisitos nem um novo sistema de aprovação.
