# Plantão SaaS — Modelo conceitual do domínio

Este documento define o domínio do MVP sem escolher tabelas, SQL, migrations ou schemas de implementação.

## 1. Princípios do modelo

- O usuário é dono e limite de acesso de todos os seus dados.
- **Plantão**, **obrigação financeira** e **pagamento** são conceitos distintos.
- O plantão pode ser agendado sem valor e sem obrigação financeira efetiva.
- Ao ser realizado, deve ter valor definido e originar uma obrigação.
- Estados financeiros são derivados dos valores e datas, não de um `status_financeiro` mutável.
- Valores monetários devem ser tratados em centavos inteiros de uma única moeda do MVP (BRL), nunca em ponto flutuante.

## 2. Entidades

### Usuário/profissional

**Responsabilidade:** representar o profissional autenticado e delimitar seus dados.

**Atributos conceituais:** identidade de acesso, preferências de timezone/moeda quando aplicável.

**Relacionamentos:** possui locais, contatos, plantões, obrigações e pagamentos por propriedade direta ou por cadeia de relacionamento.

**Invariantes:** um usuário só pode consultar e alterar seus próprios registros; nenhuma relação pode atravessar usuários.

### Local de trabalho

**Responsabilidade:** identificar onde o plantão ocorre.

**Atributos conceituais:** nome, tipo opcional, informações de contato/endereço somente quando necessárias.

**Relacionamentos:** pertence a um usuário; pode ser referenciado por muitos plantões.

**Invariantes:** não pode ser usado para acessar dados de outro usuário. Remoção não deve apagar plantões históricos; o conceito deve ser preservado por referência histórica ou substituído por uma marcação de inativo.

### Contato

**Responsabilidade:** identificar uma pessoa relacionada ao plantão ou pagamento.

**Atributos conceituais:** nome, telefone/WhatsApp opcional, observações e papel contextual (por exemplo, repassador ou coordenador).

**Relacionamentos:** pertence a um usuário; pode estar associado a muitos plantões e/ou obrigações como responsável.

**Invariantes:** remover um contato não pode apagar nem invalidar histórico financeiro; vínculos existentes devem permanecer legíveis ou guardar um snapshot textual mínimo.

### Plantão

**Responsabilidade:** registrar o trabalho agendado ou realizado.

**Atributos conceituais:** data/hora inicial, data/hora final, duração derivada, local, valor quando conhecido, observações, indicação de repasse e estado operacional.

**Relacionamentos:** pertence a um usuário; opcionalmente referencia um local; pode referenciar contato que repassou; quando realizado, origina no máximo uma obrigação financeira própria.

**Invariantes:**

- início e fim são obrigatórios para o registro completo;
- fim deve ser posterior ao início em tempo absoluto, permitindo data final no dia seguinte;
- duração é calculada como `fim - início`, sem armazenamento redundante;
- plantão agendado pode não ter valor;
- plantão realizado exige valor devido maior ou igual a zero, mas para gerar obrigação financeira o valor deve ser definido;
- plantão cancelado não pode voltar a ser realizado sem uma ação explícita de correção definida posteriormente.

### Obrigação financeira

**Responsabilidade:** representar quanto é devido ao profissional por um plantão realizado, quem deve pagar e quando a expectativa existe.

**Atributos conceituais:** valor devido, data prevista de pagamento opcional, responsável pelo pagamento, referência ao plantão de origem e estado de validade.

**Relacionamentos:** pertence ao usuário; nasce de exatamente um plantão realizado; possui zero, um ou vários pagamentos; tem exatamente um responsável conceitual, que pode ser um local ou um contato.

**Invariantes:**

- não existe obrigação efetiva para plantão apenas agendado;
- valor devido não pode ser negativo;
- uma obrigação não deve ser duplicada para o mesmo plantão sem uma decisão explícita de ajuste;
- pagamentos válidos pertencem à mesma obrigação e ao mesmo usuário;
- obrigação cancelada não entra nas métricas financeiras.

### Responsável pelo pagamento

