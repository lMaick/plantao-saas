# Plantão SaaS — Schema proposto

Este é um desenho para a próxima fase. Os blocos são pseudo-SQL ilustrativos; não devem ser executados nesta missão.

## 1. Convenções

- PostgreSQL com UUID como identificador.
- Todas as tabelas de domínio têm `id`, `user_id`, `created_at` e `updated_at` quando aplicável.
- `user_id` referencia `auth.users(id)` e participa de FKs compostas de ownership.
- Datas são `date`; instantes são `timestamptz`.
- Dinheiro é inteiro em centavos e sempre acompanhado de `currency_code`.
- Remoção de local/contato é arquivamento (`archived_at`), não delete destrutivo quando houver histórico.

## 2. `profiles`

**Propósito:** preferências e metadados mínimos do profissional, separados de Auth.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK; FK para `auth.users(id)` |
| `timezone` | `text` | não |
| `default_currency_code` | `char(3)` | não; default `BRL` |
| `created_at` | `timestamptz` | não |
| `updated_at` | `timestamptz` | não |

Checks: timezone deve ser validado por camada de domínio (ou catálogo futuro); moeda deve ser código suportado pelo MVP. Delete acompanha a política futura de conta.

RLS: usuário só pode SELECT/UPDATE sua própria linha; INSERT fica restrito a fluxo seguro de criação de perfil.

## 3. `locations`

**Propósito:** locais de trabalho reutilizáveis.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK |
| `user_id` | `uuid` | não; FK Auth |
| `name` | `text` | não |
| `kind` | `text` | sim |
| `archived_at` | `timestamptz` | sim |
| `created_at`, `updated_at` | `timestamptz` | não |

Unique sugerida: `(user_id, normalized_name)` para evitar duplicatas acidentais, se a normalização for definida. Índice: `(user_id, archived_at, name)`.

RLS: SELECT/INSERT/UPDATE somente do próprio usuário; DELETE bloqueado como regra de produto quando referenciado, preferindo arquivar.

## 4. `contacts`

**Propósito:** pessoas relacionadas ao plantão ou pagamento.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK |
| `user_id` | `uuid` | não; FK Auth |
| `name` | `text` | não |
| `phone` | `text` | sim |
| `notes` | `text` | sim |
| `archived_at` | `timestamptz` | sim |
| `created_at`, `updated_at` | `timestamptz` | não |

Unique por nome não é obrigatória, pois duas pessoas podem ter o mesmo nome. Índice: `(user_id, archived_at, name)`.

RLS: igual a `locations`; arquivamento preserva referências históricas.

## 5. `shifts`

**Propósito:** plantões agendados, realizados ou cancelados.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK |
| `user_id` | `uuid` | não; FK Auth |
| `location_id` | `uuid` | sim |
| `referrer_contact_id` | `uuid` | sim |
| `starts_at` | `timestamptz` | não |
| `ends_at` | `timestamptz` | não |
| `state` | `text` | não; `scheduled/realized/cancelled` |
| `amount_cents` | `bigint` | sim |
| `currency_code` | `char(3)` | não; default `BRL` |
| `notes` | `text` | sim |
| `created_at`, `updated_at` | `timestamptz` | não |

Checks:

- `ends_at > starts_at`;
- `state` pertence ao conjunto permitido;
- `amount_cents IS NULL` somente para `scheduled`;
- `amount_cents >= 0` quando presente;
- `currency_code` pertence ao conjunto suportado.

FKs compostas `(user_id, location_id)` e `(user_id, referrer_contact_id)` para as entidades do mesmo usuário. Índices: `(user_id, state, starts_at)` para calendário/próximos e `(user_id, state, starts_at)` cobre consultas mensais por período.

RLS: SELECT/INSERT/UPDATE do próprio usuário; DELETE deve ser restrito e não permitido para realizado com efeitos financeiros. A transição de estado realizada é RPC.

## 6. `obligations`

