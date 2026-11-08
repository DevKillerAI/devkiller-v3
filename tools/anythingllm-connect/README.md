# Conexão local com o AnythingLLM

Tela independente do gerador. Iniciar com `node tools/anythingllm-connect/server.mjs` e abrir http://127.0.0.1:4312/.

A chave é validada em `http://127.0.0.1:3001/api/v1/auth` e depois salva por Windows DPAPI (CurrentUser) em `%LOCALAPPDATA%/DevKiller/secrets/anythingllm/anythingllm.dpapi`. Não é salva no projeto, no navegador ou na base de RAG. A proteção está vinculada à conta do Windows; não isola o segredo de outros processos autorizados dessa mesma conta.

A página não possui função de revelar a chave. Uma substituição inválida ou um salvamento malsucedido preserva o segredo anterior. Não há logs de requisição, corpos ou respostas do AnythingLLM. O servidor aceita apenas loopback, confere Host/Origin e exige token por sessão para gravações.

Uma futura integração pode importar `anythingLLMVault` de server.mjs e usar `await anythingLLMVault().load()` exclusivamente no backend. Não imprimir esse retorno, colocá-lo em prompts ou em argumentos de processos. Esta tela apenas configura a credencial; não ativa o RAG nem altera o app da cafeteria.

Verificação: `node tools/anythingllm-connect/verify.mjs`. Usa chave sintética, validador simulado e cofre temporário; cobre proteção HTTP, fluxo no navegador, criptografia real do Windows e preservação em falhas. Não chama a API real com credenciais de teste.
