# Plantão SaaS — Arquitetura técnica proposta

Este documento descreve a arquitetura do MVP. Não contém implementação, SQL executável, migrations ou configuração de serviços.

## 1. Visão geral

O MVP será um monólito web em Next.js com App Router, TypeScript, Tailwind CSS e shadcn/ui, publicado na Vercel e usando Supabase para Auth e PostgreSQL.

```text
Navegador mobile/desktop
        |
Next.js App Router
  Server Components / Route Handlers / Server Actions
        |
Supabase Auth + cliente server-side
        |
PostgreSQL + constraints + RLS
```

Não haverá microserviços, filas, event sourcing, gateway de pagamento ou notificações externas no MVP.

## 2. Responsabilidades

### Frontend

- Renderizar dashboard, plantões, calendário e financeiro.
- Validar entradas para feedback rápido, sem substituir as validações do banco.
- Exibir estados financeiros derivados.
- Enviar datas/hora com contexto de timezone e valores monetários em formato seguro.

### Camada Next.js

- Autenticar a requisição e obter a sessão do Supabase.
- Orquestrar casos de uso, sem aceitar `user_id` arbitrário vindo do cliente.
- Usar consultas server-side para leituras protegidas.
- Encaminhar operações críticas para funções transacionais/RPC.
- Normalizar erros de constraints para mensagens de domínio compreensíveis.

### PostgreSQL/Supabase

- Ser fonte de verdade para dados, integridade referencial e invariantes simples.
- Aplicar RLS em todas as tabelas de domínio.
- Garantir atomicidade de transições financeiras.
- Derivar estados financeiros por view ou query reutilizável, nunca por coluna mutável.

## 3. Auth e perfil

Supabase Auth será a identidade. A tabela `profiles` será um perfil 1:1 opcionalmente expandível, com `id` igual ao `auth.users.id`, timezone IANA e moeda padrão. Dados operacionais não devem ser colocados em `auth.users` além do necessário para autenticação.

`auth.uid()` é a única fonte de identidade para RLS. A aplicação nunca confiará em um `user_id` enviado pelo navegador.

## 4. Ownership

Todas as tabelas de domínio (`locations`, `contacts`, `shifts`, `obligations`, `payments`) terão `user_id` explícito, mesmo quando a propriedade pudesse ser inferida.

Motivos:

- RLS simples e legível;
- índices e consultas diretas por usuário;
- prevenção de confusão em joins;
- defesa em profundidade contra FKs encadeadas incorretas;
- facilidade para exportação e exclusão futura.

Além disso, cada tabela alvo de uma FK composta terá UNIQUE `(user_id, id)`, e as FKs compostas `(user_id, id)` garantirão que referências entre entidades pertençam ao mesmo usuário. RLS e ownership explícito não substituem um ao outro.

## 5. Leitura e escrita

### Leituras

Consultas server-side com filtros por usuário e RLS. Uma view de leitura financeira pode centralizar `valor_recebido`, `saldo` e estado derivado. No início, views e queries com índices são suficientes; materialized views não são necessárias.

### Escritas

- CRUD simples de locais, contatos e plantões agendados pode usar Route Handlers ou Server Actions.
- Marcar plantão como realizado + criar obrigação deve ser uma operação atômica única.
- Registrar, corrigir ou anular pagamento deve recalcular/validar o saldo dentro da mesma transação.
- Alterar valor devido após pagamentos deve ocorrer por operação transacional própria.
- O valor do plantão é estimativa/histórico enquanto agendado; após realização, `obligations.amount_due_cents` é a fonte financeira exclusiva. A operação de correção mantém a informação histórica do plantão sincronizada na mesma transação.
- A restrição de valor do plantão é condicional ao estado: valores informados são positivos; somente `realized` exige valor não nulo; `scheduled` e `cancelled` podem permanecer sem valor.

## 6. Operações atômicas

As operações abaixo devem ser PostgreSQL functions/RPC ou chamadas server-side que executem uma transação única; a recomendação é RPC para que o bloqueio e as constraints fiquem próximos dos dados:

1. **Realizar plantão:** validar estado, horários e valor; alterar o estado e criar a única obrigação.
2. **Registrar pagamento:** bloquear a obrigação (`FOR UPDATE` conceitualmente), somar pagamentos válidos, rejeitar excesso e inserir o pagamento.
3. **Corrigir valor devido:** bloquear obrigação, verificar total recebido e aceitar somente `novo amount_due_cents >= soma dos pagamentos válidos`; nunca reduzir, apagar ou anular pagamentos automaticamente. Atualizar o valor histórico do shift na mesma transação.
4. **Corrigir/anular pagamento:** atualizar sua validade e validar novamente que o saldo não fique negativo.
5. **Correção controlada de realizado para cancelado:** preservar obrigação e pagamentos e exigir regra explícita para saldo; não é exclusão.
6. **Validar data de pagamento:** rejeitar `payment_date` anterior à data civil de início do plantão no timezone do perfil.

A aplicação não deve fazer “update e depois insert” em duas requisições independentes para os casos acima.

## 7. Datas e timezone

- Início e fim do plantão: `timestamptz`, representando instantes reais.
- Pagamento: `date`, representando a data financeira informada pelo usuário.
- Vencimento: `date`, com semântica de dia civil, não instante UTC.
- Perfil: timezone IANA, por exemplo `America/Sao_Paulo`, com default de produto definido na implementação.