**Propósito:** obrigação gerada por um plantão realizado.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK |
| `user_id` | `uuid` | não; FK Auth |
| `shift_id` | `uuid` | não |
| `amount_due_cents` | `bigint` | não |
| `currency_code` | `char(3)` | não |
| `due_date` | `date` | sim |
| `payer_type` | `text` | não; `location/contact` |
| `payer_location_id` | `uuid` | sim |
| `payer_contact_id` | `uuid` | sim |
| `voided_at` | `timestamptz` | sim |
| `created_at`, `updated_at` | `timestamptz` | não |

Constraints:

- `amount_due_cents > 0`;
- `payer_type = 'location'` exige location preenchido e contact nulo;
- `payer_type = 'contact'` exige contact preenchido e location nulo;
- FK composta `(user_id, shift_id)` para `shifts`;
- FK composta para o local ou contato pagador;
- unique `(user_id, shift_id)` garante plantão com no máximo uma obrigação;
- obrigação só pode ser criada para shift `realized` via RPC/constraint operacional.

Índices: `(user_id, due_date)` para próximos/vencidos; `(user_id, voided_at, due_date)` para obrigações abertas. `received` e `balance` não são colunas armazenadas.

RLS: SELECT/UPDATE do próprio usuário; INSERT preferencialmente somente pela RPC de realização; DELETE proibido para preservar histórico, usando `voided_at` em correção controlada.

## 7. `payments`

**Propósito:** recebimentos parciais ou integrais aplicados a uma obrigação.

| Campo | Tipo | Nulo |
|---|---|---|
| `id` | `uuid` | não; PK |
| `user_id` | `uuid` | não; FK Auth |
| `obligation_id` | `uuid` | não |
| `amount_cents` | `bigint` | não |
| `currency_code` | `char(3)` | não |
| `payment_date` | `date` | não |
| `notes` | `text` | sim |
| `voided_at` | `timestamptz` | sim |
| `created_at`, `updated_at` | `timestamptz` | não |

Checks:

- `amount_cents > 0`;
- moeda igual à moeda da obrigação, garantida por operação/FK composta ou validação transacional;
- pagamento válido não pode fazer a soma superar `amount_due_cents`.

FK composta `(user_id, obligation_id)` impede pagamento de obrigação de outro usuário. Índices: `(user_id, payment_date)` para recebido no mês e `(user_id, obligation_id, voided_at)` para saldo.

RLS: SELECT do próprio usuário; INSERT/UPDATE via RPC transacional; DELETE direto proibido após criação, usando anulação/correção preservável.

## 8. Views e funções propostas

Não são tabelas nem fonte adicional de dados:

- `obligation_financial_status`: soma pagamentos válidos, calcula saldo e estado derivado.
- função de realização de plantão;
- função de registrar pagamento com bloqueio da obrigação;
- função de corrigir valor devido;
- função de anular/corrigir pagamento;
- função/query para “hoje” no timezone do perfil.

## 9. RLS conceitual

Para cada tabela de domínio:

- **SELECT:** `user_id = auth.uid()`.
- **INSERT:** novo `user_id` deve ser `auth.uid()`; referências compostas devem apontar para registros do mesmo usuário.
- **UPDATE:** linha antiga e nova devem pertencer a `auth.uid()`; operações críticas passam por RPC.
- **DELETE:** apenas entidades sem histórico, se permitido; obrigações e pagamentos não têm delete destrutivo.

Uma política de pagamento baseada apenas em `payments.user_id = auth.uid()` é insuficiente. A FK composta para `obligations(user_id, id)` e a RLS da obrigação devem atuar conjuntamente.

## 10. Exclusão e arquivamento

`locations` e `contacts` serão arquiváveis. `shifts` realizados, `obligations` e `payments` serão preservados; correções usam estado de validade/anulação e operações explícitas. A política final de exclusão da conta é decisão pendente antes do lançamento público.

