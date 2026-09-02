# Registro de decisões — Plantão SaaS

Este documento registra decisões confirmadas para evitar que escolhas importantes sejam perdidas entre as fases do projeto. Decisões ainda não aprovadas devem permanecer em [PRODUCT.md](../PRODUCT.md) como **DECISÃO PENDENTE**.

## Decisões confirmadas

### D-001 — Foco no profissional individual

- **Status:** Confirmada pela missão inicial.
- **Decisão:** O cliente principal do MVP é o profissional individual de saúde.
- **Implicação:** O produto não será inicialmente uma ferramenta de gestão hospitalar, RH ou criação de escalas institucionais.

### D-002 — Núcleo do domínio financeiro

- **Status:** Confirmada pela missão inicial.
- **Decisão:** O conceito central é **Plantão → obrigação financeira → pagamento**.
- **Implicação:** Registrar o plantão deve alimentar o acompanhamento financeiro, sem separar o registro de trabalho do valor a receber.

### D-003 — MVP simples e monolítico

- **Status:** Direção preferencial confirmada; detalhes de implementação ainda serão definidos.
- **Decisão:** Priorizar uma aplicação monolítica, simples, responsiva e mobile-first, sem microserviços ou infraestrutura adicional por especulação.
- **Implicação:** A arquitetura deve otimizar velocidade de entrega, clareza e baixo custo operacional.

### D-004 — Documentação antes da implementação

- **Status:** Confirmada pela missão inicial.
- **Decisão:** Esta etapa produz documentação e não implementa funcionalidades, banco de dados, Supabase ou telas.
- **Implicação:** As decisões pendentes devem ser resolvidas antes da modelagem técnica detalhada.

### D-005 — Plantões agendados e realizados

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** O domínio suporta plantões agendados, realizados e cancelados. Agendados podem não ter valor; realizados exigem valor definido.
- **Implicação:** Um plantão agendado não cria obrigação financeira efetiva. A transição para realizado cria uma obrigação.

### D-006 — Horários e duração

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** O usuário informa início e fim; a duração é calculada, inclusive atravessando a meia-noite.
- **Implicação:** Duração não deve ser uma entrada independente redundante.

### D-007 — Responsável tipado

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** Cada obrigação possui um responsável conceitual, que é alternativamente um local ou um contato.
- **Implicação:** Evitar campos mutuamente exclusivos sem semântica; preservar a referência histórica quando cadastros forem desativados.

### D-008 — Obrigação e pagamentos separados

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** Obrigação financeira é separada conceitualmente do plantão e pode possuir zero, um ou vários pagamentos.
- **Implicação:** O MVP suporta pagamentos parciais sem transformar o domínio em contabilidade empresarial.

### D-009 — Status financeiro derivado

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** Valor devido, pagamentos válidos, saldo, vencimento e data atual determinam o estado financeiro.
- **Implicação:** Não usar `status_financeiro` mutável como fonte de verdade.

### D-010 — Métricas mensais por data apropriada

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** “Trabalhado” usa a data do plantão realizado; “recebido” usa a data efetiva dos pagamentos; “a receber” considera saldos pendentes sem filtro implícito de mês.
- **Implicação:** Um plantão pode pertencer ao trabalho de um mês e ao recebido de outro.

### D-011 — Sem notificações externas no MVP

- **Status:** Confirmada pelo CEO na Missão 1.
- **Decisão:** O MVP destaca pagamentos próximos, vencendo e atrasados dentro do sistema; push, e-mail e WhatsApp ficam fora.
- **Implicação:** O domínio deve permitir evolução futura sem exigir infraestrutura de notificação agora.

### D-012 — Preservação de histórico financeiro

- **Status:** Direção confirmada pelo CEO na Missão 1.
- **Decisão:** Cancelamento e correção devem preservar registros com efeitos financeiros; exclusões destrutivas devem ser evitadas.
- **Implicação:** Pagamentos não podem desaparecer ou ser alterados silenciosamente.

### D-013 — Ownership explícito

- **Status:** Decidida na Missão 2.
- **Decisão:** Todas as entidades de domínio terão `user_id` explícito, inclusive obrigações e pagamentos cuja propriedade poderia ser inferida.
- **Implicação:** RLS, índices, consultas e FKs compostas usarão ownership direto como defesa em profundidade.