O responsável é um papel conceitual, não dois campos mutuamente exclusivos. Sua referência é uma alternativa tipada para **Local** ou **Contato**, com exatamente uma opção por obrigação. A informação deve continuar compreensível se o cadastro referenciado for desativado.

Alternativa futura: uma entidade independente “Parte pagadora” permitiria organizações e pessoas sem reutilizar Local/Contato. Para o MVP, a referência tipada a Local ou Contato é mais simples e suficiente.

### Pagamento

**Responsabilidade:** registrar um recebimento aplicado a uma obrigação.

**Atributos conceituais:** valor recebido, data efetiva do recebimento, observação e estado de validade/correção.

**Relacionamentos:** pertence a exatamente uma obrigação e, por consequência, a um usuário; uma obrigação pode ter zero, um ou vários pagamentos.

**Invariantes:**

- valor deve ser positivo;
- data efetiva deve ser válida no timezone do usuário;
- pagamento corrigido/anulado não participa da soma;
- a soma de pagamentos válidos não pode exceder o valor devido no MVP; um recebimento maior exige correção ou ajuste explícito;
- pagamentos não são apagados silenciosamente quando já fazem parte do histórico.

## 3. Relacionamentos e cardinalidade

- Usuário → Locais: 1:N.
- Usuário → Contatos: 1:N.
- Usuário → Plantões: 1:N.
- Plantão → Local: N:1 opcional (um local pode ter muitos plantões; plantão agendado pode ficar sem local apenas se essa decisão de UX for aprovada).
- Plantão → Contato repassador: N:1 opcional.
- Plantão → Obrigação: 1:0..1; agendado não possui obrigação efetiva, realizado possui exatamente uma se houver valor definido.
- Obrigação → Responsável: N:1, com alternativa tipada Local ou Contato e exatamente um responsável por obrigação.
- Obrigação → Pagamentos: 1:N, inclusive zero pagamentos.

## 4. Estados do plantão

### Estados

- **Agendado:** plantão futuro ou ainda não confirmado como executado; pode ter valor desconhecido e não gera obrigação efetiva.
- **Realizado:** trabalho confirmado; exige horários válidos e valor definido; gera obrigação financeira.
- **Cancelado:** não será executado; não entra em “trabalhado” nem cria obrigação. Deve permanecer no histórico operacional quando já existia.

### Transições válidas

- Agendado → Realizado: somente com horários válidos e valor definido; cria a obrigação e captura o responsável/previsão quando informados.
- Agendado → Cancelado: permitido enquanto não houver efeitos financeiros.
- Realizado → Cancelado: não é cancelamento comum; somente correção explícita, preservando obrigação/pagamentos e exigindo tratamento de saldo.
- Realizado → Realizado: edição limitada, sem apagar pagamentos.

### Transições inválidas

- Cancelado → Realizado automaticamente.
- Agendado → obrigação financeira efetiva sem estar realizado.
- Realizado sem valor.
- Alterar horários de forma que fim não seja posterior ao início.
- Apagar plantão realizado que tenha obrigação ou pagamento como se nunca tivesse existido.

## 5. Motor financeiro conceitual

Para uma obrigação válida:

```text
valor_devido = valor definido no plantão no momento da obrigação
valor_recebido = soma dos pagamentos válidos
saldo = valor_devido - valor_recebido
```

O saldo deve ser sempre maior ou igual a zero no MVP. Considerando `hoje` no timezone do usuário:

| Condição | Estado financeiro derivado |
|---|---|
| saldo > 0 e não existe vencimento | A receber |
| saldo > 0 e hoje ainda é a data prevista | A receber |
| saldo > 0 e hoje é posterior à data prevista | Atrasado |
| saldo > 0, há recebimento e hoje é posterior à data prevista | Parcialmente recebido e atrasado |
| saldo > 0, há recebimento e não está vencido | Parcialmente recebido |
| saldo = 0 | Recebido integralmente |

“A receber” é o rótulo de UX para saldo pendente não vencido; “parcialmente recebido” qualifica que já há pagamentos. “Atrasado” é uma dimensão adicional, não um valor que apaga a informação de parcialidade.

