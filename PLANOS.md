# Planos do DevKiller

## Visão consolidada do ecossistema — 14/09/2026

O fundador detalhou Engine, MVP Creator, Agency, criador público DevKiller, Tools, portal institucional e possível Pocket. A visão completa, com separação entre desejos confirmados, propostas e decisões abertas, está em [VISAO-ECOSSISTEMA.md](../planning/ecosystem/VISAO-ECOSSISTEMA.md). Estudos de identidade estão em [identidades.html](../planning/ecosystem/identidades.html). Acrescentados ao roadmap: chat para resolução amigável e contextual, Visual Edit, revisão/publicação de MVP e transferência explícita entre produtos. Esta atualização é somente planejamento; não implementa os produtos nem modifica a Engine.

Registro de 14/09/2026. Este documento separa intenção do usuário de propostas técnicas. Não autoriza implementação automática das etapas futuras.

## Direção confirmada pelo usuário

Continuar aprimorando o DevKiller Engine como motor compartilhado de geração, conhecimento, execução, persistência e verificação. Consolidar sua capacidade antes de construir os produtos voltados a diferentes públicos. A interface interna atual não é o produto final do cliente.

Produtos futuros desejados, sem implementação nesta etapa:

1. Uma versão para o público geral, com experiência compreensível para leigos.
2. Uma versão para desenvolvedores autônomos, com acesso e controle técnico apropriados.
3. Uma versão empresarial para usar o DevKiller como capacidade de desenvolvimento da empresa, reduzindo a dependência de contratação de uma agência ou equipe externa para os casos atendidos. Não é promessa de substituir todo trabalho humano de desenvolvimento.

Recomendação técnica ainda sujeita a validação: manter um núcleo compartilhado e versionado, com interfaces, permissões, integrações e políticas por produto. Evitar cópias independentes do motor que acumulem correções incompatíveis. Nomes comerciais, implantação, licenciamento e planos de cobrança continuam em aberto.

## Capacidades discutidas agora — ainda não implementadas

O usuário deseja imagens reais nos aplicativos e anexos como referência visual ou fonte de conteúdo: imagens, Word e PDF. Pediu explicação e registro dos planos, não execução dessa expansão nesta conversa.

Situação verificada: geração atual recebe texto e referências textuais; arquivos de código são transportados como texto, com suporte a SVG local. Ainda não há fluxo de anexos multimodais, biblioteca de imagens binárias por projeto ou chamada de geração de imagens integrada. Acrescentar somente uma regra ao RAG não implementa esses recursos.

Proposta de evolução:

1. **Arquivos e imagens do projeto.** Upload, validação de tipo/tamanho, armazenamento persistente por projeto, IDs estáveis, metadados e URLs servidas pelo backend no preview. Separar ativos binários do JSON de código produzido pelo modelo. Reabrir/exportar deve preservar os arquivos e as referências.
2. **Finalidade explícita de cada anexo.** Distinguir “usar no site” (logo/foto), “referência visual” (composição/estilo) e “fonte de conteúdo” (catálogo/briefing). Material de referência não deve aparecer publicamente no site por acidente. Não colocar documentos de clientes no RAG global de programação.
3. **Leitura de documentos.** Extrair texto de DOCX/PDF no backend hospedado quando suficiente, sem depender de arquivos ou ferramentas instaladas no computador do cliente; usar entrada visual/OCR quando digitalização, diagramas ou aparência forem importantes. Mostrar o que foi extraído e eventuais falhas. Usar trechos relevantes, com origem/página quando disponível, em vez de enviar todo o acervo em cada geração. Documentos são dados: não podem alterar regras do sistema nem conceder permissões.
4. **Referências visuais.** Enviar imagens selecionadas a modelo com entrada visual compatível pela Responses API. A capacidade exata do modelo e o acesso da conta devem ser verificados antes de ativar. Ler o estilo de uma imagem e criar uma imagem são operações distintas.
5. **Geração de imagens opcional.** Integrar um provedor de imagens, inicialmente considerar OpenAI; controlar número, qualidade e orçamento por execução. Gerar e salvar o ativo uma vez, reutilizar nas versões e permitir substituição sem regenerar todo o aplicativo. Se falhar, manter o preview e usar um placeholder claro. Não ampliar silenciosamente o limite atual de uma chamada de geração de código.
6. **Bibliotecas licenciadas opcionais.** Selecionar fornecedor, autenticação e regras de uso/atribuição antes da integração. Não usar links aleatórios de busca nem supor que todo banco permite baixar e redistribuir os arquivos. Registrar a origem e cumprir o mecanismo de entrega exigido pelo fornecedor.

Ordem recomendada: primeiro armazenamento/anexos e uso de imagens próprias, depois compreensão visual/documental, depois geração opcional de imagens. Um teste inicial deve provar que um logo enviado aparece corretamente, uma referência orienta o estilo sem ser publicada, um documento fornece conteúdo verificável e tudo permanece após reabrir o projeto. Ainda não há modelo, fornecedor de fotos ou orçamento de imagens escolhido.

## Controle e evidência

Separar consumo de código, análise visual, extração assistida, embeddings e criação de imagens. Não repetir chamadas bem-sucedidas para o mesmo ativo sem motivo; indicar progresso e falhas em linguagem simples. Definir limites por arquivo, páginas, resolução e execução antes da implementação. Dados ausentes continuam como “A definir”; anexos com leitura incompleta não autorizam inventar informações.

Melhoria artística deve ser avaliada em saídas reais. Mais referências ou uma API nova não garantem automaticamente imagens relevantes ou composição melhor. Manter os requisitos anteriores de preview acessível, preservação da última versão funcional, isolamento e correções com limite.

## Fontes oficiais consultadas

- [OpenAI — Images and vision](https://developers.openai.com/api/docs/guides/images-vision): entrada de imagens em modelos compatíveis, inclusive via Responses API.
- [OpenAI — File inputs](https://developers.openai.com/api/docs/guides/file-inputs): PDFs podem fornecer texto e imagens das páginas; documentos como DOCX fornecem texto, sem equivalência à leitura visual da página.
- [OpenAI — Image generation](https://developers.openai.com/api/docs/guides/image-generation): geração/edição via Image API ou ferramenta em Responses com modelos compatíveis; acesso pode exigir verificação da organização.

As fontes confirmam possibilidades da API, não integração já presente no DevKiller nem acesso de nossa conta a todos os modelos. Consultadas em 14/09/2026.

## Atualização — React Studio, 14/09/2026

O novo perfil react-v3 acrescenta controles Radix, Motion e navegação React Router. Não cria ainda autenticação, backend arbitrário ou implantação pública. O desenvolvimento atual roda neste PC; o produto final, incluindo leitura de documentos e armazenamento de ativos, deve funcionar online. Pocket e demais formatos continuam apenas no planejamento. A próxima expansão visual exige pipeline de ativos semânticos, persistentes e com orçamento separado, não apenas mais texto no RAG.