### D-014 — Perfil separado da identidade

- **Status:** Decidida na Missão 2.
- **Decisão:** Supabase Auth será a identidade; `profiles` armazenará apenas preferências e metadados mínimos, em relação 1:1 com `auth.users`.
- **Implicação:** Dados operacionais não serão acoplados a campos de autenticação.

### D-015 — Datas, timezone e moeda

- **Status:** Decidida na Missão 2.
- **Decisão:** Início/fim de plantões usam `timestamptz`; pagamento e vencimento usam `date`; o perfil possui timezone IANA; dinheiro usa inteiros em centavos e código de moeda.
- **Implicação:** Vencimento é dia civil no timezone do usuário e não há conversão cambial no MVP.

### D-016 — Responsável tipado

- **Status:** Decidida na Missão 2.
- **Decisão:** A obrigação referencia exatamente um local ou um contato pagador, com `payer_type` e constraints/FKs correspondentes.
- **Implicação:** Não será criada uma entidade abstrata de contraparte no MVP.

### D-017 — Cardinalidade e operações financeiras

- **Status:** Decidida na Missão 2.
- **Decisão:** Unique por `(user_id, shift_id)` garante no máximo uma obrigação por plantão; pagamentos são múltiplos; realização, pagamento e correções críticas são transacionais.
- **Implicação:** RPC/funções PostgreSQL serão usadas para impedir estados intermediários e excesso por concorrência.

### D-018 — Status derivado

- **Status:** Decidida na Missão 2.
- **Decisão:** A camada de leitura usará view/query compartilhada para derivar recebido, saldo e atraso.
- **Implicação:** Não haverá coluna mutável de status financeiro como fonte de verdade.

### D-019 — Arquivamento de cadastros

- **Status:** Decidida na Missão 2.
- **Decisão:** Locais e contatos referenciados serão arquivados, não excluídos destrutivamente.
- **Implicação:** Histórico permanece legível e novos plantões podem deixar de usar cadastros arquivados.

### D-020 — Local obrigatório

- **Status:** Decidida pelo CEO na Missão 2.1.
- **Decisão:** Todo plantão deve possuir local; o contato repassador continua opcional.
- **Implicação:** `shifts.location_id` será `NOT NULL` e terá FK composta com ownership.

### D-021 — Valor por estado e fonte financeira

- **Status:** Decidida pelo CEO na Missão 2.1.
- **Decisão:** Plantão agendado ou cancelado pode ter valor nulo ou positivo; realizado exige valor positivo. Ao realizar, a obrigação copia o valor e torna-se a fonte financeira.
- **Implicação:** A regra não é “nulo somente para agendado”; alterações posteriores passam pela operação transacional de obrigação.

### D-022 — Pagamento sem adiantamento

- **Status:** Decidida pelo CEO na Missão 2.1.
- **Decisão:** A data financeira do pagamento deve ser igual ou posterior à data civil de início do plantão.
- **Implicação:** A RPC de pagamento valida a data usando o timezone do perfil e a cadeia obrigação → plantão.

### D-023 — Correção de obrigação com pagamentos

- **Status:** Decidida pelo CEO na Missão 2.1.
- **Decisão:** Alteração do valor devido exige operação transacional e `novo amount_due_cents >= soma dos pagamentos válidos`.
- **Implicação:** Nenhum pagamento é reduzido, apagado ou anulado silenciosamente.

### D-024 — Operações financeiras transacionais

- **Status:** Implementada na Missão 5A.
- **Decisão:** Realização, registro, correção e anulação financeira usam RPCs atômicas com ownership derivado de `auth.uid()`, locks de obrigação quando o saldo é calculado e preservação de histórico.
- **Implicação:** `obligations` e `payments` não aceitam INSERT/UPDATE financeiro direto pela Data API; `shifts` não pode ser atualizado diretamente para `realized`.

## Decisões pendentes

As decisões pendentes estão consolidadas na seção [Decisões pendentes de PRODUCT.md](../PRODUCT.md) e nas questões de implementação explicitadas em [docs/DOMAIN.md](DOMAIN.md).
