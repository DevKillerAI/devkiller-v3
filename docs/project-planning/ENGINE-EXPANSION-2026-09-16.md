# DevKiller Engine 0.14 — expansão e evidências

## Ponto de recuperação

Antes de alterar o Engine, foi copiado o estado aceito pelo usuário para `K:/devkiller_v3/checkpoints/functional-20260916-1859`. O arquivo `CHECKPOINT.md` documenta o procedimento. Inclui Engine, MVP, projetos, configuração e segredos protegidos localmente; não publicar esse diretório. O ponto registra a aceitação do estado anterior, não uma certificação de ausência de defeitos.

## O que passou a existir de fato

| Caminho | Implementação | Evidência |
|---|---|---|
| React Complete | React/Vite, JSX/TSX, Tailwind, 24 componentes oficiais shadcn como código editável, dependências fixas | Build, clique, Dialog, Escape e aplicação real |
| 3D | Three.js, React Three Fiber e Drei instalados | Canvas WebGL renderizado; Prism Lab com troca de forma e material |
| Vue | Vue 3 SFC, bootstrap e compilador próprios | Build e botão reativo no navegador |
| Angular | Componentes standalone, signals, compilação JIT no navegador | Build e atualização de signal no navegador |
| Next.js | App Router com exportação estática, múltiplas rotas, opção de API separada | Build e navegação entre duas rotas |
| Backend | Rotas Fastify geradas, validação, módulos compartilhados empacotados | API real, rejeição de entrada inválida, importação de domínio compartilhado |
| Banco | PostgreSQL 17, volume persistente por projeto, migrações transacionais e imutáveis | Reinício sem perder dados, concorrência sem vender a mesma última unidade duas vezes |
| Isolamento | Containers, rede interna, banco sem porta publicada, credenciais fora do código, dados de QA separados | Fonte do servidor retorna 404; QA não altera estoque real |
| Exportação | package/lock, configurações, fontes, Dockerfile, Compose e backend quando solicitado | Pacote exportado construiu e consultou seu próprio PostgreSQL |

Os perfis anteriores, inclusive HTML/CSS/JS e React v1–v4, continuam disponíveis para versões já salvas. A expansão não converte automaticamente os projetos antigos.

O MVP continua separado do Engine. Seu adaptador agora solicita seleção automática: nomes explícitos Next.js/Vue/Angular escolhem esses perfis; pedidos sem framework usam React Complete. Isso é seleção determinística por perfil, não uma decisão arquitetural inteligente certificada.

## shadcn e bibliotecas

O Engine resolve imports `@/components/ui/<componente>`, materializa o código oficial e suas dependências, acrescenta os tokens e mantém proveniência/licença. Os arquivos podem ser alterados e exportados. Não inventa um pacote npm chamado shadcn nem injeta todos os componentes indiscriminadamente.

Registro: button, input, textarea, label, card, badge, separator, skeleton, dialog, alert-dialog, select, tabs, dropdown-menu, popover, tooltip, sheet, checkbox, switch, table, accordion, progress, slider, scroll-area, avatar.

React Complete/Next também recebem TanStack Query e Table, além das bibliotecas já existentes de formulários, validação, gráficos, ícones, animação e navegação. Bibliotecas React não são prometidas para Vue/Angular. A instalação acontece na preparação do ambiente; o build gerado não instala pacotes arbitrários ou consulta a rede.

## RAG conectado às etapas

Quatro receitas adicionais, derivadas de documentação oficial, foram ingeridas no AnythingLLM e registradas no catálogo: E01 (componentes/3D), E02 (backend/PostgreSQL), E03 (Vue/Angular), E04 (Next).

O filtro das etapas foi corrigido para não descartar backend, PostgreSQL e migrações na fundação e integração. A recuperação real retornou E02/E01 na fundação e implementação; E02 e referências especializadas na integração. A revisão visual recebeu suas referências próprias. IDs, hashes e recibos ficam salvos; ter um texto no RAG não é apresentado como prova de cumprimento.

Documentação usada: https://ui.shadcn.com/docs/registry ; https://ui.shadcn.com/docs/components-json ; https://vuejs.org/guide/quick-start.html ; https://angular.dev/guide/components ; https://nextjs.org/docs/app/guides/static-exports .

## Validação de uma geração pelo MVP

Prism Lab foi solicitado através do MVP, recebido pela API OpenAI e montado em três módulos. O operador não escreveu nem remendou a fonte do aplicativo. O Engine forneceu os componentes oficiais e o ambiente.

