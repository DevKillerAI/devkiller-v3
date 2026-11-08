# ON AIR — comparação após AppSpec informativa

Data: 22/09/2026. Geração feita pelo DevKiller MVP, sem edição manual do código gerado.

- MVP novo: 6beeec31-c39d-4848-a196-59afa71cacee
- Engine novo: 6e412bd7-e97b-4ffb-8b0f-03c175ef0d52, versão 2
- Preview: http://127.0.0.1:50823/
- Referência anterior: http://127.0.0.1:52333/
- Os quatro campos do briefing são idênticos. Hash: aa3021e1ecee75e3f37d56b62f35532a245ae68ff329b0fc8111102d5f9a2c7b.

## Comparação e limites

A versão anterior usou GPT-5.6 Luna / React v4. A nova usou GPT-5.6 Sol / Efficient / React v5. Não é um experimento isolado das mudanças AppSpec: modelo, perfil, stack e contexto evoluíram.

Anterior: 222,7 segundos, 88.872 tokens registrados. Nova: 493,4 segundos desde o primeiro início, incluindo aproximadamente um minuto de Docker desligado; cerca de sete minutos após retomada, 219.947 tokens registrados. Tokens não são preço em dólares; não foi consultado o faturamento do provedor. A nova execução inclui o refinamento visual já existente, com uma chamada de correção aceita.

## Evidência funcional

Na versão nova foram verificados pelo navegador: validação de título/duração vazios, criação de episódio, busca pelo título, adição de segmento de 5 minutos, total 32 para alvo 30 e aviso de 2 minutos acima, reordenação preservada após reload, roteiro com início 00:00 / 03:00 / 23:00 / 28:00 e persistência dos registros de teste. O projeto de teste contém “Comparison check” e “Verification segment”.

QA automático final: dois cenários passaram; um ficou pendente visual por comparar Ready com READY. Esse caso não foi convertido em reprovação funcional. Não foram verificados integralmente impressão, exclusão, todas as falhas de rede ou acessibilidade.

## Avaliação visual

Melhora moderada: o roteiro ocupa o centro da experiência e os detalhes passam a uma janela de edição. A versão anterior priorizava um formulário grande antes dos segmentos. Nova versão tem contraste mais forte na navegação e painel de duração visível. Ainda há título grande, controles nativos pouco refinados e bastante espaço vertical, sobretudo no celular. Não é um salto para acabamento excepcional.

## Resultado das duas mudanças

AppSpec: criada e persistida com 16 requisitos, revisão 90bbd428998be8432eb106ddc8cd5afac702a5cd95e9dbc984c67f4860f85db8. RAG: provedor AnythingLLM e contextos especializados registrados.

Relatório informativo: 16 itens não verificados. Os cenários usaram frases mais curtas que os critérios e o vínculo exige igualdade exata. Assim, evidências reais não foram associadas a requisitos. A camada permaneceu não bloqueante, mas sua utilidade ficou abaixo da esperada. Próximo ajuste sugerido: IDs explícitos de requisitos nos cenários, mantendo a distinção entre evidência parcial e cobertura completa. Não alterar para similaridade textual nem marcar sucesso artificialmente.

Conclusão: o app está utilizável e mais organizado, porém não há evidência suficiente de benefício causal das duas mudanças; o custo/tempo aumentou e a associação de evidências precisa ser corrigida. Nenhuma mudança no gerador foi feita durante esta comparação para melhorar artificialmente o resultado.
