# Plantão SaaS

Fundação técnica de um SaaS mobile-first para profissionais de saúde controlarem plantões, recebimentos e valores a receber.

O produto centraliza o fluxo **plantão → obrigação financeira → pagamento**. A visão está em [PRODUCT.md](PRODUCT.md), o modelo conceitual em [docs/DOMAIN.md](docs/DOMAIN.md), a arquitetura em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), o schema em [docs/DATABASE.md](docs/DATABASE.md) e as decisões em [docs/DECISIONS.md](docs/DECISIONS.md).

## Pré-requisitos

- Node.js 20.9 ou superior
- npm

## Instalação

```bash
npm install
```

Copie `.env.example` para `.env.local` e preencha as variáveis quando houver um projeto Supabase configurado. A página inicial não exige credenciais para executar.

## Comandos

```bash
npm run dev       # servidor local
npm run lint      # lint
npm run typecheck # verificação TypeScript
npm run build     # build de produção
npm run start     # servir o build
```

## Stack

- Next.js com App Router e TypeScript
- Tailwind CSS e shadcn/ui
- Supabase JS e Supabase SSR
- Zod
- Vercel como destino futuro de deploy
