# Plantão SaaS — Especificação do Produto

> Documento-fonte da visão e do escopo inicial do produto.  
> Nome interno temporário: **Plantão SaaS**. O nome comercial será definido posteriormente.

## 1. Visão

O Plantão SaaS será uma aplicação web, responsiva e mobile-first para profissionais de saúde que trabalham por plantões ou serviços avulsos. O sistema centraliza o registro do trabalho realizado e o acompanhamento do dinheiro relacionado a ele:

**Plantão → obrigação financeira → pagamento**

O produto deve permitir que o profissional saiba, com clareza:

- onde trabalhou;
- quando e quanto trabalhou;
- quanto tem para receber;
- quando deveria receber;
- quem é responsável por cada pagamento;
- quais valores já foram recebidos e quais estão atrasados.

O cliente principal é o profissional individual. O produto não é, no MVP, um sistema de gestão hospitalar nem uma ferramenta para hospitais criarem escalas institucionais.

## 2. Público-alvo

### Público inicial

Profissionais de saúde que recebem por plantão ou serviço, incluindo:

- médicos;
- enfermeiros;
- fisioterapeutas;
- dentistas;
- técnicos;
- outros profissionais em situação semelhante.

### Características do público

O usuário pode trabalhar em vários locais, ter diferentes responsáveis por pagamento e combinar condições distintas. Pode também assumir o plantão de outra pessoa. Em geral, hoje combina WhatsApp, agenda, calendário, notas, planilhas e memória para controlar essas informações.

## 3. Problema

O controle fragmentado favorece:

- esquecimento de plantões realizados;
- perda de valores e condições combinadas;
- falta de visibilidade sobre o total a receber;
- esquecimento de datas previstas de pagamento;
- dificuldade para identificar atrasos;
- dificuldade para saber quem deve cada valor;
- dificuldade para comparar ganhos por mês ou local;
- dificuldade para cobrar pagamentos pendentes.

## 4. Proposta de valor

Registrar um plantão uma única vez e obter automaticamente o acompanhamento financeiro correspondente, em uma experiência rápida e compreensível, sem exigir conhecimento contábil.

O MVP deve resolver excepcionalmente bem:

> **“Trabalhei. Quanto tenho para receber e quando vou receber?”**

## 5. Entidades conceituais

Estas são entidades de domínio, não uma definição final de banco de dados:

- **Usuário/profissional:** pessoa que utiliza o sistema e é dona dos seus registros.
- **Local de trabalho:** hospital, clínica, UPA ou outro local onde o serviço ocorre.
- **Contato:** pessoa relacionada ao plantão ou ao pagamento, como quem repassou o plantão, coordenador, responsável financeiro ou intermediário.
- **Plantão:** trabalho agendado, realizado ou cancelado, com data/hora inicial e final, local, valor quando conhecido e observações.
- **Responsável pelo pagamento:** pessoa ou organização que deve pagar o plantão; pode ser o local, um contato ou outro responsável informado pelo usuário.
- **Obrigação financeira:** valor devido gerado por um plantão realizado, com previsão opcional, responsável e saldo derivado.
- **Pagamento:** recebimento parcial ou integral aplicado à obrigação; uma obrigação pode ter vários pagamentos.

Um plantão agendado pode existir sem valor. Para ser realizado, deve possuir valor definido e originar uma obrigação financeira. O modelo conceitual detalhado está em [docs/DOMAIN.md](C:/Users/Maick/Documents/plantao%20saas/docs/DOMAIN.md).

## 6. Fluxos principais

### 6.1 Primeiro uso

1. Usuário cria uma conta.
2. Cadastra um local de trabalho.
3. Opcionalmente cadastra um contato.
4. Registra um plantão.
5. Informa valor (obrigatório para realização) e previsão opcional de pagamento.
6. Informa ou seleciona o responsável pelo pagamento.
7. O sistema cria/acopla a obrigação financeira ao plantão.

### 6.2 Registro de plantão

