# Ingestão curada — 16/09/2026

Oito documentos Q01–Q08 adicionados ao workspace devkiller-biblioteca. Total remoto 69; local 39. Conteúdo em devkiller-executor/knowledge/curated-v1: sínteses originais com fontes oficiais, adaptações ao stack e dois exemplos completos originais. Não são downloads integrais de sites nem bibliotecas externas instaladas.

Cobertura: estado React; Radix/dialog; Recharts; Motion acessível; Lucide/SVG/fotografia; React Router; Playwright/QA; compatibilidade shadcn. Fontes, escopo e data em cada documento; hash e localização nos manifestos. Resultados vetoriais correspondentes usam cópia completa com hash verificado.

Validado: oito uploads/indexações confirmados; Q02 e Q03 compilaram juntos no Docker do Engine sem rede; oito consultas direcionadas recuperaram os oito documentos completos dentro do orçamento. Evidências: validation/curated-v1-build.json e validation/curated-v1-retrieval.json. Consultas direcionadas são smoke tests, não benchmark amplo ou prova de qualidade de geração. Compilação não é teste completo de interação.

Uma correção de recuperação preserva o texto original de consultas curtas ao buscar por necessidade; antes, nomes específicos como React Router podiam se perder na consulta genérica.

Ferramentas avaliadas, não instaladas:
- Context7: consulta de documentação por versão, não um acervo único para baixar. https://github.com/upstash/context7
- Firecrawl/Crawl4AI: coletores alternativos para futuras atualizações. Não são conteúdo do RAG nem dependências do app gerado. https://docs.firecrawl.dev/introduction e https://docs.crawl4ai.com/core/quickstart/
- Repomix: preparar repositórios aprovados, preservando arquivos/dependências/licença por componente. https://repomix.com/guide/
- Docling: opção para PDF/DOCX num serviço hospedado futuro, desnecessária para as fontes web desta entrega. https://github.com/docling-project/docling
- shadcn registry: referência incorporada em Q08, sem instalar blocos com dependências ausentes. https://ui.shadcn.com/docs/registry

Não houve nova geração de aplicativo nesta entrega. Indexação e buscas podem consumir embeddings conforme o AnythingLLM; custo monetário não reportado. Não se afirma sincronização integral entre os dois corpora nem integração desses serviços externos.