### Semântica de vencimento

A data prevista representa um dia civil no timezone do usuário, não um instante UTC. Durante todo o dia previsto a obrigação não está atrasada. Ela passa a estar atrasada no início do dia civil seguinte, se ainda houver saldo pendente. Sem data prevista, nunca é atrasada, mas pode ser a receber.

### Pagamentos parciais

Cada pagamento reduz o saldo. O recebimento integral ocorre apenas quando o saldo chega a zero. Pagamento maior que o saldo deve ser rejeitado no fluxo normal; para corrigir erro, o pagamento deve ser editado/anulado e recriado, preservando histórico de correção.

## 6. Edições, cancelamento e correção

- Agendado: edição normal, inclusive valor, horários, local e responsável.
- Realizado sem pagamento: permitir correções de dados não financeiros; alterar valor deve atualizar plantão e obrigação na mesma operação, desde que não crie saldo negativo e haja confirmação clara.
- Realizado com pagamento: não alterar silenciosamente o valor devido. Uma operação transacional pode atualizar plantão e obrigação se o novo valor for maior ou igual ao total recebido; se for menor, deve rejeitar até que pagamentos sejam corrigidos explicitamente.
- Plantão agendado futuro sem efeitos financeiros pode ser cancelado, não necessariamente excluído.
- Plantão realizado sem pagamento deve continuar visível como obrigação com saldo integral.
- Plantão com pagamento não deve ser excluído; pode ser corrigido/anulado preservando o histórico.

## 7. Casos extremos

- **Meia-noite:** armazenar início e fim com data e hora; calcular diferença absoluta. 19:00–07:00 do dia seguinte = 12 horas.
- **Pagamento parcial:** múltiplos pagamentos válidos somam-se até o valor devido.
- **Pagamento maior:** rejeitar ou exigir correção explícita; nunca criar saldo negativo.
- **Valor alterado após pagamento:** preservar pagamentos; bloquear alteração silenciosa.
- **Sem vencimento:** saldo pendente não é atrasado.
- **Cancelado:** não compõe métricas de realizado ou financeiro; histórico não desaparece se já houver efeitos.
- **Contato/local removido:** desativar ou preservar snapshot de exibição; nunca quebrar o histórico.
- **Pagamento anterior ao plantão:** permitir apenas se o produto decidir que adiantamentos fazem parte do MVP; recomendação: rejeitar no MVP, pois a regra de negócio ainda não foi aprovada.
- **Arredondamento:** BRL em centavos inteiros; duração pode ser exibida em minutos e formatada em horas/minutos.
- **Timezone:** datas civis e cálculo de atraso usam timezone configurado do usuário; instantes de pagamento devem ser convertidos consistentemente para esse contexto.

## 8. Métricas do dashboard

- **Trabalhado no mês:** soma dos valores dos plantões em estado realizado cuja data/período de início pertence ao mês selecionado. Não inclui agendados ou cancelados. A soma monetária usa o valor devido; a quantidade usa plantões realizados.
- **Recebido no mês:** soma dos pagamentos válidos cuja data efetiva pertence ao mês selecionado, independentemente do mês do plantão.
- **A receber:** soma dos saldos de obrigações válidas não canceladas, sem filtro temporal implícito. Uma tela pode aplicar filtro explícito.
- **Atrasado:** soma dos saldos de obrigações válidas com data prevista anterior ao dia atual no timezone do usuário.
- **Quantidade de plantões realizados:** contagem de plantões em estado realizado no filtro temporal escolhido.
- **Próximos plantões:** plantões agendados com início futuro, ordenados por início ascendente; cancelados não aparecem.

“Trabalhado em agosto e pago em setembro” entra em trabalhado de agosto e recebido de setembro. Nenhuma métrica deve misturar essas datas.

## 9. Privacidade e evolução

O domínio não inclui prontuários, pacientes ou dados clínicos. A futura implementação deve aplicar isolamento rigoroso por usuário, especialmente com RLS, e coletar somente dados necessários. Notificações podem consultar vencimento e saldo no futuro, mas não são parte deste modelo operacional do MVP.