O fluxo deve priorizar velocidade e reaproveitamento de dados já cadastrados. Deve permitir informar, conforme necessário:

- data;
- horário inicial e final ou duração;
- local;
- valor;
- responsável pelo pagamento;
- previsão de pagamento;
- observações;
- indicação de plantão assumido de terceiro e contato relacionado.

### 6.3 Acompanhamento financeiro

O usuário visualiza valores:

- **A receber:** obrigação com saldo pendente e sem vencimento ultrapassado;
- **Parcialmente recebido:** obrigação com pagamentos e saldo pendente;
- **Atrasados:** obrigação com saldo pendente após o fim da data prevista;
- **Recebidos:** obrigação cujo saldo chegou a zero.

Ao confirmar um pagamento, o dashboard e os históricos devem refletir a atualização.

### 6.4 Consulta

O usuário pode consultar:

- histórico de plantões;
- calendário de plantões;
- pagamentos por local;
- pagamentos por responsável;
- próximos plantões;
- pagamentos próximos e atrasados.

## 7. Escopo do MVP

### Conta e acesso

- criação de conta;
- autenticação;
- separação dos dados por usuário.

### Cadastros

- locais de trabalho;
- contatos opcionais;
- responsável pelo pagamento relacionado ao plantão.

### Plantões

- cadastrar;
- editar;
- visualizar;
- consultar histórico;
- cancelar ou corrigir conforme as regras de preservação de histórico;
- registrar data, horário/duração, local, valor, observações, previsão de pagamento e situação financeira.

### Financeiro

- criação da obrigação financeira a partir do plantão;
- visualização de recebido, a receber e atrasado;
- registro manual de um ou vários pagamentos, inclusive parciais;
- histórico;
- filtros ou agrupamentos por local e responsável, dentro de uma complexidade compatível com o MVP.

### Dashboard

- recebido no mês;
- total a receber;
- total atrasado;
- quantidade de plantões;
- próximos plantões;
- pagamentos próximos;
- pagamentos atrasados.

### Calendário

- visualização dos plantões registrados.

## 8. Fora do escopo do MVP

- folha de pagamento;
- gestão hospitalar;
- criação de escalas institucionais;
- RH;
- prontuário e dados clínicos de pacientes;
- faturamento hospitalar;
- integrações complexas com hospitais;
- emissão fiscal completa;
- contabilidade completa;
- marketplace de plantões;
- chat interno;
- aplicativo nativo separado;
- microserviços;
- IA sem necessidade clara;
- cobrança automatizada ou integração obrigatória com WhatsApp.

Cobrança rápida pelo WhatsApp pode ser uma evolução, especialmente para plantões repassados por terceiros, mas não é requisito do MVP.

## 9. Princípios de produto e UX

- **Simplicidade:** o usuário não deve precisar entender conceitos contábeis.
- **Mobile-first:** registrar e consultar devem funcionar muito bem em telas pequenas.
- **Velocidade:** minimizar toques, campos e navegação no registro de um plantão.
- **Clareza financeira:** distinguir visualmente recebido, a receber e atrasado.
- **Contexto:** manter juntos o plantão, a obrigação e o responsável pelo pagamento.
- **Reutilização:** locais, contatos e condições recorrentes devem poder ser reaproveitados; sugestões automáticas são evolução, não requisito atual.
- **Escala disciplinada:** preparar o domínio para crescer sem introduzir complexidade de ERP no MVP.
- **Privacidade:** os registros do profissional devem ser isolados e protegidos.

Métrica interna prioritária: tempo necessário para registrar um plantão.

## 10. Regras de negócio já identificáveis

