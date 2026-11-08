# Próximas capacidades do DevKiller

Data: 2026-09-16. Avaliação e preparação de conhecimento, não ativação de stacks.

## Base confirmada

O manifesto do compilador Studio contém React, Vite, Radix, Motion, Lucide, Recharts e React Router. Nenhuma dependência nova foi adicionada nesta avaliação.

## Ordem recomendada

1. Formulários e validação: React Hook Form + Zod + resolvers. Aplicativos com reservas, cadastros e edições ganham comportamento mais consistente. Implementar e validar separadamente do pacote visual.
2. Perfil visual opcional: Tailwind integrado ao Vite e seleção pequena de componentes shadcn completos. Melhora a base para composição e acabamento; não garante design premium sozinho. Preservar o perfil CSS atual e os projetos antigos.
3. Aplicativos operacionais: TanStack Table para tabelas realmente complexas. TanStack Query apenas quando houver APIs e estado remoto que justifiquem cache e sincronização.
4. Fullstack: avaliar Node/Fastify isolado por aplicativo, com contrato de API, armazenamento, migrações, autenticação e publicação. PostgreSQL e provedor de identidade exigem avaliação própria antes da escolha.

Os nomes de futuros perfis e versões exatas ainda não estão definidos. Fixá-los depois de verificar compatibilidade no compilador, não usando automaticamente a versão mais recente.

## O que adiar

Next.js não é requisito para tornar este gerador fullstack: acrescentaria outro modelo de execução antes de estabilizarmos o atual. 3D/WebGL, mapas, editores avançados e pagamentos devem ser capacidades opcionais orientadas a pedidos reais, com avaliação específica. Fotos relevantes e gráficos legíveis continuam prioritários; uma biblioteca 3D não os substitui.

## Política de promoção

Preparação de conhecimento -> exemplo funcional isolado -> dependências fixadas -> build real -> fluxo no navegador -> recuperação de falha -> regressão dos projetos atuais -> ativação controlada.

Cada referência precisa de versão, escopo, fontes, limitações, erros comuns e critérios verificáveis. Material futuro fica no workspace AnythingLLM devkiller-future-stacks, fora da biblioteca consultada pelo gerador. Antes de promover uma referência, substituir orientações genéricas por exemplos compilados no perfil correspondente.

## Material reunido

F01 a F05 em planning/future-stacks: sínteses originais das fontes oficiais, com propostas específicas para o DevKiller. Não são cópias integrais de documentação, pacotes instalados ou receitas já homologadas. Testes de recuperação no RAG confirmam localização das referências, não qualidade de aplicativos gerados.
