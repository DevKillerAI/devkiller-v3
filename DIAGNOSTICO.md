# Diagnóstico automático — v0.4.0

O próprio DevKiller agora abre o preview em um navegador Chromium separado depois de cada publicação. O preview é liberado assim que responde; a verificação ocorre com o resultado acessível.

O painel mostra **Diagnóstico automático**, incluindo requisito, resultado esperado, resultado observado, evidência e próximo passo. Erros de JavaScript na inicialização e falhas HTTP em scripts/estilos são classificados como falha funcional. O status passa a **Abriu com erro**. Se o navegador de testes não iniciar ou atingir o limite de tempo, o painel identifica um problema de ambiente de verificação, sem afirmar que o aplicativo está errado.

O botão **Verificar aplicativo** repete apenas essa verificação local, sem chamar a OpenAI e sem corrigir o código. O teste usa contexto novo, sem cookies ou armazenamento do navegador do usuário. Solicitações de rede fora da origem do preview são bloqueadas no verificador.

Exemplo: um script que contém `jogoAtivo = true` em modo estrito, sem declarar a variável, produz um erro real de execução. O sistema identifica o nome da variável e a linha indicada pelo navegador e apresenta a orientação de declará-la antes do uso. Essa regra não depende do jogo da velha: o diagnóstico é extraído da exceção capturada.

## Limites da verificação

- A inicialização é observada por 700 ms após o carregamento. Erros tardios ou que dependam de interações podem não ser encontrados.
- Não há teste universal de botões, regras de vitória/empate, pagamentos, persistência ou requisitos específicos. Esses itens continuam explicitamente pendentes.
- A análise não chama IA. A partir da v0.5, **Tentar corrigir** faz uma chamada paga por clique, conforme [CORRECAO.md](CORRECAO.md).
- A análise completa tem um limite de 20 segundos, mais o encerramento do navegador.
- O teste não é uma auditoria de segurança nem fornece limites de recursos para JavaScript executado no navegador do usuário.
- Na geração nova ou importação, a resposta HTTP permite abrir uma versão, mesmo com erros sinalizados. No fluxo de correção da v0.5, a tentativa só substitui a anterior quando passa também pela verificação de inicialização. Isso não certifica todos os requisitos funcionais.

Pedidos novos passam a aparecer na seção **Pedido enviado**, durante a sessão do painel. Pedidos antigos não podem ser recuperados se seu texto não foi registrado.

## Testes realizados

19 testes de unidade/integração e 4 testes de navegador passaram. Entre eles: execução real do erro `jogoAtivo`, diagnóstico de outra variável para evitar uma regra específica para o jogo, separação entre falha do verificador e falha funcional, exibição automática da evidência na interface e manutenção do acesso ao preview com erro.

Para instalar o navegador de QA em uma nova máquina, execute **Preparar.ps1**. As credenciais persistentes continuam no backend e não participam do teste do aplicativo.
