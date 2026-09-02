# Registro de decisões — Plantão SaaS

Este documento registra decisões confirmadas para evitar que escolhas importantes sejam perdidas entre as fases do projeto. Decisões ainda não aprovadas devem permanecer em [PRODUCT.md](C:/Users/Maick/Documents/plantao%20saas/PRODUCT.md) como **DECISÃO PENDENTE**.

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

## Decisões pendentes

As decisões pendentes estão consolidadas na seção [Decisões pendentes de PRODUCT.md](C:/Users/Maick/Documents/plantao%20saas/PRODUCT.md) e nas questões de implementação explicitadas em [docs/DOMAIN.md](C:/Users/Maick/Documents/plantao%20saas/docs/DOMAIN.md).
