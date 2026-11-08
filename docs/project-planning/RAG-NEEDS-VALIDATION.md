# RAG por necessidade — 16/09/2026

Problema observado: a busca lexical usava até os primeiros 64 termos do pedido inteiro; o ranking selecionava sobretudo design e não reservava referências para armazenamento/regras. O experimento anterior também forçava lexical, embora a instalação estivesse configurada para AnythingLLM.

Mudança: seleção determinística de necessidades (dados, regras de datas/dinheiro/reservas, tecnologia e design), com buscas separadas e diversificação de candidatos elegíveis. O provedor escolhido continua explícito; Off não consulta, e AnythingLLM não é substituído silenciosamente por busca local. Máximo de quatro buscas remotas, seis referências e 4.000 tokens no contexto final. Há custo potencial de embeddings no provedor de busca; ele não informa tokens/custo desta consulta ao Engine. Não há chamada adicional de LLM para planejar a busca.

Atualização do catálogo remoto: P10, guia profissional de composição, foi indexado e adicionado ao manifesto com hash e cópia integral verificável. O catálogo AnythingLLM passa a ter 61 documentos; o catálogo local mantém 31. Não são corpora idênticos: a lacuna do guia profissional foi corrigida, não foi feita uma cópia indiscriminada de todas as fontes.

Evidência:
- 30 testes dos módulos RAG passaram.
- Suíte geral: 115 passaram, zero falhas (devkiller-executor/validation/rag-needs-full-tests.log).
- Teste novo garante cobertura das necessidades do briefing longo e respeito a fontes desativadas e limites.
- Teste existente verifica contexto salvo antes da chamada e igualdade do conteúdo com a entrada do modelo usando transporte simulado.
- Nova geração real única dd751de5-7d6b-4a94-b1d5-6d50a29549da, projeto c5a65a2a-8d96-4f35-9808-ac4c996b4df5, namespace4310, usa AnythingLLM explicitamente. Sem reparo automático, imagem gerada ou revisão visual paga.
- Contexto real salvo: 2.815 tokens, DK03 (persistência), DK08 (dinheiro/datas), S01 (stack), P10 (composição), S06 e D04. Quatro buscas. Arquivo: devkiller-executor/validation/rag-needs-live-context.json.

Limites: cobertura é identificação das referências selecionadas, não prova de que o modelo aplicou cada regra. Seleção por palavras/curadoria é explicável, porém não compreensão semântica completa. Uma geração não estabelece ganho universal de qualidade. Resultados funcionais e visuais devem ser avaliados separadamente. Orçamento agregado do restante do Engine continua uma etapa distinta.