1. Um plantão pertence ao usuário que o registrou.
2. Um plantão pode estar associado a um local de trabalho.
3. Um plantão pode estar associado a um contato e/ou a um responsável pelo pagamento.
4. Registrar um plantão realizado com valor definido deve gerar uma obrigação financeira acompanhável; a previsão de pagamento é opcional.
5. Plantão agendado pode não ter valor; plantão realizado exige valor definido.
6. Plantão realizado origina uma obrigação; plantão agendado não possui obrigação efetiva.
7. Uma obrigação pode ter zero, um ou vários pagamentos parciais.
8. Valor recebido é a soma dos pagamentos válidos; saldo é valor devido menos valor recebido.
9. Estados financeiros são derivados do saldo e da data prevista; não há dependência de status mutável.
10. Durante a data prevista a obrigação não está atrasada; o atraso começa no dia civil seguinte, no timezone do usuário.
11. Pagamentos válidos não podem exceder o valor devido no MVP.
12. Plantões cancelados não entram nas métricas de realizado ou financeiro.
13. Edições não podem apagar ou modificar silenciosamente pagamentos existentes.
14. Dados de usuários diferentes não podem ser misturados ou expostos.

As regras financeiras, transições e casos extremos estão formalizadas em [docs/DOMAIN.md](C:/Users/Maick/Documents/plantao%20saas/docs/DOMAIN.md).

## 11. Direção técnica inicial

A direção preferencial é uma aplicação monolítica simples, com:

- Next.js;
- TypeScript;
- Tailwind CSS;
- shadcn/ui;
- Supabase Auth;
- Supabase/PostgreSQL com Row Level Security;
- Vercel;
- interface responsiva e mobile-first.

Essa direção é uma preferência para a próxima fase, não uma implementação nesta missão. Não devem ser adicionados serviços pagos ou infraestrutura adicional sem necessidade comprovada.

## 12. Riscos e pontos de atenção

### Produto

- Exigir campos demais pode prejudicar a principal métrica de velocidade.
- “Atrasado” depende da correta aplicação do dia civil e do timezone do usuário.
- O responsável deve ser uma referência explícita a um local ou contato, sem campos ambíguos.
- Exclusão e edição sem histórico podem comprometer a confiança nos totais financeiros.
- Usuários podem registrar plantões planejados e realizados de formas diferentes; esse limite precisa ser claro.

### Domínio e dados

- Pagamentos parciais e múltiplos pagamentos fazem parte do MVP e exigem consistência entre obrigação, pagamentos válidos e saldo.
- Valor fixo, valor por hora, adicionais e moedas não foram definidos; inventar esses recursos agora aumentaria o escopo.
- Um contato pode atuar em diferentes papéis e mudar ao longo do tempo.
- Cálculos mensais usam datas diferentes conforme a métrica: período do plantão para trabalhado e data efetiva do pagamento para recebido.

### Arquitetura e operação

- Isolamento por usuário e Row Level Security devem ser tratados como requisito de segurança, não apenas como convenção da aplicação.
- Alterações de schema e regras financeiras precisarão de migrações rastreáveis.
- Notificações, integrações e automações devem esperar validação do fluxo básico.

## 13. Evoluções futuras (separadas do MVP)

Possíveis evoluções, condicionadas à validação do MVP:

- sugestões de local, valor, duração e prazo baseadas no histórico;
- cobrança rápida por WhatsApp;
- lembretes de pagamentos próximos ou atrasados;
- relatórios e comparações por local;
- ajustes financeiros e histórico de correções mais completos;
- importação de dados de planilhas;
- recursos específicos para plantões repassados por terceiros;
- aplicativo nativo, caso o uso justifique;
- integrações externas, somente após requisitos e segurança estarem claros.

## 14. Decisões pendentes

As decisões ainda abertas são:

- política exata para corrigir o valor de uma obrigação que já possui pagamentos;
- se plantões agendados podem ficar sem local;
- se pagamentos anteriores à data do plantão (adiantamentos) serão permitidos;
- política de exclusão de conta, retenção e eventual exportação antes do lançamento público;
- necessidade e canal de notificações futuras.

O schema, ownership, RLS, índices e operações transacionais estão detalhados em [docs/DATABASE.md](C:/Users/Maick/Documents/plantao saas/docs/DATABASE.md) e [docs/ARCHITECTURE.md](C:/Users/Maick/Documents/plantao saas/docs/ARCHITECTURE.md).
