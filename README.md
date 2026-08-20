# MeuSiteCasamento

Plataforma web para casais organizarem o site do casamento, lista de convidados, RSVP e lista de presentes. Stack: Nuxt 4 + TypeScript + Supabase (Postgres/Auth) + Tailwind CSS.

A especificação completa de produto, arquitetura, modelo de dados e convenções de código vive em [CLAUDE.md](CLAUDE.md) (fonte de verdade) e [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (execução técnica).

## Requisitos

- Node.js 22+
- npm
- Um projeto Supabase (hospedado, ou local via [Supabase CLI](https://supabase.com/docs/guides/local-development))

## Instalação

```bash
npm install
cp .env.example .env
```

Preencha o `.env` com as credenciais do seu projeto Supabase e os demais serviços — cada variável em [.env.example](.env.example) tem um comentário explicando de onde vem e para que serve (Supabase, Upstash Redis para rate limiting, segredo da sessão de RSVP, integração com Google Drive para a galeria, InfinitePay).

## Banco de dados

Migrations versionadas em `supabase/migrations/`. Para aplicar num projeto Supabase:

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

## Desenvolvimento

```bash
npm run dev
```

Abre em `http://localhost:3000`.

## Qualidade e testes

```bash
npm run lint        # ESLint
npm run format       # Prettier (--check disponível como format:check)
npm run typecheck    # nuxt typecheck
npm run test          # Vitest (testes unitários)
npm run test:e2e      # Playwright (fluxos ponta a ponta)
```

## Build e deploy

```bash
npm run build
npm run preview   # serve o build de produção localmente
```

Deploy pensado para a Vercel (ver `vercel.json` — cron da sincronização de galeria). `main` é a branch de produção; todo merge passa por CI (lint/typecheck/test/build).
