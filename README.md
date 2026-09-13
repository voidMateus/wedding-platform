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

Migrations versionadas em `supabase/migrations/`. Para aplicar num projeto Supabase de desenvolvimento:

```bash
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

Em **produção não se faz isso à mão**: o job `migrate-prod` do CI aplica as migrations pendentes a cada merge em `main` (docs/ARCHITECTURE.md seção 4.2).

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

Deploy pensado para a Vercel (ver `vercel.json` — os crons de sincronização de galeria e de avisos automáticos). `main` é a branch de produção; todo merge passa por CI (lint/typecheck/test/build).

### Envio de e-mail

O envio por e-mail (convites, lembretes de RSVP e avisos de pagamento) é **opcional**: sem as variáveis abaixo, o canal some do painel e o WhatsApp assistido continua sendo o caminho completo.

1. Crie uma conta no provedor (Resend) e **verifique o domínio de envio** — são registros SPF/DKIM no DNS do domínio, e é a única parte que não se resolve no código. Sem domínio verificado, todo envio volta `403`.
2. Preencha `RESEND_API_KEY` e `EMAIL_REMETENTE` (só o endereço, ex.: `convites@seudominio.com.br`).
3. No painel do provedor, cadastre o webhook `https://SEU_SITE/api/webhooks/email` para os eventos de entrega/devolução e copie o segredo (`whsec_...`) para `RESEND_WEBHOOK_SECRET`.
4. Reimplante: o painel só enxerga o canal depois de um build novo (a flag é avaliada em build, como a da busca de locais).

Os avisos automáticos nascem **desligados** em cada casamento — quem liga é o casal, em Configurações › Avisos.
