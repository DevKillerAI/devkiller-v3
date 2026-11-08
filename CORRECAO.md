# Correção acompanhada — v0.5.0

Quando o diagnóstico detectar uma falha funcional de inicialização, **Tentar corrigir** faz uma única chamada à OpenAI usando a chave protegida no backend.

1. Envia os arquivos atuais, a evidência do erro e o pedido original, quando registrado. Se o pedido antigo não estiver disponível, isso é informado e a IA recebe instrução de preservar o aplicativo existente.
2. Recebe os arquivos corrigidos e prepara uma versão separada. O preview atual continua acessível durante a tentativa.
3. Verifica disponibilidade e inicialização da nova versão no navegador. Se a falha continuar ou o verificador não concluir, mantém a versão anterior e permite abrir a tentativa separadamente. Se a inicialização passar, abre a nova versão e oferece **Voltar à versão anterior**.
4. Mostra resultado, duração, consumo informado pela API e explicação da IA. Essa explicação não é evidência de teste: as verificações executadas aparecem separadamente.

## Limites

- Uma chamada por clique; nenhuma repetição automática. Se receber exatamente os mesmos arquivos, encerra indicando ausência de progresso.
- Entrada de correção limitada a 160 mil caracteres, até 20 mil tokens de saída e 180 segundos de chamada. Esses limites controlam consumo; ainda não existe orçamento monetário configurável.
- Cancelamento disponível durante a chamada. O processamento já realizado pode ser cobrado. Se a API não informar tokens, o painel não inventa um valor.
- O verificador observa a inicialização. Não testa automaticamente todas as jogadas, regras de vitória, botões, aparência ou requisitos do pedido. Passar nessa verificação não significa que o jogo completo foi validado.
- HTML, CSS e JavaScript locais continuam permitidos. CSS moderno já pode ser usado. Bibliotecas e serviços externos continuam fora desta etapa.
- Uma versão alternativa por vez, durante a sessão, com prazo próprio de 30 minutos. Uma nova publicação ou tentativa pode descartar a alternativa anterior. Não há histórico persistente de projetos.
- Duas versões podem permanecer em execução: até 256 MB e 1 CPU somados nos contêineres. Os recursos do painel, Docker e navegador são adicionais.

O painel padrão usa 4310, o preview 4311 e a versão alternativa 4314. `DEVKILLER_COMPARISON_PORT` permite mudar a última porta. Rotas de correção: `POST /api/repair`, `POST /api/repair/cancel` e `POST /api/restore`, com as mesmas proteções locais das demais mutações.

Os testes de integração da correção usam uma instância separada e respostas simuladas, sem consumir a chave real. Testam preservação, uso do app corrigido, restauração e interrupção quando a IA devolve o mesmo código.
