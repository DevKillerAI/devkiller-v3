# Segredos persistentes do backend — v0.3.0

Abra **Configurações → Segredos**, em http://127.0.0.1:4310/settings. Cole a chave da OpenAI e clique em **Salvar segredo no backend**. O gerador não possui mais campo para credenciais: ele apenas consulta se o backend está configurado.

O segredo fica em `.secrets/4310/openai.dpapi`, criptografado com a DPAPI no escopo do usuário atual do Windows. O backend o descriptografa internamente ao iniciar. Encerrar a aba, encerrar o servidor ou reiniciar o computador não exclui o arquivo. Para trocar a chave, use **Substituir segredo**; para apagá-la, use **Excluir segredo**.

O valor não é exibido novamente nem devolvido pela API local. Não é enviado ao navegador, aos arquivos gerados ou aos contêineres. Durante o uso, existe na memória do backend para autenticar as solicitações à OpenAI. O cadastro não valida saldo/permissões e não usa créditos de geração.

A proteção está vinculada ao perfil do Windows. Outro usuário ou outra máquina precisa cadastrar sua própria chave. Processos executados como o mesmo usuário do Windows fazem parte do mesmo limite de confiança; este cofre local não substitui um gerenciador de segredos para hospedagem comercial multiusuário.

`.secrets/` e arquivos `.env` são ignorados pelo Git. **Empacotar.ps1** exporta apenas uma lista explícita de arquivos e pastas do código; não inclui `.secrets/`, `.runtime/` nem arquivos arbitrários da raiz. Não inclua essas pastas ao criar um ZIP manualmente. As instâncias de teste usam outra porta e outro cofre.

## Migração da v0.2.0

A v0.2.0 guardava a chave somente na memória e não possuía uma rota para recuperá-la. Por isso, é necessário colar a chave uma vez na nova tela. Depois de salva nesta versão, ela será carregada nas próximas inicializações.

Os arquivos do aplicativo existente foram preservados durante a atualização da bancada, sem nova solicitação à OpenAI. A persistência de segredos é independente da persistência futura dos projetos gerados.

## Verificação

Foram executados testes com chaves fictícias que:

- salvam o segredo e verificam que o arquivo não contém seu texto nem uma mera codificação Base64 da chave;
- recuperam o valor em outra instância do cofre;
- encerram e reiniciam um processo real do backend e confirmam que o segredo continua configurado;
- excluem o segredo, reiniciam novamente e confirmam sua ausência;
- verificam que a API não revela o segredo nem serve seu arquivo;
- verificam que o gerador não contém o campo de senha e que o cadastro fica na página de configurações.

Referência: [proteção de dados do Windows com ProtectedData](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.protecteddata?view=windowsdesktop-9.0).
