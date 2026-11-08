# JEV no DevKiller v3 — avaliação em 22/09/2026

Status: pesquisa e proposta. Nenhuma integração, dependência, chave ou chamada paga de JEV foi adicionada ao Engine.

## O que a documentação confirma

JEV é um modelo de decisões estruturadas da TypeSafe. Recebe estado textual/JSON e perguntas com respostas delimitadas: escolha, pontuação ou probabilidade de uma afirmação. Não produz código, explicações ou imagens. Perguntas independentes podem compartilhar o mesmo estado em uma chamada.

Fonte: https://docs.typesafe.ai/introduction

Atualmente aceita somente texto, sem imagens, áudio ou vídeo. Uma distribuição de probabilidades não garante que uma decisão individual esteja correta. Portanto, não substituiria o modelo visual que examina screenshots nem o gerador.

Fonte: https://docs.typesafe.ai/concepts/system-one

A documentação de modelos apresenta Jev 1.13, US$ 0,042 por milhão de tokens de entrada e saída sem cobrança. Define 64k por requisição e 32k para estado mais a maior pergunta. São condições do fornecedor, não uma medição feita no DK. O catálogo da Vercel anuncia uma promoção gratuita até 25/09/2026; não planejar custos permanentes com essa gratuidade.

Fontes: https://docs.typesafe.ai/models e https://vercel.com/ai-gateway/models/jev

As limitações publicadas incluem aritmética, datas, contexto irrelevante, interpretações muito literais e influência de conteúdo adversarial. Cálculos e validações determinísticas devem permanecer em código. Falhas desconhecidas precisam conservar uma opção explícita de incerteza.

Fonte: https://docs.typesafe.ai/model-jaggedness/jev-1.13

## Onde eu o experimentaria no DK

1. **RAG:** classificar a pertinência de cada trecho para a etapa atual, preservando a origem. Começar apenas medindo; não descartar referências automaticamente antes da avaliação.
2. **Triagem:** a partir de erro, log, requisito e evidência do teste, sugerir defeito funcional, defeito visual, ambiente indisponível, teste inconclusivo ou evidência insuficiente.
3. **Prevenção de ciclos:** reconhecer quando duas tentativas tratam o mesmo erro sem evidência de progresso. Hashes, contadores e estado de execução continuam sendo calculados pelo Engine.
4. **Cobertura semântica:** sugerir vínculos entre requisitos e cenários redigidos de forma diferente. Não converter essa sugestão em “requisito aprovado”; o resultado do cenário e sua abrangência continuam separados.

Esses usos são propostas de engenharia, não capacidades já medidas no DevKiller.

## Experimento recomendado

- Usar primeiro registros históricos, sem modificar a geração ou bloquear previews.
- Selecionar exemplos de vários tipos de app e resultados positivos, negativos e inconclusivos; evitar otimizar apenas para Trailroom/ON AIR.
- Anotar os exemplos manualmente e separar um conjunto que não será usado para ajustar as perguntas.
- Enviar apenas evidências relevantes, sem segredos, dados pessoais desnecessários ou arquivos inteiros quando um trecho basta.
- Comparar decisões com os rótulos humanos e regras atuais. Medir especialmente falsos pedidos de reparo, falhas não detectadas, incerteza, latência e custo.
- Fixar a versão do modelo e armazenar estado resumido, critérios, resposta e origem das evidências.
- Se útil, ativar como conselheiro com fallback determinístico. Falha do JEV nunca invalida um app que já funciona, nem autoriza reparo automaticamente.

Minha recomendação: vale testar para reduzir chamadas caras de triagem e melhorar o uso do RAG. Não é a solução direta para direção de arte. O caminho visual permanece: plano específico → implementação → navegador → revisão visual → refinamento verificado.