Durante a expansão, o worker ainda carregava uma versão anterior do validador e rejeitou um módulo `.mjs` de testes fora da pasta de servidor. As três respostas já estavam concluídas e salvas. Após atualizar o worker, elas foram revalidadas e retomadas sem repetir chamadas de geração. O evento de recuperação foi registrado; não se apagou a falha original.

Outro caso real levou a uma correção geral: o servidor gerado importava regras de domínio compartilhadas com o frontend. O compilador agora empacota esse grafo de módulos, em vez de copiar somente `src/server`.

Prism Lab passou em 5/5 cenários propostos e em um fluxo independente: criar material, mudar cor/rugosidade/forma, salvar, recarregar, aprovar, comentar e recarregar novamente. A API rejeitou nome vazio; não houve erro JavaScript; a tela de 390 px não teve transbordamento horizontal. Há capturas e relatórios em `devkiller-executor/validation/expansion/`.

A revisão visual apontou acabamento a melhorar. O primeiro refinamento foi bloqueado antes da chamada pelo limite antigo de contexto completo. O editor passou a selecionar arquivos completos relevantes, com inventário dos omitidos e recusa de patches fora do contexto. Isso também beneficia a edição visual de outros projetos grandes. Não se tratou a revisão funcional como aprovação automática de design premium.

Após essa correção, uma edição real pelo Engine/OpenAI aplicou três patches: removeu a duplicação de status no celular, calibraram-se as luzes 3D e melhorou-se a legibilidade do aviso de demonstração. A versão 2 manteve os 5/5 cenários passando; o fluxo independente foi repetido com sucesso. Os quatro registros demonstrativos reais permaneceram intactos; os registros de teste ficaram no schema de QA. Evidência: `validation/expansion/live-edit.json`.

Também foram corrigidos rótulos antigos do painel e o contrato do chat do MVP, que ainda descreviam o produto como apenas frontend React. O chat recebe agora as capacidades do perfil efetivamente salvo, sem prometer recursos de um perfil diferente.

## Limites explícitos desta entrega

- Next é exportação estática com backend Fastify separado; não inclui SSR ou Server Actions em tempo de requisição.
- Angular usa JIT com Vite, não o pipeline AOT/SSR do Angular CLI.
- PostgreSQL é infraestrutura local de desenvolvimento/preview e exportável. Não equivale a hospedagem pública com autenticação, política de acesso por cliente, backup gerenciado e operação empresarial.
- Credenciais de serviços externos, pagamentos e autenticação não são inventados ou simulados.
- Perfis novos: até 160 fontes / 4 MB, build de até 180 s. São limites de recursos explícitos, não promessa de capacidade ilimitada.
- A edição localizada continua tendo uma tentativa e orçamento finito; arquivos omitidos não podem ser alterados por adivinhação.
- A geração de prova usa o perfil Ultimate que já estava configurado. Não houve promessa de custo baixo nem repetição automática de chamadas incertas.

## Evidências reproduzíveis

Regressão final: **152/152 testes do Engine e 8/8 do MVP aprovados**, além dos testes reais de Docker, navegador, WebGL, PostgreSQL e exportação listados abaixo. O teste adicional de Next usou um Button oficial shadcn e navegação para uma segunda rota. A edição posterior do Prism manteve 5/5 cenários e a persistência confirmada independentemente.

`validation/expansion/profiles.json`, `three.json`, `backend.json`, `backend-preflight.json`, `portable.json`, `http.json`, `rag.json`, `prism-functional.json`, `regression-final.txt`, `mvp-tests.txt`.

Serviços ao concluir: Engine em http://127.0.0.1:4310/ ; MVP em http://127.0.0.1:4330/ ; Prism Lab em http://127.0.0.1:60398/ (preview temporário, reabrível pelo MVP sem nova geração). Projeto MVP: `7dd779f0-71f7-4648-9d27-576c75d37709`. Projeto Engine: `d9e87db6-089c-41e9-b8b8-becea6c3a409`, worker 54696.

Os scripts `tools/verify-*` dessa expansão exercitam os ambientes e fluxos. `tools/generate-expansion-proof.mjs` faz uma geração paga e NÃO deve ser repetido como teste de regressão. `tools/recover-completed-modules.mjs` é uma ferramenta operacional offline; exige todos os recibos completos e não chama a IA.

## Próximo critério de avanço

Antes de ampliar novamente: gerar uma amostra diversa de pedidos não relacionados ao Prism, comparar qualidade visual e funcional, medir tempo/consumo por etapa e classificar falhas por causa. Vue/Angular/Next têm testes reais de ambiente e interação simples, mas ainda não a mesma evidência de geração completa por IA obtida para React + PostgreSQL nesta rodada. Não atribuir nota 9/10 universal a partir de um único sucesso.
