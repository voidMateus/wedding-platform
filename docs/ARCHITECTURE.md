# Arquitetura Técnica — Wedding Platform

> Este documento detalha, em nível de execução, como o [CLAUDE.md](../CLAUDE.md) se traduz em arquitetura de software. O CLAUDE.md continua sendo a fonte única de verdade para decisões de produto, modelagem de dados e convenções — este documento **não redefine** nada do que já está lá, apenas aprofunda a camada técnica (estrutura de diretórios, ciclo de vida de requisição, fluxos ponta a ponta, estratégia de testes) para orientar a implementação. Nenhum código foi escrito — é especificação de arquitetura.

**Pré-requisito de leitura**: seções 3 (Stack), 4 (Arquitetura), 5 (Estrutura de Pastas), 11–13 (Banco de Dados), 14 (Autenticação) e 28 (Segurança) do CLAUDE.md.

---

## Índice

1. [Estrutura de Diretórios do Projeto](#1-estrutura-de-diretórios-do-projeto)
2. [Arquitetura Frontend (Nuxt)](#2-arquitetura-frontend-nuxt)
3. [Arquitetura Backend (Nitro)](#3-arquitetura-backend-nitro)
4. [Estratégia Supabase](#4-estratégia-supabase)
5. [Organização das APIs](#5-organização-das-apis)
6. [Fluxo de Autenticação](#6-fluxo-de-autenticação)
7. [Fluxo de RSVP](#7-fluxo-de-rsvp)
8. [Fluxo de Presentes](#8-fluxo-de-presentes)
9. [Estratégia de Testes](#9-estratégia-de-testes)

---

## 1. Estrutura de Diretórios do Projeto

A árvore abaixo estende a estrutura já definida no CLAUDE.md (seção 5) com o nível de detalhe necessário para começar a implementação — em particular, o mapeamento completo de `server/api` por domínio (refletindo as tabelas definidas em 11–12) e a organização de `supabase/`.

```
wedding-platform/
├── app/
│   ├── assets/css/
│   ├── components/
│   │   ├── ui/                        # Design System (Button, Input, Modal, Toast, Badge, Card, Table...)
│   │   ├── public/                    # Hero, Timeline (event_segments), GallerySection, Footer, NavBar
│   │   ├── rsvp/                      # RsvpForm, CompanionFieldList, RsvpStatusBanner
│   │   ├── gifts/                     # GiftCard, GiftReservationModal, GiftContributionModal, GiftProgressBar
│   │   └── admin/
│   │       ├── guests/                # GuestTable, GuestFormModal, CsvImportWizard
│   │       ├── groups/                # GroupTree, GroupFormModal
│   │       ├── gifts/                 # GiftFormModal, GiftReservationsList
│   │       ├── schedule/              # EventSegmentForm (Cronograma)
│   │       ├── communications/        # CommunicationsLog, ResendReminderButton
│   │       └── dashboard/             # ProgressSummary, RsvpBreakdownChart
│   ├── composables/
│   │   ├── useAuth.ts                 # sessão do casal/colaborador
│   │   ├── useWedding.ts              # dados do evento corrente (SSR-friendly)
│   │   ├── useGuestAccessToken.ts     # resolução/estado do token do convidado
│   │   ├── useGuests.ts
│   │   ├── useGuestGroups.ts
│   │   ├── useRsvp.ts
│   │   ├── useGifts.ts
│   │   ├── useGiftContributions.ts
│   │   ├── useEventSegments.ts
│   │   └── useCommunications.ts
│   ├── layouts/
│   │   ├── default.vue                # site público
│   │   ├── admin.vue                  # painel administrativo
│   │   └── auth.vue                   # login/cadastro do casal
│   ├── middleware/
│   │   ├── auth.global.ts             # protege /admin/**
│   │   └── guest-access.global.ts     # resolve o token nas rotas /rsvp/** e /presentes/**
│   ├── pages/
│   │   ├── index.vue
│   │   ├── presentes/index.vue
│   │   ├── rsvp/[code].vue
│   │   ├── login.vue
│   │   └── admin/
│   │       ├── index.vue              # dashboard
│   │       ├── convidados/index.vue
│   │       ├── grupos/index.vue
│   │       ├── presentes/index.vue
│   │       ├── cronograma/index.vue
│   │       ├── comunicacoes/index.vue
│   │       └── configuracoes/index.vue
│   ├── stores/
│   │   ├── auth.store.ts
│   │   ├── guests.store.ts
│   │   ├── gifts.store.ts
│   │   └── ui.store.ts
│   ├── types/
│   │   ├── database.types.ts          # gerado via Supabase CLI, nunca editado à mão
│   │   ├── guest.ts / gift.ts / rsvp.ts / event-segment.ts / communication.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   └── session.get.ts
│   │   ├── guests/
│   │   │   ├── index.get.ts / index.post.ts
│   │   │   ├── [id].patch.ts / [id].delete.ts
│   │   │   └── import.post.ts         # enfileira job de importação CSV
│   │   ├── guest-groups/
│   │   │   ├── index.get.ts / index.post.ts
│   │   │   └── [id].patch.ts / [id].delete.ts
│   │   ├── event-segments/
│   │   │   ├── index.get.ts / index.post.ts
│   │   │   └── [id].patch.ts
│   │   ├── rsvp/
│   │   │   ├── [code].get.ts          # resolve token, retorna dados do grupo/convidado
│   │   │   └── [code].post.ts         # submete/atualiza resposta (função transacional)
│   │   ├── gifts/
│   │   │   ├── index.get.ts / index.post.ts
│   │   │   ├── [id].patch.ts
│   │   │   ├── [id]/reserve.post.ts
│   │   │   ├── [id]/contribute.post.ts
│   │   │   └── [id]/cancel.post.ts
│   │   ├── communications/
│   │   │   ├── index.get.ts
│   │   │   └── reminders.post.ts      # enfileira job de lembrete em lote
│   │   └── admin/
│   │       ├── members.get.ts / members.post.ts
│   │       └── audit-logs.get.ts
│   ├── middleware/
│   │   ├── request-context.ts         # request id, logging estruturado
│   │   ├── rate-limit.ts              # backed by Upstash Redis
│   │   └── auth-context.ts            # resolve auth.uid() / wedding_id para uso nos handlers
│   ├── utils/
│   │   ├── supabase-admin.ts          # client com service_role key (uso restrito e auditável)
│   │   ├── supabase-anon.ts           # client anônimo, quando aplicável
│   │   ├── schemas/                   # Zod schemas por domínio, compartilháveis com o client
│   │   ├── errors.ts                  # tipos de erro padronizados + mapeamento HTTP
│   │   └── jobs/
│   │       ├── enqueue.ts
│   │       └── handlers/              # um handler por `jobs.type` (csv-import, send-reminder, ...)
│   └── jobs-worker/                   # processo/rota separada que consome a fila `jobs`
├── supabase/
│   ├── migrations/                    # schema + funções Postgres transacionais, ver CLAUDE.md 13
│   ├── functions/                     # Supabase Edge Functions (Deno) — reservado, não usado nesta fase
│   ├── policies/                      # README indexando onde cada RLS policy está definida (não duplica SQL)
│   └── seed.sql
├── tests/
│   ├── unit/                          # composables, utils, schemas Zod
│   ├── integration/
│   │   ├── api/                       # endpoints server/api contra Supabase local
│   │   ├── rls/                       # suíte dedicada de isolamento entre wedding_id
│   │   └── guest-path/                # suíte dedicada de autorização manual (ver CLAUDE.md 4.5/14.6)
│   └── e2e/                           # Playwright — fluxos críticos ponta a ponta
├── .env.example
├── nuxt.config.ts
├── tsconfig.json
└── CLAUDE.md
```

### 1.1 Notas sobre a estrutura

- `server/api` é organizado **por recurso de domínio**, espelhando 1:1 as tabelas descritas no CLAUDE.md (11.1) — facilita localizar rapidamente onde uma regra de negócio de uma tabela específica está implementada.
- **Correção sobre `supabase/functions/`**: esse diretório é reservado pela própria Supabase CLI para *Edge Functions* (Deno/TypeScript) — um arquivo `.sql` ali dentro nunca seria aplicado ao banco. As funções Postgres com controle de concorrência explícito (reserva de presente, confirmação de RSVP contra `max_members`) por isso vivem como migrations normais em `supabase/migrations/`, na ordem em que passam a existir no schema (ver 4.4). `supabase/functions/` fica vazio até o projeto realmente precisar de uma Edge Function.
- `supabase/policies/` **não duplica** o SQL das RLS policies (isso criaria duas fontes de verdade divergentes) — mantém um README que documenta a convenção de nomenclatura e indexa em qual migration cada tabela tem suas policies definidas, que é o único artefato que efetivamente governa o banco.
- `server/jobs-worker/` é logicamente separado de `server/api` mesmo rodando no mesmo processo Nitro na v1 — isso permite, no futuro, extraí-lo para um serviço/worker dedicado sem reestruturar o restante do backend.

---

## 2. Arquitetura Frontend (Nuxt)

### 2.1 Camadas e responsabilidades

| Camada | Responsabilidade | Nunca faz |
|---|---|---|
| `pages/` | Orquestra composables, decide o que renderizar, trata estados de loading/erro/vazio | Lógica de negócio, chamadas de rede diretas |
| `components/{public,rsvp,gifts,admin}/` | Renderiza uma fatia de UI de domínio, recebe dados via props | Fetch/mutação direta (exceto componentes "self-contained" documentados no CLAUDE.md 9.2) |
| `components/ui/` | Átomos do Design System, sem conhecimento de domínio | Qualquer referência a `Guest`, `Gift`, etc. |
| `composables/` | Busca/mutação de dados, regras de apresentação reutilizáveis | Renderização |
| `stores/` (Pinia) | Cache de última versão conhecida de entidades de uso global | Ser a fonte de verdade (isso é o servidor) |

### 2.2 Estratégia de renderização por rota

| Rota | Modo | Justificativa |
|---|---|---|
| `/` (home pública) | SSR | SEO, Open Graph para compartilhamento no WhatsApp (CLAUDE.md 26) |
| `/presentes` | SSR | Mesma razão — pode ser compartilhada diretamente |
| `/rsvp/[code]` | SSR para o carregamento inicial dos dados do convite; interações subsequentes client-side | Precisa carregar rápido a partir de um link direto, mas não precisa de SEO (`noindex`) |
| `/login` | SSR simples | Página leve, sem dados sensíveis pré-carregados |
| `/admin/**` | Client-side (`ssr: false` no layout `admin`) | Não precisa de SEO; evita expor qualquer dado administrativo no HTML servido antes da checagem de sessão |

Definido via `routeRules` no `nuxt.config.ts`, mantendo a decisão centralizada em vez de espalhada por página.

### 2.3 Padrão de busca de dados

- Toda leitura que define conteúdo de primeira renderização usa `useAsyncData` com chave estável e descritiva (`wedding-${slug}`, `rsvp-${code}`, `guests-page-${page}`), nunca chave gerada aleatoriamente — chaves estáveis são o que permite ao Nuxt evitar refetch duplicado entre server e client durante a hidratação.
- Toda mutação passa por uma action de composable (`useGuests().createGuest(...)`), nunca por `$fetch` direto em um componente — mantém a regra do CLAUDE.md (5.1/10.1) de que rede é responsabilidade do composable.
- Após uma mutação, a invalidação de cache é explícita (`refreshNuxtData` na chave afetada), nunca um `location.reload()` ou recarregamento de página inteira.

### 2.4 Pipeline de middleware de rota (client)

Ordem de execução para uma navegação:

1. `guest-access.global.ts` — se a rota for `/rsvp/[code]` ou `/presentes` com código na URL, resolve o token contra o backend (ver seção 6) e injeta o contexto do convidado.
2. `auth.global.ts` — se a rota estiver sob `/admin/**`, verifica sessão Supabase; sem sessão válida, redireciona para `/login` preservando a rota de destino.

Os dois middlewares são independentes e nunca se aplicam à mesma rota — reforça o desacoplamento público/admin já definido no CLAUDE.md (5.1).

### 2.5 Módulos Nuxt esperados

`@tailwindcss/vite` (Tailwind v4, CSS-first — tokens em `app/assets/css/main.css` via `@theme`, sem `tailwind.config.ts`; ver Fase B), `@pinia/nuxt`, `@nuxt/eslint`, `@nuxt/image` (para `NuxtImg`/`NuxtPicture`, ver CLAUDE.md 24/27), módulo de sitemap/robots (ver CLAUDE.md 26), e o módulo oficial do Supabase (ou um wrapper fino próprio sobre `@supabase/supabase-js`) restrito ao client anônimo — o client com `service_role key` só existe em `server/utils/supabase-admin.ts`, nunca em módulo carregado no bundle do browser.

### 2.6 Tratamento de erro na apresentação

- Página de erro global (`error.vue`) diferenciada por contexto: erro no site público mantém a identidade visual do casamento (usa `theme_config` se já resolvido); erro no admin usa o layout administrativo neutro.
- Erros de mutação (RSVP, reserva de presente) nunca navegam para uma página de erro — são tratados inline via toast/estado do formulário, preservando o que o usuário já preencheu.

---

## 3. Arquitetura Backend (Nitro)

### 3.1 Ciclo de vida de uma requisição

```
1. request-context (middleware)
   → gera/propaga request id, inicia log estruturado

2. rate-limit (middleware)
   → aplicado apenas às rotas marcadas como sensíveis (rsvp/*, gifts/*/reserve, gifts/*/contribute)
   → consulta Upstash Redis; excede limite → 429 antes de qualquer acesso a dados

3. auth-context (middleware)
   → caminho administrativo: valida JWT do Supabase Auth, resolve wedding_id via wedding_members
   → caminho do convidado: NÃO resolve aqui — cada handler de rsvp/gifts resolve seu próprio
     guest_access_token explicitamente (ver seção 6), porque o "sujeito" da requisição
     é o token, não uma sessão global

4. handler do endpoint (server/api/**)
   a. valida body/query com o schema Zod correspondente (server/utils/schemas)
   b. verifica autorização específica do recurso (ex: wedding_id do JWT bate com o
      wedding_id do recurso solicitado)
   c. executa a operação — leitura direta, ou chamada RPC a uma função Postgres
      definida em supabase/migrations/ (ver 4.4) quando há controle de concorrência envolvido
   d. serializa resposta no formato padronizado (ver 5.2)

5. tratamento de erro centralizado (server/utils/errors.ts)
   → qualquer exceção não tratada no handler cai aqui, é logada com o request id
     e convertida para o formato de erro padronizado antes de sair
```

### 3.2 Organização de `server/api`

Reflete a lista de tabelas do CLAUDE.md (11.1), com uma pasta por recurso de domínio. Cada pasta segue a convenção de nomes de arquivo do Nuxt (`index.get.ts`, `[id].patch.ts`, `[id]/ação.post.ts`). Endpoints que representam uma **operação de negócio** (não um CRUD genérico) usam um verbo explícito no path — `reserve`, `contribute`, `cancel`, `import`, `reminders` — em vez de forçar tudo em `PATCH` genérico, deixando a intenção auditável só de olhar a rota.

### 3.3 `server/utils` — responsabilidades

| Módulo | Responsabilidade |
|---|---|
| `supabase-admin.ts` | Único ponto de criação do client com `service_role key`; qualquer novo uso passa por revisão explícita, já que é a credencial mais crítica (CLAUDE.md 28) |
| `schemas/` | Um arquivo Zod por recurso, importado tanto pelo handler quanto (via tipo inferido) pelo client — schema único, nunca duplicado entre camadas (CLAUDE.md 8) |
| `errors.ts` | Vocabulário fechado de erros de domínio (`NotFoundError`, `ValidationError`, `ConcurrencyConflictError`, `TokenRevokedError`, `RateLimitedError`) mapeado para status HTTP de forma consistente em todos os endpoints |
| `jobs/enqueue.ts` | Único ponto de escrita na tabela `jobs` — nenhum endpoint insere na fila diretamente sem passar por essa função (garante formato de `payload` consistente) |
| `jobs/handlers/` | Um handler por `jobs.type`; o worker apenas despacha para o handler correspondente, sem lógica de negócio própria |

### 3.4 Worker de jobs assíncronos

Processo (ou rota Nitro protegida, disparada por cron do provedor de hosting) que consulta `jobs` por linhas `pending` com `run_at <= now()`, marca como `processing`, executa o handler correspondente, e atualiza para `completed`/`failed` com contagem de tentativas. Usado para: importação de CSV (CLAUDE.md 27), envio de lembretes em lote (CLAUDE.md 16.4/19), e, futuramente, qualquer integração de billing (CLAUDE.md 33). Mantém os endpoints HTTP síncronos curtos, compatíveis com o tempo de vida de uma função serverless.

### 3.5 Formato de erro padronizado

Toda resposta de erro do backend segue a mesma forma (código de domínio, mensagem segura para exibir ao usuário, request id para suporte) — nunca vaza stack trace ou detalhe de implementação para o client, especialmente nos endpoints do caminho do convidado, que são público-facing.

---

## 4. Estratégia Supabase

### 4.1 Projetos por ambiente

Um projeto Supabase por ambiente (`dev`, `staging`, `prod`), nunca compartilhado — evita que dados de teste/desenvolvimento se misturem com dados reais de convidados, o que seria particularmente grave dado o caráter sensível dessa informação (CLAUDE.md 28.1).

### 4.2 Fluxo de migrations

1. Toda mudança de schema nasce como uma migration local (Supabase CLI), testada contra o ambiente `dev`.
2. Migration é revisada em PR como qualquer mudança de código (CLAUDE.md 29) — incluindo revisão explícita de qualquer nova RLS policy.
3. Promovida para `staging` automaticamente ao mergear na `main`; promovida para `prod` como etapa manual e deliberada (nunca automática), dado que envolve dados reais de casamentos ativos.
4. Migrations são estritamente aditivas/reversíveis quando possível; mudanças destrutivas (`DROP COLUMN`, `NOT NULL` retroativo) seguem um processo de duas etapas (deploy que tolera ambos os estados → migration de limpeza posterior) para nunca quebrar uma versão de código já em produção.

### 4.3 Padrão de autoria de RLS

- Uma policy por operação (`select`/`insert`/`update`/`delete`), nunca uma policy genérica "para tudo" — mais fácil de auditar individualmente.
- Toda nova tabela nasce com RLS habilitada e **nenhuma policy** (deny-by-default); policies são adicionadas explicitamente, nunca o inverso (nascer aberta e depois restringir).
- Cada policy nova exige um teste correspondente na suíte `tests/integration/rls/` antes do merge — é a aplicação prática da exigência já registrada no CLAUDE.md (33.4).

### 4.4 Funções Postgres para operações transacionais

Operações com controle de concorrência explícito (CLAUDE.md 13/18.3) — reserva de presente, confirmação de RSVP contra `max_members` — são implementadas como funções Postgres versionadas em `supabase/migrations/` (`reserve_gift`, `cancel_gift_reservation`, `confirm_rsvp`), chamadas via RPC pelo backend, e não como uma sequência de `SELECT`+`INSERT` orquestrada em TypeScript. Isso garante que o bloqueio (`SELECT ... FOR UPDATE`) e a escrita aconteçam na mesma transação, sem round-trip de rede entre as duas etapas. Nenhuma é `SECURITY DEFINER`: rodam com o papel de quem chama, para que o caminho administrativo continue protegido por RLS como defesa em profundidade (o caminho do convidado já ignora RLS via `service_role`, ver 4.5).

### 4.5 Storage

Bucket dedicado para fotos da galeria (CLAUDE.md 11.1 — `photos`), particionado por `wedding_id` no path do objeto, com policy de leitura pública (site do casamento é público) e escrita restrita a membros autenticados do respectivo `wedding_id`. Validação de tipo/tamanho de arquivo (CLAUDE.md 28) acontece no `server/api` antes de gerar a URL assinada de upload — o client nunca faz upload direto sem essa checagem prévia.

### 4.6 Autenticação

Supabase Auth configurado para e-mail/senha + magic link (CLAUDE.md 14.2), com duração de sessão e política de refresh token padrão do provedor, cookies `httpOnly`/`secure` (CLAUDE.md 28) definidos pela integração Nuxt-Supabase no server, nunca manipulados diretamente pelo client.

### 4.7 Geração de tipos e ambiente local

- `database.types.ts` gerado via Supabase CLI a partir do schema real do ambiente `dev`, como etapa de CI que falha se o tipo commitado estiver desatualizado em relação às migrations.
- Ambiente local de desenvolvimento roda via Supabase CLI + Docker, permitindo iterar em migrations e RLS sem tocar em `dev` remoto até a mudança estar validada.

---

## 5. Organização das APIs

### 5.1 Mapa de recursos

| Domínio | Base path | Persona | Rate limited |
|---|---|---|---|
| Sessão administrativa | `/api/auth` | Admin (JWT) | Não |
| Convidados | `/api/guests` | Admin (JWT) | Não |
| Grupos | `/api/guest-groups` | Admin (JWT) | Não |
| Cronograma | `/api/event-segments` | Admin (JWT) / leitura pública via página SSR | Não |
| RSVP | `/api/rsvp/[code]` | Convidado (token) | **Sim** |
| Presentes (leitura) | `/api/gifts` | Pública / Admin | Não |
| Presentes (reserva/contribuição/cancelamento) | `/api/gifts/[id]/*` | Convidado (token) | **Sim** |
| Comunicações | `/api/communications` | Admin (JWT) | Não |
| Administração | `/api/admin/*` | Admin (JWT, `owner`) | Não |

### 5.2 Convenções de request/response

- Respostas de sucesso sempre retornam o recurso (ou lista) diretamente, sem envelope desnecessário; listagens paginadas retornam metadados de paginação em um objeto irmão (`{ data, meta: { page, pageSize, total } }|`), nunca misturado no mesmo nível dos itens.
- Erros seguem o formato único descrito em 3.5 — o client tem um único parser de erro para toda a aplicação, nunca um por endpoint.
- Paginação por parâmetros de query (`page`, `pageSize`), com `pageSize` máximo travado no servidor (evita que um client mal-intencionado peça a base inteira de uma vez, reforça CLAUDE.md 27).

### 5.3 Duas personas de API, dois modelos de autorização

Espelhando o modelo de confiança do CLAUDE.md (4.5/14.6):

- **API administrativa**: cada handler resolve `wedding_id` a partir do JWT (via `wedding_members`) e nunca aceita `wedding_id` vindo do body/query da requisição para decidir o que é acessível — o JWT é a única fonte de verdade sobre qual evento o usuário pode tocar.
- **API do convidado**: cada handler resolve o registro a partir do hash do token recebido na URL, e todo o restante da autorização (esse `guest`/`group` pertence a esse `wedding`, esse presente pertence a esse `wedding`) é revalidado explicitamente dentro do handler — nunca assumida a partir de um único join solto.

### 5.4 Idempotência

Endpoints de mutação do caminho do convidado (`rsvp/[code].post`, `gifts/[id]/reserve.post`, `gifts/[id]/contribute.post`) são desenhados para tolerar reenvio de rede (retry automático do browser em conexão instável) sem efeito duplicado — resposta de RSVP usa o token como chave de upsert (CLAUDE.md 16.4); reserva de presente é naturalmente idempotente porque a segunda tentativa encontra o recurso já indisponível e retorna um erro de domínio claro, não uma duplicata.

---

## 6. Fluxo de Autenticação

### 6.1 Caminho administrativo (casal/colaboradores)

```
1. Usuário submete e-mail/senha (ou solicita magic link) em /login
2. Supabase Auth valida e emite JWT (access + refresh), setados como cookies
   httpOnly/secure pela integração Nuxt-Supabase
3. Navegação subsequente para /admin/** → middleware auth.global.ts verifica
   sessão client-side (evita flash de conteúdo protegido)
4. Toda chamada a /api/admin/**, /api/guests, etc. → middleware auth-context
   no server valida o JWT novamente e resolve wedding_id via wedding_members
   (a checagem client-side é UX, a checagem server-side é a que garante segurança)
5. Expiração de access token → refresh automático via refresh token;
   falha no refresh → sessão encerrada, redirecionamento para /login
```

### 6.2 Caminho do convidado (RSVP e presentes)

```
1. Convidado abre /rsvp/{code} (ou /presentes?code={code})
2. middleware guest-access.global.ts (client) apenas prepara o estado de UI —
   a resolução de verdade acontece no server
3. GET /api/rsvp/[code]:
   a. calcula hash do código recebido
   b. busca em guest_access_tokens por code_hash, com revoked_at nulo
   c. não encontrado/revogado → erro de domínio dedicado (nunca "500 genérico",
      para permitir uma tela clara de "link inválido ou expirado")
   d. encontrado → resolve guest/group + wedding + event_segments associados,
      retorna apenas esse recorte de dados
4. Formulário de RSVP é preenchido e submetido usando o mesmo token
5. POST /api/rsvp/[code] revalida o token da mesma forma antes de qualquer escrita
```

### 6.3 Diferença de postura entre os dois caminhos

O caminho administrativo tem duas camadas de checagem (client para UX, RLS no banco como última linha — CLAUDE.md 4.5). O caminho do convidado tem uma única camada real de enforcement, inteiramente no `server/api` — por isso todo endpoint desse caminho é tratado, na suíte de testes (seção 9), com o mesmo rigor que se testaria uma policy de RLS.

---

## 7. Fluxo de RSVP

### 7.1 Carregamento inicial

```
1. GET /api/rsvp/[code] resolve token → retorna:
   - dados do wedding (nome do casal, data, event_segments)
   - dados do guest ou guest_group (conforme rsvp_mode)
   - resposta já existente, se houver (para reabrir em modo de edição)
2. Página renderiza formulário pré-preenchido se já existir resposta,
   ou formulário em branco se for a primeira submissão
```

### 7.2 Submissão — caminho de confirmação

```
1. Client valida com o schema Zod compartilhado (feedback imediato)
2. POST /api/rsvp/[code] com { status: 'confirmed', companions: [...], dietaryNotes, message }
3. Handler revalida o token e o schema no server
4. Chamada RPC à função Postgres de confirmação de RSVP:
   a. abre transação
   b. SELECT ... FOR UPDATE na linha do guest_group (trava a checagem de max_members)
   c. conta acompanhantes já confirmados no grupo + os novos desta submissão
   d. excede max_members → aborta transação, retorna erro de domínio
      (ex: "limite de acompanhantes do grupo atingido")
   e. dentro do limite → upsert em rsvp_responses (chave: guest_id/group_id),
      substitui os companions associados pelos enviados nesta submissão,
      grava responded_at
   f. commit
5. Sucesso → resposta confirma o novo estado; UI mostra confirmação
6. Job assíncrono (opcional, Fase 2): enfileira e-mail de confirmação,
   registrado em communications
```

### 7.3 Submissão — caminho de recusa

```
1. Formulário de recusa não coleta companions/dietaryNotes (CLAUDE.md 16.3) —
   apenas status = 'declined' + message opcional
2. POST /api/rsvp/[code] segue o mesmo endpoint, mas o handler pula a etapa
   de checagem de max_members quando status = 'declined' (não há acompanhante
   a validar) e remove companions pré-existentes, se o convidado estiver
   corrigindo uma resposta anterior de "confirmado" para "recusado"
```

### 7.4 Edição de resposta já enviada

Reenvio do formulário até `rsvp_deadline` segue exatamente o mesmo endpoint (upsert por token) — não existe um endpoint separado de "editar", o que elimina uma classe inteira de bugs de divergência entre "criar" e "editar". Após `rsvp_deadline`, o handler recusa a escrita com um erro de domínio específico (`RsvpClosedError`), e a UI já havia colocado o formulário em somente leitura preventivamente (CLAUDE.md 16.2).

### 7.5 Reflexo no dashboard administrativo

O dashboard (CLAUDE.md 19) não recebe push em tempo real (CLAUDE.md 16.4/27) — os contadores são lidos de uma `view` agregada (`wedding_rsvp_summary`, CLAUDE.md 13) a cada carregamento/refetch da página administrativa.

---

## 8. Fluxo de Presentes

### 8.1 Navegação e listagem pública

```
1. GET /api/gifts?weddingSlug=... — leitura pública, sem token obrigatório
   (mas se um code estiver presente no contexto, é usado para decidir se o
   próprio convidado já reservou/contribuiu com algo, para exibir esse estado)
2. Presentes retornados já incluem estado agregado: 'available' | 'reserved' |
   'sold_out' para itens simples, e { collected_amount_cents, target_amount_cents }
   para presentes de cota (gifts.is_group_gift)
```

### 8.2 Reserva de presente simples (`is_group_gift = false`)

```
1. POST /api/gifts/[id]/reserve com o token do convidado (ou contributor_name avulso)
2. Handler revalida token → chamada RPC à função Postgres de reserva:
   a. abre transação
   b. SELECT ... FOR UPDATE na linha do gift
   c. quantity_available = 0 → aborta, erro de domínio ('GiftUnavailableError')
   d. disponível → decrementa quantity_available, insere gift_reservations, commit
3. Resposta atualiza a UI para o estado 'reserved' imediatamente
```

### 8.3 Contribuição em presente de cota (`is_group_gift = true`)

```
1. POST /api/gifts/[id]/contribute com { amountCents } + token (ou contributor_name)
2. Handler valida amountCents > 0 e insere em gift_contributions
   (sem necessidade de SELECT ... FOR UPDATE — contribuições não competem por
   um recurso exclusivo, apenas somam; ver CLAUDE.md 18.3)
3. Valor "arrecadado" exibido é sempre uma leitura agregada (SUM) no momento
   da renderização, nunca um contador mantido manualmente no client
```

### 8.4 Cancelamento

```
1. POST /api/gifts/[id]/cancel com o token do convidado
2. Handler verifica que a reserva/contribuição pertence ao mesmo guest/group
   do token (nunca confia em um reservationId isolado sem essa checagem)
3. Reserva simples → remove a linha e incrementa quantity_available de volta,
   dentro de transação equivalente à de 8.2
4. Contribuição → remove a linha correspondente; o valor arrecadado se ajusta
   automaticamente por ser uma agregação lida em tempo de leitura
```

### 8.5 Visão administrativa

`/api/gifts` (variante autenticada) e a listagem administrativa (CLAUDE.md 19) expõem quem reservou/contribuiu o quê — informação propositalmente **não exposta** na vitrine pública (CLAUDE.md 18.2), usada apenas para agradecimento pós-evento.

---

## 9. Estratégia de Testes

### 9.1 Pirâmide de testes

| Camada | Ferramenta | Escopo |
|---|---|---|
| Unitário | Vitest | Composables (`useRsvp`, `useGifts`...), utils (`formatters`, `validators`), schemas Zod (casos válidos/inválidos) |
| Integração — API | Vitest + Supabase local | Cada endpoint de `server/api`, contra um banco real (local), incluindo casos de erro de domínio |
| Integração — RLS | Vitest + Supabase local | Suíte dedicada (`tests/integration/rls/`): para cada tabela, confirma que um `auth.uid()` de um `wedding_id` nunca lê/escreve dado de outro `wedding_id` |
| Integração — caminho do convidado | Vitest + Supabase local | Suíte dedicada (`tests/integration/guest-path/`): para cada endpoint público-facing, confirma que um token só acessa o próprio `guest`/`group`/`wedding_id` — cobre exatamente o que RLS não cobre nesse caminho (CLAUDE.md 4.5) |
| E2E | Playwright | Fluxos críticos ponta a ponta, navegador real |

### 9.2 Por que duas suítes de integração separadas (RLS vs. caminho do convidado)

Essa separação não é redundância — são dois mecanismos de enforcement diferentes (CLAUDE.md 4.5/14.6), cada um podendo falhar de forma independente. Um teste de RLS que passa não diz nada sobre a segurança do `server/api/rsvp/[code]`, porque esse endpoint usa a `service_role key` e nunca é avaliado por RLS. Tratar as duas como a mesma suíte esconderia essa lacuna.

### 9.3 Fluxos cobertos por E2E (mínimo obrigatório antes de qualquer release)

- Convidado confirma presença com acompanhantes, respeitando `max_members`.
- Convidado tenta confirmar acompanhantes além do `max_members` — vê erro claro, não um erro genérico.
- Convidado recusa presença (caminho curto, sem campos de acompanhante/dietary).
- Convidado edita uma resposta já enviada antes do `rsvp_deadline`.
- Convidado tenta responder após `rsvp_deadline` — formulário em somente leitura.
- Convidado reserva presente simples; segunda tentativa concorrente ao mesmo item vê "esgotado".
- Convidado contribui parcialmente para presente de cota; progresso é refletido corretamente.
- Convidado cancela reserva/contribuição.
- Casal faz login, importa CSV de convidados, acompanha o job de importação até concluir.
- Casal exclui um convidado e confirma que o histórico de RSVP associado é preservado (soft delete).
- Colaborador sem permissão de `owner` tenta acessar configurações restritas e é bloqueado.

### 9.4 Dados de teste

Fábricas de dados (`tests/factories` — não confundir com seed de produto) geram `wedding`, `guest_group`, `guests` e `gifts` com valores mínimos válidos, permitindo que cada teste declare apenas o que é relevante para o cenário em questão. `supabase/seed.sql` continua servindo apenas para desenvolvimento manual local, nunca para os testes automatizados (que devem ser determinísticos e isolados entre execuções).

### 9.5 Acessibilidade e visual

Testes E2E críticos do site público e do fluxo de RSVP rodam uma checagem automatizada de acessibilidade (axe-core) como parte da mesma execução Playwright — falha de contraste ou de rótulo ausente quebra o build, coerente com a meta WCAG 2.1 AA do CLAUDE.md (25).

### 9.6 Pipeline de CI (ordem de execução)

```
1. Lint + type-check (falha rápida, mais barato)
2. Testes unitários (Vitest)
3. Subida do Supabase local (Docker) + aplicação de migrations
4. Testes de integração — API, RLS, caminho do convidado (em paralelo entre si)
5. Build da aplicação
6. Testes E2E (Playwright) contra o build, com o Supabase local já provisionado
```

A ordem prioriza feedback rápido (lint/type-check primeiro) e isola a suíte de RLS/caminho do convidado como um gate obrigatório antes de qualquer merge — nunca tratada como "nice to have" opcional, dado que é a suíte que substitui a ausência de RLS no caminho do convidado.

### 9.7 Metas pragmáticas de cobertura

Cobertura de linha não é meta em si — as metas reais são: 100% dos endpoints de mutação têm ao menos um teste de integração feliz + um de erro de domínio; 100% das tabelas com RLS têm teste de isolamento; 100% dos fluxos listados em 9.3 têm E2E. Um número de cobertura agregado sem esses três critérios é ruído, não sinal de qualidade.

---

*Este documento evolui junto com o CLAUDE.md. Qualquer mudança de modelagem de dados ou de modelo de confiança no CLAUDE.md deve ser refletida aqui antes da implementação correspondente.*
