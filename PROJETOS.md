# Aplicativos salvos no PC — v0.6.0

Cada novo pedido cria automaticamente um projeto e um arquivo SQLite próprio, em `projects/4310/<identificador>/application.sqlite`. O identificador é criado pelo backend. Nenhuma instalação de servidor de banco é necessária: o pacote usa o módulo SQLite do Node.js 24.

## O que fica salvo

- Nome, descrição, datas e pedido original.
- Arquivos completos de cada versão recebida, antes de tentar abrir seu preview.
- Histórico de geração e correção: modelo, resultado, limitações, consumo informado e horários.
- Diagnósticos e versão selecionada para reabrir.
- Dados JSON do aplicativo, em uma área separada do mesmo banco.

Os testes antigos não são migrados. A nova biblioteca começa vazia. A chave OpenAI continua protegida separadamente pelo Windows e não é copiada para os bancos dos aplicativos.

## Como usar

Descreva um novo aplicativo e clique em **Gerar aplicativo**. O pedido já fica salvo antes da chamada; os arquivos são guardados quando a resposta válida chega. Na seção **Meus aplicativos**, use **Abrir aplicativo** ou **Informações e versões**. Reabrir usa os arquivos do PC e não chama a IA.

Fechar o painel encerra a execução temporária, mas preserva os bancos. Ao abrir novamente, escolha um aplicativo na lista. Uma geração interrompida é registrada como interrompida, sem repetição automática. A contagem de consumo pode estar incompleta se a conexão caiu antes de a API informá-la.

Cada pedido de geração cria um projeto novo. Publicar arquivos importados atualiza o projeto selecionado; use **Novo aplicativo** para iniciar outro. Reiniciar o preview não cria uma cópia do código. Correções e publicações conservam as versões salvas, mesmo se a nova tentativa não abrir.

**Voltar a uma versão restaura somente o código.** Os dados atuais do aplicativo continuam no banco. Ainda não há migração automática de formatos entre versões nem recuperação de registros apagados pelo próprio aplicativo.

## Banco disponível ao código gerado

O gerador instrui a IA a incluir o script local `/__devkiller/db.js` e usar:

```js
const estado = await DevKillerDB.get('estado'); // null quando ainda não existe
await DevKillerDB.set('estado', { tarefas: [] });
await DevKillerDB.remove('estado');
```

O aplicativo deve carregar os dados antes de modificá-los, aguardar o salvamento e mostrar eventuais erros ao usuário. O banco recebe JSON por uma API limitada; o aplicativo não executa SQL nem acessa o banco de outro projeto. A integração fornecida e seu percurso foram testados; o uso correto dela em cada aplicativo gerado continua sujeito à validação desse aplicativo.

Limites desta etapa: 256 KB por registro, 1.000 registros e 10 MB de dados JSON por aplicativo. Código e histórico são armazenados separadamente e não participam desse limite de dados. Não há limite global de disco nem limpeza automática do histórico.

Cada aplicativo tem um endereço local próprio, com porta reservada no banco, separando também o armazenamento dos navegadores. Se a porta estiver ocupada ao reabrir, o painel informa o problema e mantém os arquivos salvos. O QA usa armazenamento descartável em memória e não grava no banco real. Portas fixas 4311/4314 encaminham o uso normal ao endereço do aplicativo; a verificação interna usa uma credencial distinta para acessar seu armazenamento descartável.

Aplicativos antigos ou importados que usem apenas localStorage não são convertidos automaticamente: seus dados continuam vinculados ao navegador. Os pedidos novos recebem as instruções de integração com o banco do PC.

## Cópia dos projetos

Com o painel encerrado, copie a pasta `projects/4310` para guardar uma cópia de todos os bancos. Uma cópia no mesmo PC não protege contra perda do disco. O ZIP do gerador exclui projetos, dados, arquivos temporários e segredos; ele distribui apenas o programa. O uso desta etapa é local e individual, sem sincronização em nuvem ou autenticação multiusuário.

Referência técnica: [SQLite no Node.js](https://nodejs.org/api/sqlite.html).
