# React e preparação do DevKiller Engine — v0.8.0

O gerador suporta `static-v1` (HTML/CSS/JavaScript), `react-v1` (React básico, compatibilidade) e `react-v2` (padrão para novos pedidos: React, ícones Lucide, gráficos Recharts e banco local). A ampliação usa o mesmo executor, persistência de projetos e serviço de dados. Projetos anteriores mantêm o perfil e a versão preparados.

O novo perfil fixa lucide-react 1.45.0, Recharts 3.10.1 e react-is 19.3.0 junto ao React 19.3.0, Vite 8.3.0 e plugin-react 6.1.1. As versões e o lockfile ficam na fonte exportada, e as dependências efetivas da compilação constam em environment.json. O compilador `devkiller-react:2` permite apenas os pacotes declarados no contrato. O compilador `devkiller-react:1` e os manifests em `compiler/legacy/` mantêm o formato anterior. Preparar.ps1 prepara ambos.

## Apps mais completos e design

`modules/design.mjs` contém a orientação compartilhada e versionada de produto e design: escopo proporcional ao pedido, percurso completo, composição apropriada ao domínio, hierarquia visual, CSS organizado, uso de espaço em telas grandes, adaptação para celular, acessibilidade e estados de interação. Não há uma chamada extra à IA para planejamento. A instrução anterior que exigia um app pequeno foi removida.

O teto de saída passou de 12 mil para 20 mil tokens, o prazo da chamada de 120 para 180 segundos e a descrição de 4 mil para 8 mil caracteres. Correções aceitam até 160 mil caracteres incluindo arquivos, pedido e diagnóstico. Cada ação continua limitada a uma chamada, com cancelamento e consumo informado pela API; o teto maior pode aumentar o custo de uma geração. Não há orçamento monetário configurável nesta etapa. Os limites de arquivos, banco e contêineres permanecem os mesmos.

Ícones são importados pelo nome; gráficos só são solicitados quando úteis, com altura de contêiner explícita, dados coerentes com filtros/totais e alternativa textual. CSS continua comum, sem Tailwind, CDN, instalação arbitrária ou backend gerado. Essas instruções ajudam o modelo, mas não comprovam que um app gerado cumpriu todos os requisitos ou atingiu qualidade visual. Isso depende da avaliação do resultado.

## Como a plataforma orienta a IA

O módulo `modules/stacks.mjs` define o contrato versionado: arquivos obrigatórios, bibliotecas permitidas, integração com o banco e padrões básicos de interação. O provedor recebe as instruções específicas do perfil escolhido. O histórico guarda perfil e hash das instruções de geração.

No perfil React, a IA entrega `src/App.jsx`, `src/styles.css` e componentes/funções adicionais dentro de `src/`. O DevKiller fornece `index.html`, `main.jsx`, configuração e dependências. A IA é orientada a carregar os dados antes de permitir alterações, aguardar os salvamentos e apresentar falhas de modo legível. Isso é orientação e validação de contrato; não é treinamento dos pesos do modelo nem garantia de acerto funcional.

Pacotes fixos desta entrega: React e React DOM 19.3.0, Vite 8.3.0 e plugin React 6.1.1. O lockfile fica em `compiler/package-lock.json`. Nenhum pacote solicitado pelo código gerado é instalado automaticamente. Importações de pacotes nos componentes ficam limitadas ao React; componentes e utilitários locais podem ser importados dentro de `src/`.

## Arquivos reais e visibilidade

Para cada nova versão, além do SQLite, o DevKiller cria:

```text
projects/4310/<projeto>/
  application.sqlite
  versions/<versão>/
    environment.json
    source/
      src/App.jsx
      src/styles.css
      index.html
      main.jsx
      vite.config.mjs
      package.json
      package-lock.json
    preview/
      index.html
      assets/...
```

`source/` conserva o código e a estrutura fornecida pelo motor. `preview/` aparece após a preparação e contém o resultado executável. O banco também guarda os arquivos, o resultado compilado, a identificação da imagem usada, as versões das ferramentas e o hash da fonte. Reabrir uma versão preparada recupera esse resultado sem chamar a IA nem compilar novamente.

Em **Informações e versões → Ver arquivos**, é possível ler e baixar arquivos individuais e consultar a pasta no PC. **Acompanhar o código recebido da IA** mostra os últimos 20 mil caracteres da resposta em andamento, ainda provisória. Os arquivos completos são materializados após receber uma resposta válida; não fingimos arquivos finalizados durante uma resposta parcial.

As pastas são cópias das versões, e o banco é a fonte usada para reabrir. Edições externas não são aplicadas silenciosamente: importe os arquivos ou a pasta como uma nova versão. A estrutura de dependências é controlada; importar um pacote React com `src/` aproveita esses arquivos e conserva a configuração da plataforma. As dependências instaladas são compartilhadas na imagem Docker do compilador, sem duplicar node_modules em cada projeto.

O projeto React exportado depende do serviço local DevKillerDB para seus dados. A cópia dos arquivos não inclui um backend independente do motor. Hospedagem externa com dados e publicação fullstack continuam sendo etapas futuras.

## Compilação e falhas

O módulo `modules/compiler.mjs` recebe fontes e devolve arquivos preparados ou um diagnóstico. Usa um contêiner sem rede e sem acesso aos bancos ou segredos, com imagem identificada, 512 MB, 1 CPU, limite de 64 processos e até 60 segundos. O preview continua com os limites anteriores. A primeira preparação da imagem requer internet e é realizada por `Preparar.ps1`.

Erros de sintaxe/importação são classificados como problema no código; ausência da imagem, interrupção do processo ou limite de preparação são falhas do ambiente. Os diagnósticos incluem requisito, esperado e evidência. A tentativa que falhou permanece no histórico; o preview anterior é preservado. **Corrigir código da tentativa** envia essa fonte à IA, com uma chamada por clique. Um problema apenas de ambiente não autoriza uma correção de código por IA.

O QA de navegador continua verificando inicialização. Não é uma validação universal de regras, botões ou layouts. Nesta etapa, erros de execução de React podem apontar para o JavaScript compilado; ainda não há tradução automática por source maps. A correção recebe as fontes originais e a evidência capturada.

## Direção do DevKiller Engine

As responsabilidades ficam explícitas: contrato de stack → provedor de geração → armazenamento de versões → preparação → execução → diagnóstico/correção. O compilador e a persistência não dependem da UI. A futura extração do Engine deve manter esses contratos e acrescentar perfis de backend, migrações de dados, autenticação e integrações com testes próprios. A API atual e o coordenador ainda pertencem ao projeto local; esta entrega não declara um motor fullstack finalizado.

Referências consultadas: [React em projetos existentes](https://react.dev/learn/add-react-to-an-existing-project), [compilação do Vite](https://vite.dev/guide/build), [opções do Vite](https://vite.dev/config/shared-options).

Referências desta ampliação: [Lucide para React](https://lucide.dev/guide/react), [Recharts ResponsiveContainer](https://recharts.github.io/en-US/api/ResponsiveContainer/), [limites do GPT-4.1 mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini).