Ao receber um horário local, a aplicação combina data, hora e timezone do perfil e converte para `timestamptz`. Na UI, timestamps são convertidos de volta ao timezone do usuário. A duração é `fim - início`.

O atraso compara `current_date` no timezone do usuário com `due_date`: na própria data de vencimento não atrasa; começa no dia seguinte. Consultas que usam o relógio devem calcular o “hoje” local explicitamente, sem depender do timezone da sessão do banco. A data de pagamento deve ser igual ou posterior à data civil de início do plantão; essa regra é validada pela RPC.

## 8. Dinheiro

Usar inteiros em centavos (`bigint` ou `integer` conforme limite definido) e `currency_code` de três letras, inicialmente `BRL`. Não usar `float` nem `double precision`. A moeda da obrigação deve ser persistida para impedir que uma futura alteração da moeda padrão reinterprete históricos. Não haverá conversão cambial no MVP.

O frontend envia valores normalizados; a camada de domínio converte e valida centavos antes da escrita. Formatação para BRL ocorre somente na apresentação.

Depois de realizado, nenhum saldo ou métrica financeira deve ser recalculado apenas a partir de `shifts.amount_cents`; o valor devido da obrigação prevalece.

## 9. Responsável pelo pagamento

Implementar a alternativa simples tipada:

- `payer_type = 'location'` com `payer_location_id`; ou
- `payer_type = 'contact'` com `payer_contact_id`.

Constraints devem exigir exatamente um tipo e o ID correspondente. FKs compostas `(user_id, payer_location_id)` e `(user_id, payer_contact_id)` garantem ownership. Uma entidade abstrata de contraparte seria mais extensível, porém prematura para o MVP.

## 10. Status financeiro derivado

Uma view (ou query compartilhada inicialmente) deve calcular:

```text
received = SUM(valid payments)
balance = amount_due - received
```

e derivar `received`, `partially_received`, `overdue` e `partially_received_overdue` conforme balance, `due_date` e hoje local. A view é uma conveniência de leitura; as invariantes de saldo são protegidas por constraints e transações de escrita.

## 11. Dashboard

Uma chamada server-side pode executar consultas agregadas independentes:

- trabalhado no mês: shifts realizados e sua data/período;
- recebido no mês: pagamentos válidos por `payment_date`;
- a receber: saldo de obrigações válidas;
- atrasado: saldo de obrigações com `due_date` anterior ao hoje local;
- quantidade realizada: count de shifts realizados no período;
- próximos plantões: shifts agendados futuros ordenados por início;
- próximos vencimentos: obrigações abertas ordenadas por `due_date`, limitadas ao horizonte de UI.

Cada consulta filtra `user_id` e exclui cancelados/obrigações inválidas conforme a regra. Não haverá otimização prematura.

## 12. Organização futura do Next.js

Uma organização inicial possível:

```text
app/
  (auth)/
  (app)/
  api/
components/
lib/
  domain/
  supabase/
  queries/
  validations/
```

Componentes visuais não devem conter regras financeiras. Queries e casos de uso devem centralizar derivação, validações de entrada e chamadas RPC.

## 13. Fronteiras de segurança

- RLS obrigatória em todas as tabelas de domínio.
- SELECT/UPDATE/DELETE somente quando `user_id = auth.uid()`.
- INSERT exige `user_id = auth.uid()`; idealmente o banco define/valida o valor.
- Relações encadeadas usam FKs compostas por ownership, não apenas IDs.
- Um pagamento com `user_id` correto, mas obrigação de outro usuário, deve falhar na FK composta e na política RLS.
- Nunca expor service role key no navegador.
- Dados clínicos de pacientes não fazem parte do domínio.

## 14. RPCs financeiras

A migration financeira implementa `realize_shift`, `register_payment`, `correct_obligation_amount`, `void_payment` e `correct_payment` como operações atômicas `SECURITY DEFINER`. Cada função exige usuário autenticado por `auth.uid()`, não recebe `user_id` do cliente, usa `set search_path = ''` e limita `EXECUTE` à role `authenticated`.

`register_payment` bloqueia a obrigação com `FOR UPDATE` antes de somar pagamentos válidos (`voided_at IS NULL`), impedindo overpayment sob concorrência. A data mínima do pagamento é comparada à data civil de `starts_at` convertida no timezone armazenado em `profiles`.

Como as tabelas financeiras não concedem INSERT e não concedem UPDATE direto de valores financeiros, a Data API não pode contornar as operações transacionais. UPDATE direto de `shifts` também é revogado para impedir realização sem obrigação; a realização ocorre somente em `realize_shift`.

Um trigger complementar rejeita INSERT direto de `shifts` com estado `realized`, mantendo a obrigação como efeito obrigatório da operação oficial de realização.

Para evitar ciclos de locks, operações que envolvem obrigação e pagamento seguem a ordem `obligation -> payment`: `register_payment` bloqueia a obrigação, e `void_payment`/`correct_payment` identificam a obrigação, bloqueiam-na e só então bloqueiam o pagamento. `correct_obligation_amount` mantém `obligation -> shift`, enquanto `realize_shift` usa `shift -> criação da obligation`.
