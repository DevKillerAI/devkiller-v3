# DevKiller Engine 0.11 — resultados e limite de avanço

## Resultado da etapa

A primeira camada de orquestração foi implementada. Há evidência favorável para recuperação, controle de chamadas e detecção de falhas de interação que o verificador anterior não detectava. O comparativo real não mostrou aumento de qualidade funcional do aplicativo neste pedido: as duas versões cumpriram os mesmos critérios. A ampliação de stack, a automação de reparos e a próxima área do produto permanecem fora desta etapa.

Não foi demonstrado que esta é a melhor arquitetura possível, nem que a geração ficou melhor em geral. O resultado deve ser tratado como validação limitada de mecanismos específicos.

## Comparativo com IA real

Foram realizadas exatamente duas gerações: uma no processo da versão 0.10 e outra na versão 0.11, com o mesmo pedido de controle de despesas, perfil React v2 e modelo configurado `gpt-5.6-luna`. Os arquivos vieram da API por meio do backend do Engine. Não foram editados manualmente para fazer os testes passarem. Não houve chamada de reparo ou repetição de geração.

| Medida | Anterior | Nova camada |
| --- | ---: | ---: |
| Critérios funcionais e de navegador independentes | 12/12 | 12/12 |
| Cenários propostos pela IA e executados pelo próprio Engine | Nenhum | 4/4 |
| Tokens de entrada reportados | 1.855 | 2.111 |
| Tokens de saída reportados, incluindo raciocínio | 7.151 | 7.990 |
| Total reportado | 9.006 | 10.101 |
| Duração registrada da geração até conclusão | 61,1 s | 70,9 s |
| Repetições de chamadas | 0 | 0 |

A nova execução consumiu 12,2% mais tokens totais e levou aproximadamente 9,8 segundos a mais. Tokens não são um valor monetário; não foi feita conversão sem uma tabela de preços validada. Parte da variação de saída foi raciocínio reportado pelo modelo. Um único par não permite atribuir causalmente toda a diferença à orquestração ou estimar um custo médio confiável.

Os critérios independentes cobriram ausência de registros de exemplo, criação de duas despesas, soma, rejeição de valor negativo, filtro, conservação do total ao filtrar, persistência de registros e total, exclusão, atualização da soma, persistência da exclusão e ausência de exceções observadas no navegador. O roteiro foi escrito fora dos aplicativos e usado igualmente nos dois resultados.

Na primeira execução do roteiro, uma linha visual de “lista vazia” foi contada equivocadamente como registro. A inspeção mostrou que não havia despesa cadastrada. O roteiro foi corrigido para contar linhas de registros com ação de exclusão, e o mesmo aplicativo salvo foi reavaliado sem nova chamada à IA. Isso reforça a necessidade de distinguir defeito do teste de defeito do aplicativo.

Evidências originais: [anterior](validation/baseline-live.json), [nova execução](validation/candidate-live.json), [imagem anterior](validation/baseline-live.png), [imagem nova](validation/candidate-live.png). O arquivo de evidência inicial da nova execução foi preservado; pequenos ajustes posteriores de clareza nas mensagens não alteraram seus arquivos gerados.

## Controle e recuperação

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Suíte completa após alterações | 52/52 passaram | [Log](validation/unit-final.log) |
| Recuperação após o ajuste final de inicialização | 13/13 passaram; inclui 1 caso adicional de painel duplicado | [Log](validation/recovery-final.log) |
| Interface existente | 9 casos distintos aprovados, incluindo a reexecução do teste de parada corrigido | [Suíte](validation/browser-final.log), [reexecução](validation/browser-executor-final.log) |
| Painel instalado e preview após reiniciar | HTTP 200; 4/4 cenários; total salvo 5,00 preservado; sem erros observados | [Leitura](validation/panel-release.json) |
| Larguras do painel | 320, 391, 768 e 1.440 px sem transbordamento observado | [Leitura](validation/panel-release.json) |

Os dois primeiros grupos contêm 53 testes distintos; os testes repetidos não foram somados como casos novos. Na bateria de interface, o teste de parada consultava uma porta fixa do painel principal em vez do preview da instância de teste. A asserção foi corrigida para usar o endereço real retornado pela própria instância e passou na reexecução. O problema era o isolamento do teste, não uma falha de parada do aplicativo.

O conjunto anterior de 34 testes passou antes da implementação. A nova suíte inclui testes que interrompem processos reais de teste após salvar a resposta e após confirmar uma versão no SQLite. A retomada ocorre pela interface, sem nova chamada ao provedor simulado e sem duplicar a versão. Outro teste interrompe a operação antes de receber a resposta e comprova que a execução incerta não pode ser reenviada pela rota de retomada.

Também foram verificados: bloqueio de duas execuções concorrentes do mesmo registro; impossibilidade de consumir uma segunda reserva; cancelamento após recebimento; falha de ambiente antes da API sem consumo de chamada; preservação de versão por identificador; conservação dos dados reais enquanto o QA usa seu próprio banco de teste; manutenção dos cenários anteriores durante reparos; e distinção entre rejeição conhecida e resposta incerta.

A inicialização agora adquire as portas antes de recuperar registros: uma segunda abertura do painel não pode reclassificar como interrompida uma execução ainda ativa na primeira instância. Execuções salvas antes da primeira chamada também ficam disponíveis para continuação após reinício. Timeouts de interação são registrados como inconclusivos, para não tratar automaticamente lentidão ou uma falha do teste como defeito funcional.

Um comparativo controlado usa uma página com botão sem ação. A verificação de inicialização antiga passa; o novo cenário clica e compara o valor real, detectando a falha. Isso prova uma capacidade adicional específica do verificador, não cobertura completa de qualquer aplicativo.

Os testes com respostas simuladas são separados dos dois testes com IA real. O script de validação paga fica fora do comando `npm test` e exige execução explícita.

## Limitações e condição para avançar

- A IA ainda propõe o plano de testes junto com o código. Cobertura independente do pedido permanece não verificada; um teste aprovado não significa aplicativo integralmente aprovado.
- A retomada durável cobre geração e preparação. O reparo continua manual e limitado a uma chamada por ação; não é retomado automaticamente após queda.
- Não há orçamento monetário global para uma cadeia de agentes, seleção automática de stack, backend arbitrário ou fila distribuída nesta entrega.
- Registros duráveis reduzem repetição de trabalho conhecido, mas não resolvem a incerteza de cobrança quando a resposta do provedor se perde antes do salvamento local.
- Os dois aplicativos reais pertencem a uma mesma categoria. Para afirmar melhora geral de geração, é necessário comparar categorias diferentes, repetir execuções com orçamento definido e medir regressões, falsos diagnósticos e avaliação visual humana.

**Condição de avanço:** manter esta versão na etapa de validação. Os resultados sustentam as mudanças de controle e verificação implementadas; ainda não sustentam uma afirmação de superioridade geral ou liberação comercial. Nenhuma nova stack foi adicionada nesta etapa.
