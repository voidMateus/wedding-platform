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
│   ├── assets/css/                    # Tailwind v4 CSS-first (@theme) — sem tailwind.config.ts
│   ├── components/
│   │   ├── ui/                        # Design System (Button, Input, Modal, Toast, Badge, Card, Table...)
│   │   ├── public/                    # Hero, GrandeDiaSection (event_segments), GallerySection, NavBar
│   │   ├── rsvp/                      # RsvpInviteFlow, CompanionFieldList, RsvpStatusBanner
│   │   ├── gifts/                     # GiftCard, GiftDeliveryChoiceModal, GiftPaymentModal, GiftsShowcase
│   │   └── admin/
│   │       ├── guests/                # GuestPartyWizard, GuestPersonFields
│   │       ├── gifts/                 # AdminGiftFormModal
│   │       └── (demais componentes soltos em admin/ — cabeçalho/dashboard: AdminSection, AdminStatCard...)
│   ├── composables/                   # 1 por domínio: useAuth, useGuests, useInvites, useGroups,
│   │                                   # useGuestAccessTokens, useInviteTags, useRsvp, useGifts,
│   │                                   # useGiftCategories, useGiftReservations, useGiftGiverIdentity,
│   │                                   # useWedding, usePublicWedding, useWeddingTheme, useEventSegments,
│   │                                   # usePublicEventSegments, useGalleryConnection, useWeddingPhotos...
│   ├── layouts/
│   │   ├── default.vue                # site público
│   │   ├── admin.vue                  # painel administrativo
│   │   └── auth.vue                   # login/cadastro do casal
│   ├── middleware/
│   │   └── auth.global.ts             # protege /admin/** (sem middleware de guest-access — ver 2.4)
│   ├── pages/
│   │   ├── index.vue                  # resolve/redireciona pro casamento ativo
│   │   ├── login.vue
│   │   ├── [slug]/                    # site público, sempre sob o slug do casamento
│   │   │   ├── index.vue
│   │   │   ├── rsvp/
│   │   │   │   ├── index.vue          # busca por nome, sem código (ver 6.2/7)
│   │   │   │   └── [code].vue         # link/QR direto do convite
│   │   │   ├── presentes/
│   │   │   │   ├── index.vue
│   │   │   │   └── pagamento/[paymentId].vue
│   │   │   └── galeria.vue
│   │   └── admin/
│   │       ├── index.vue              # dashboard
│   │       ├── convidados/[id].vue, index.vue, novo.vue
│   │       ├── convites/[id].vue, index.vue    # invites — unidade de RSVP (CLAUDE.md 17)
│   │       ├── grupos/index.vue                # groups — etiqueta livre (CLAUDE.md 17)
│   │       ├── presentes/index.vue
│   │       ├── cronograma/index.vue
│   │       ├── galeria/index.vue
│   │       └── configuracoes/index.vue
│   ├── stores/
│   │   ├── auth.store.ts
│   │   └── ui.store.ts                # guests/gifts NÃO são Pinia — server state via composables (CLAUDE.md 10)
│   ├── types/                         # 1:1 por entidade (guest.ts, invite.ts, group.ts, gift.ts, rsvp.ts...),
│   │                                   # + database.types.ts gerado via Supabase CLI, nunca editado à mão
│   └── utils/
├── server/
│   ├── api/
│   │   ├── auth/
│   │   ├── wedding/                   # config do evento, theme, content, gallery (connection/sync/preview)
│   │   ├── guests/
│   │   ├── invites/                   # unidade de RSVP (antiga "guest-groups") — CRUD + tags
│   │   ├── groups/                    # etiqueta livre — CRUD
│   │   ├── guest-access-tokens/
│   │   ├── invite-tags/
│   │   ├── event-segments/            # exclusão física — ver CLAUDE.md 11
│   │   ├── public/                    # sem autenticação e sem token — site público (CLAUDE.md 4.5)
│   │   │   └── [slug]/                # wedding, event-segments, gifts, photos, rsvp-search
│   │   ├── rsvp/
│   │   │   ├── [code].get.ts                     # link/QR direto — resolve token, retorna o convite
│   │   │   ├── guests/[guestId].put.ts            # upsert_guest_rsvp — RSVP por convidado
│   │   │   └── invites/[inviteId]/finalize.post.ts # finalize_invite_rsvp — acompanhante avulso + mensagem
│   │   ├── public/rsvp-search/        # select.post.ts, confirm.post.ts — segundo caminho de entrada (6.2)
│   │   ├── gifts/                     # CRUD admin + [id]/reservations.get.ts
│   │   ├── gift-categories/
│   │   ├── public/gifts/              # [id]/reserve.post.ts, [id]/checkout.post.ts,
│   │   │                              # payments/[id]/status.get.ts, payments/webhook.post.ts
│   │   ├── photos/                    # [id].patch.ts, reorder.patch.ts (sem POST/upload — ver 4.5)
│   │   ├── cron/                      # sync-galleries.get.ts (Vercel Cron, CRON_SECRET)
│   │   ├── dashboard/                 # summary.get.ts
│   │   └── admin/                     # members, audit-logs, search
│   ├── middleware/
│   │   └── rate-limit.ts              # backed by Upstash Redis — cobre /api/rsvp/**, rsvp-search, gifts públicos
│   └── utils/                         # supabase-admin, wedding-context, errors, guest-access-token,
│                                       # rsvp-invite-payload, gift-payment, infinitepay, google-drive,
│                                       # gallery-sync(-trigger), token-cipher, validate-same-venue...
├── shared/                            # alias #shared — únicos importáveis por client E server
│   ├── schemas/                       # Zod por domínio (guests, invites, groups, gifts, theme, content...)
│   └── utils/                         # contrast, filter-gifts, mask-name, event-datetime, guest-age...
├── supabase/
│   ├── migrations/                    # schema + funções Postgres transacionais, ver CLAUDE.md 13
│   └── seed.sql
├── tests/
│   ├── unit/                          # composables, utils, schemas Zod, componentes
│   └── e2e/                           # Playwright — fluxos críticos ponta a ponta
├── docs/
│   ├── ARCHITECTURE.md
│   └── CHANGELOG.md                   # histórico de decisões/incidentes (CLAUDE.md 32)
├── .env.example
├── nuxt.config.ts
├── vercel.json                        # cron da sincronização de galeria
├── tsconfig.json
└── CLAUDE.md
```

**Nota sobre `jobs`/worker assíncrono**: a tabela `jobs` (CLAUDE.md 11.1) e o worker descrito na seção 3.4 abaixo permanecem como desenho de arquitetura para a Fase 2 (importação de CSV, lembretes em lote) — `server/utils/jobs/` e um processo/rota de worker dedicado **ainda não foram implementados**; hoje não há nenhuma fila assíncrona real no código. Tratar a seção 3.4 como especificação a implementar, não como descrição do estado atual. `communications` (CLAUDE.md 11.1) é a mesma situação — tabela reservada no schema, sem `server/api/communications/` ainda.

### 1.1 Notas sobre a estrutura

- `server/api` é organizado **por recurso de domínio**, espelhando 1:1 as tabelas descritas no CLAUDE.md (11.1) — facilita localizar rapidamente onde uma regra de negócio de uma tabela específica está implementada. Alguns domínios (RSVP, presentes) têm rotas espalhadas entre um namespace autenticado e um em `public/`, refletindo o modelo de confiança por fluxo (CLAUDE.md 4.5), não um desvio da convenção.
- **Correção sobre `supabase/functions/`**: esse diretório é reservado pela própria Supabase CLI para *Edge Functions* (Deno/TypeScript) — um arquivo `.sql` ali dentro nunca seria aplicado ao banco. As funções Postgres com controle de concorrência explícito (reserva de presente, `finalize_invite_rsvp`) por isso vivem como migrations normais em `supabase/migrations/`, na ordem em que passam a existir no schema (ver 4.4). `supabase/functions/` fica vazio (só `.gitkeep`) até o projeto realmente precisar de uma Edge Function.
- `supabase/policies/` **não duplica** o SQL das RLS policies (isso criaria duas fontes de verdade divergentes) — mantém um README que documenta a convenção de nomenclatura e indexa em qual migration cada tabela tem suas policies definidas, que é o único artefato que efetivamente governa o banco.
- `supabase/policies/` **não duplica** o SQL das RLS policies (isso criaria duas fontes de verdade divergentes) — mantém um README que documenta a convenção de nomenclatura e indexa em qual migration cada tabela tem suas policies definidas, que é o único artefato que efetivamente governa o banco.
- `server/jobs-worker/` é logicamente separado de `server/api` mesmo rodando no mesmo processo Nitro na v1 — isso permite, no futuro, extraí-lo para um serviço/worker dedicado sem reestruturar o restante do backend.
- **Correção sobre `schemas/`**: não vivem em `server/utils/schemas/` como a primeira versão desta árvore sugeria — código sob `server/` roda só em Nitro e não é importável pelo bundle do client no Nuxt. Um schema Zod que precisa validar tanto no formulário (client) quanto no handler (server) só pode viver em `shared/` (alias `#shared`, um diretório de primeira classe do Nuxt 4 acessível dos dois lados).
- **Correção sobre `auth-context`**: não é um middleware Nitro global (`server/middleware/auth-context.ts`) como o desenho original propunha — um middleware roda em toda requisição, e distinguir "essa rota é do caminho administrativo" de "essa rota é do caminho do convidado" só por prefixo de path dentro de um middleware genérico é frágil. Na prática é uma função utilitária (`server/utils/wedding-context.ts`) chamada explicitamente pelos handlers que precisam dela — mais fácil de auditar quais endpoints resolvem contexto de wedding, sem risco de afetar rotas públicas por engano.

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

- `auth.global.ts` — se a rota estiver sob `/admin/**`, verifica sessão Supabase; sem sessão válida, redireciona para `/login` preservando a rota de destino.

**Correção sobre `guest-access.global.ts`**: o desenho original desta seção propunha um middleware global que resolveria o token do convidado em `/rsvp/[code]` e `/presentes`. Na implementação real (CLAUDE.md, seção 14.3, PR do fluxo de RSVP), isso não existe como middleware — cada página resolve o próprio código via composable (`useRsvp(code).getRsvp()`) dentro do `<script setup>`, do mesmo jeito que o caminho administrativo resolve `wedding_id` via função explícita (`wedding-context.ts`, não middleware — ver correção equivalente em 1.1). Um middleware global rodaria em toda navegação, inclusive `/admin/**`, sem necessidade; a resolução por página é mais simples de auditar e não risca vazar lógica de convidado para rotas que não precisam dela. Desde a "Rodada 4" da Fase Presentes 2.0 (CLAUDE.md, seção 32), `/presentes` não resolve token nenhum — a menção acima já não se aplica a esse caminho, só a `/rsvp/[code]`.

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

3. resolução de contexto (dentro do próprio handler, não um middleware — ver 1.1)
   → caminho administrativo: handler chama server/utils/wedding-context.ts, que valida o
     usuário via serverSupabaseUser() e resolve wedding_id/role via wedding_members
   → caminho do convidado: cada handler de rsvp/gifts resolve seu próprio
     guest_access_token explicitamente (ver seção 6), porque o "sujeito" da requisição
     é o token, não uma sessão global

4. handler do endpoint (server/api/**)
   a. valida body/query com o schema Zod correspondente (shared/schemas/)
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
| `wedding-context.ts` | Resolve wedding_id/role do usuário autenticado via `wedding_members`, usando o client da própria requisição (RLS como defesa em profundidade, não o client admin) — chamada explicitamente pelos handlers do caminho administrativo, não é middleware |
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

Um projeto Supabase por ambiente, nunca compartilhado — evita que dados de teste/desenvolvimento se misturem com dados reais de convidados, o que seria particularmente grave dado o caráter sensível dessa informação (CLAUDE.md 28.1).

**Decisão atual (produção inicial): 2 ambientes — `dev` e `prod`**, não 3. `dev` é o projeto já usado desde a Fase 0 (onde toda a implementação é validada contra dados reais de schema, mas fictícios); `prod` é um projeto novo, separado, criado só quando a plataforma foi ao ar pela primeira vez (CLAUDE.md 33/4.4 — múltiplos casamentos por instância, cada um com sua própria URL `/{slug}`). Ambos cabem no plano gratuito do Supabase (2 projetos ativos por organização). Mapeamento para a Vercel: `Production` (branch `main` publicada) aponta para `prod`; `Preview` + `Development` (qualquer outra branch/PR) apontam para `dev` — assim uma preview deployment nunca toca dado real.

**Exceção deliberada — Redis (Upstash, rate limiting) é compartilhado entre `dev` e `prod`**, não replicado por ambiente: o plano gratuito da Upstash só inclui 1 banco, e criar um segundo custa uma taxa mensal — cadastrar cartão de crédito na Upstash converte *todos* os bancos da conta para cobrança por uso, não só o novo. Como o Redis aqui guarda só contadores de rate-limit (nunca dado de convidado), o risco de compartilhar é baixo (no pior caso, um teste em `dev` consome parte da cota de `prod`) — desproporcional ao custo de separar. Reavaliar se algum dia isso causar um problema real; separar depois é uma mudança pontual e barata.

Um terceiro ambiente (`staging`, entre `dev` e `prod`) é uma extensão natural — mesmo padrão de projeto Supabase dedicado, promovido automaticamente a cada merge em `main`, servindo de gate antes da promoção manual para `prod` — mas não foi criado nesta primeira fase de produção; adicionar depois é só repetir o mesmo processo descrito abaixo com o projeto novo, sem mudança estrutural.

### 4.2 Fluxo de migrations

1. Toda mudança de schema nasce como uma migration local (Supabase CLI), testada contra o ambiente `dev`.
2. Migration é revisada em PR como qualquer mudança de código (CLAUDE.md 29) — incluindo revisão explícita de qualquer nova RLS policy.
3. Promoção para `prod` é uma etapa manual e deliberada (nunca automática), dado que envolve dados reais de casamentos ativos: `supabase link --project-ref <ref-prod>` + `supabase db push`, feito só depois da migration já validada em `dev`. (Se/quando `staging` existir como terceiro ambiente, ele entra nesse fluxo como uma promoção automática intermediária, antes da promoção manual para `prod` — ver 4.1.)
4. Migrations são estritamente aditivas/reversíveis quando possível; mudanças destrutivas (`DROP COLUMN`, `NOT NULL` retroativo) seguem um processo de duas etapas (deploy que tolera ambos os estados → migration de limpeza posterior) para nunca quebrar uma versão de código já em produção.
5. `supabase/seed.sql` nunca roda em `prod` — é dado fictício de desenvolvimento local (CLAUDE.md 11, seção 9.4 abaixo). Casamentos reais em `prod` são cadastrados manualmente (`weddings` + `wedding_members`, CLAUDE.md 33.2) — sem tela de self-service ainda.

### 4.3 Padrão de autoria de RLS

- Uma policy por operação (`select`/`insert`/`update`/`delete`), nunca uma policy genérica "para tudo" — mais fácil de auditar individualmente.
- Toda nova tabela nasce com RLS habilitada e **nenhuma policy** (deny-by-default); policies são adicionadas explicitamente, nunca o inverso (nascer aberta e depois restringir).
- Cada policy nova exige um teste correspondente na suíte `tests/integration/rls/` antes do merge — é a aplicação prática da exigência já registrada no CLAUDE.md (33.4).

### 4.4 Funções Postgres para operações transacionais

Operações com controle de concorrência explícito (CLAUDE.md 13/16.4/18.3) — reserva de presente, acompanhante avulso contra `invites.max_companions` — são implementadas como funções Postgres versionadas em `supabase/migrations/` (`reserve_gift`, `upsert_guest_rsvp`, `finalize_invite_rsvp`, `sync_guest_party`), chamadas via RPC pelo backend, e não como uma sequência de `SELECT`+`INSERT` orquestrada em TypeScript. Isso garante que o bloqueio (`SELECT ... FOR UPDATE`) e a escrita aconteçam na mesma transação, sem round-trip de rede entre as duas etapas. Nenhuma é `SECURITY DEFINER`: rodam com o papel de quem chama, para que o caminho administrativo continue protegido por RLS como defesa em profundidade (o caminho do convidado já ignora RLS via `service_role`, ver 4.5). `confirm_rsvp()` (Fase 1) foi dropada e substituída pelas duas funções de RSVP acima quando o modelo virou sempre-por-convidado (CLAUDE.md, "Fase 7" no roadmap); `cancel_gift_reservation()` permanece no schema mas está órfã desde que o cancelamento self-service de presentes foi removido (ver 8.4) — nenhum código a chama mais.

`confirm_gift_payment()` (CLAUDE.md 18.4/28.3) segue o mesmo padrão, com uma nuance: o `SELECT ... FOR UPDATE` na própria linha de `gift_payments` funciona como gate de **idempotência**, não de controle de estoque — e uma falha de domínio esperada dentro dela (`GIFT_UNAVAILABLE`, capturada via bloco `EXCEPTION`) é gravada como `status='failed'` em vez de propagada como exceção, porque uma exceção não tratada reverteria a transação inteira da chamada RPC, apagando justamente o registro que precisa ficar visível pro casal resolver manualmente.

### 4.5 Storage

Buckets dedicados a imagens **próprias do casal** (foto de capa `wedding-covers`, foto da seção Nossa História, imagem de `event_segments`), particionados por `wedding_id` no path do objeto, com leitura pública (site do casamento é público) e escrita restrita a membros autenticados do respectivo `wedding_id`. Validação de tipo/tamanho de arquivo (CLAUDE.md 28) acontece no `server/api` antes do upload — o client nunca faz upload direto sem essa checagem prévia.

**Galeria não usa mais Storage** (CLAUDE.md, Fase Galeria via Google Drive): `photos` deixou de guardar bytes no nosso Storage e passou a **referenciar** arquivos de uma fonte externa espelhada (Google Drive), servidos direto do Google (thumbnail). O bucket `wedding-photos` deixou de receber escrita (policies de escrita removidas; DROP em limpeza posterior). O upload manual (`POST /api/photos`) foi removido. Ver o fluxo de sincronização abaixo.

### 4.5.1 Sincronização da galeria (Google Drive)

A conexão do casamento com a fonte vive em `gallery_source_connections` (uma por `wedding_id`), em dois modos: `oauth` (conta do casal via Google Identity Services + Picker, escopo `drive.readonly`, tokens cifrados em repouso com AES-256-GCM — `server/utils/token-cipher.ts`) ou `public_link` (pasta pública listada via API key do projeto). O driver do Drive é isolado em `server/utils/google-drive.ts` (mesmo padrão `{ ok, ... }` de `infinitepay.ts`), e o espelhamento em `server/utils/gallery-sync.ts#syncGalleryConnection` — `photos` reflete a pasta atual (novos entram, removidos na origem saem, metadado nosso — legenda/ordem/foco — preservado por `source_file_id`). O sync escreve com service_role (mesmo modelo do worker assíncrono, §3.4), disparado por dois gatilhos que convergem no mesmo código: cron diário da Vercel (`GET /api/cron/sync-galleries`, autorizado por `CRON_SECRET` — o plano free limita cron a 1x/dia) e botão manual (`POST /api/wedding/gallery/sync`, autorizado por `requireWeddingContext`). Nenhum token é exposto na leitura do client (endpoints selecionam colunas explícitas sem as de token).

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
| Configurações do evento, tema, conteúdo, galeria | `/api/wedding/*` | Admin (JWT) | Não |
| Convidados | `/api/guests` | Admin (JWT) | Não |
| Convites (unidade de RSVP) | `/api/invites`, `/api/invite-tags`, `/api/guest-access-tokens` | Admin (JWT) | Não |
| Grupos (etiqueta livre) | `/api/groups` | Admin (JWT) | Não |
| Cronograma | `/api/event-segments` | Admin (JWT) | Não |
| Galeria (fotos) | `/api/photos/*` | Admin (JWT) | Não |
| Site público (evento, cronograma, presentes, fotos, busca de RSVP) | `/api/public/[slug]/*` | Pública (sem auth, sem token — CLAUDE.md 4.5) | Busca de RSVP: **sim** |
| RSVP — link/QR direto | `/api/rsvp/[code]` | Convidado (token) | **Sim** |
| RSVP — busca por nome | `/api/public/rsvp-search/*` | Convidado (sem token, ver 6.2) | **Sim** |
| RSVP — resposta/finalização | `/api/rsvp/guests/[guestId]`, `/api/rsvp/invites/[inviteId]/finalize` | Convidado (token ou busca) | **Sim** |
| Presentes (CRUD/leitura admin) | `/api/gifts`, `/api/gift-categories` | Admin (JWT) | Não |
| Presentes (reserva grátis/checkout online) | `/api/public/gifts/[id]/*` | Pública (sem token — CLAUDE.md 4.5/18/32) | **Sim** |
| Pagamento online (status/webhook) | `/api/public/gifts/payments/*` | Pública (paymentId como credencial) / InfinitePay (sem auth) | Status: **sim**. Webhook: não (defesa é `payment_check`, não IP — CLAUDE.md 28.3) |
| Cron de sincronização de galeria | `/api/cron/sync-galleries` | Vercel Cron (`CRON_SECRET`) | Não |
| Administração | `/api/admin/*` | Admin (JWT, `owner`) | Não |
| Comunicações | *(não implementado ainda — Fase 2 do roadmap)* | — | — |

`/api/wedding` e `/api/event-segments` (admin) são endpoints **distintos** de `/api/public/[slug]/wedding` e `/api/public/[slug]/event-segments`: a leitura administrativa resolve `wedding_id` a partir do JWT e usa o client da requisição (RLS como defesa em profundidade — 5.3); a leitura pública não recebe nenhuma credencial e depende da policy `select_public` (CLAUDE.md 4.5) para não vazar nada além do que já é público por natureza. Endpoints separados, em vez de um único handler com lógica condicional por autenticação, mantêm cada um com um único modelo de autorização para raciocinar.

### 5.2 Convenções de request/response

- Respostas de sucesso sempre retornam o recurso (ou lista) diretamente, sem envelope desnecessário; listagens paginadas retornam metadados de paginação em um objeto irmão (`{ data, meta: { page, pageSize, total } }|`), nunca misturado no mesmo nível dos itens.
- Erros seguem o formato único descrito em 3.5 — o client tem um único parser de erro para toda a aplicação, nunca um por endpoint.
- Paginação por parâmetros de query (`page`, `pageSize`), com `pageSize` máximo travado no servidor (evita que um client mal-intencionado peça a base inteira de uma vez, reforça CLAUDE.md 27).

### 5.3 Quatro personas de API, quatro modelos de autorização

Espelhando o modelo de confiança do CLAUDE.md (4.5/14.6):

- **API administrativa**: cada handler resolve `wedding_id` a partir do JWT (via `wedding_members`) e nunca aceita `wedding_id` vindo do body/query da requisição para decidir o que é acessível — o JWT é a única fonte de verdade sobre qual evento o usuário pode tocar.
- **API do convidado (RSVP)**: dois caminhos (ver 6.2) — o handler resolve o registro a partir do hash do token recebido na URL (link/QR) **ou** a partir de uma busca por nome sem credencial (`rsvp-search`, fricção via nomes mascarados, não prova de identidade). Em ambos, todo o restante da autorização (esse `guest`/`invite` pertence a esse `wedding`) é revalidado explicitamente dentro do handler — nunca assumida a partir de um único join solto.
- **API de presentes** (`/api/gifts/[id]/*`, `/api/gifts/payments/*`): sem token nenhum (CLAUDE.md 4.5/18/32) — qualquer requisição bem-formada é aceita, rate limitada por IP. `wedding_id` é resolvido a partir do próprio `gift_id`/`paymentId` da URL (que já o determina unicamente), nunca de uma credencial de identidade. A "autorização" aqui não é "esse recurso pertence a este usuário", é "o valor/quantidade envolvidos são sempre recalculados no servidor, nunca aceitos do client" — um modelo qualitativamente diferente dos dois anteriores.
- **API pública** (`/api/public/*`, leitura): nenhum handler recebe ou valida credencial — a autorização é inteiramente delegada à policy RLS `select_public` da tabela consultada (CLAUDE.md 4.5). Por isso esse handler só pode existir para tabelas sem nenhum dado sensível; adicionar um novo endpoint em `/api/public/*` exige confirmar antes que a tabela alvo realmente não expõe dado pessoal de convidado.

### 5.4 Idempotência

Endpoints de mutação voltados ao convidado/visitante (`rsvp/[code].post`, `gifts/[id]/reserve.post`, `gifts/[id]/checkout.post`) são desenhados para tolerar reenvio de rede (retry automático do browser em conexão instável) sem efeito duplicado — resposta de RSVP usa o token como chave de upsert (CLAUDE.md 16.4); reserva/checkout de presente é naturalmente idempotente porque a segunda tentativa encontra o recurso já indisponível (ou já reservado por outra pessoa) e retorna um erro de domínio claro, não uma duplicata — sem token nenhum de por trás, já que esse caminho não usa `guest_access_tokens` (5.3). O pagamento Pix (CLAUDE.md 18.4/28.3) leva isso mais longe: `confirmGiftPayment` é idempotente por construção (`gift_payments.status` como gate), e é o único ponto que efetiva `gift_reservations`/`gift_contributions` — webhook duplicado ou corrida entre webhook e "pull" do convidado nunca duplicam o efeito.

---

## 6. Fluxo de Autenticação

### 6.1 Caminho administrativo (casal/colaboradores)

Implementado sobre `@nuxtjs/supabase` (módulo oficial, usa `@supabase/ssr` por baixo) — gerencia os cookies httpOnly/secure e expõe `useSupabaseUser()`/`useSupabaseClient()` no client e `serverSupabaseUser()`/`serverSupabaseClient()`/`serverSupabaseServiceRole()` no server. O redirect automático do módulo é desligado (`redirect: false`); a proteção de rota é o `app/middleware/auth.global.ts` explícito, coerente com o resto da árvore.

```
1. Usuário submete e-mail/senha (ou solicita magic link) em /login
2. Supabase Auth valida e emite JWT (access + refresh), setados como cookies
   httpOnly/secure pelo módulo
3. Login com senha aguarda useSupabaseUser() refletir a nova sessão antes de
   navegar — signInWithPassword() resolve antes do ref reativo atualizar (a
   mudança chega via onAuthStateChange, não sincronamente), e um navigateTo
   imediato bateria no middleware antes do usuário aparecer
4. Navegação para /admin/** → middleware auth.global.ts verifica
   useSupabaseUser() client-side (evita flash de conteúdo protegido) e
   popula app/stores/auth.store.ts via GET /api/auth/session se ainda vazio
   (ex: refresh direto em /admin/algo)
5. GET /api/auth/session no server chama server/utils/wedding-context.ts, que
   usa o client autenticado da própria requisição (não o admin) para ler
   wedding_members — a leitura continua protegida por RLS como defesa em
   profundidade (a checagem client-side é UX, a checagem server-side é a
   que garante segurança)
6. Expiração de access token → refresh automático via refresh token;
   falha no refresh → sessão encerrada, redirecionamento para /login
```

**Não há tela de cadastro/signup**: a criação do `wedding` é manual/via seed nesta fase (CLAUDE.md 33.2), e por consequência a conta do primeiro `owner` também é provisionada manualmente (Supabase Dashboard ou Admin API + um `insert` em `wedding_members`) — nunca por um formulário público. Um fluxo de convite para colaboradores é um recurso de produto separado, não parte da autenticação básica.

**Nota para testes/dev**: `serverSupabaseUser()` retorna o payload cru do JWT — o id do usuário vem na claim `sub`, não em `id` (esse é o formato do objeto `User` da API de Admin, um tipo diferente). Usar `.id` silenciosamente quebra qualquer query filtrada por esse valor.

### 6.2 Caminho do convidado (RSVP) — dois pontos de entrada

> Presentes **não** segue este fluxo desde a "Rodada 4" da Fase Presentes 2.0 (CLAUDE.md, seção 4.5/18/32) — é público, sem token; identificação é só nome/telefone coletados no modal. Ver seção 8.

**A — Link/QR direto**:
```
1. Convidado abre /{slug}/rsvp/{code}
2. A própria página resolve o código via composable no <script setup> — sem middleware, ver correção em 2.4
3. GET /api/rsvp/[code]:
   a. calcula hash do código recebido
   b. busca em guest_access_tokens por code_hash, com revoked_at nulo
   c. não encontrado/revogado → erro de domínio dedicado (nunca "500 genérico",
      para permitir uma tela clara de "link inválido ou expirado")
   d. encontrado → resolve invite + todos os guests do convite + wedding + event_segments,
      retorna apenas esse recorte de dados
```

**B — Busca por nome, sem código** (`/{slug}/rsvp`):
```
1. GET /api/public/[slug]/rsvp-search?q=... → RPC search_guests_by_name (busca tolerante:
   acentuação, ordem invertida, apelido, parcial) → retorna só {guestId, fullName}, no máximo
   8 resultados, filtrando convidados sem invite_id (nada a confirmar)
2. POST /api/public/rsvp-search/select { guestId } → "confirmação leve": retorna os nomes
   MASCARADOS dos demais membros do mesmo convite, sem revelar guestId de terceiros
3. Convidado confirma "sim, sou eu" → POST /api/public/rsvp-search/confirm { guestId } →
   retorna o mesmo payload completo do caminho A (equivalente a GET /api/rsvp/[code])
```

Os dois caminhos convergem na mesma tela (lista de convidados do convite). Cada convidado responde de forma independente:
```
4. PUT /api/rsvp/guests/[guestId] (upsert_guest_rsvp) — autosave a cada toque em
   confirmar/recusar, sem lock de convite; grava evento em invite_events
5. POST /api/rsvp/invites/[inviteId]/finalize (finalize_invite_rsvp) — revisão final:
   acompanhante avulso (só se guest_list_mode='open', SELECT ... FOR UPDATE na linha do
   convite contra max_companions) + mensagem única ao casal
```

### 6.3 Diferença de postura entre os caminhos

O caminho administrativo tem duas camadas de checagem (client para UX, RLS no banco como última linha — CLAUDE.md 4.5). Os dois caminhos do convidado têm uma única camada real de enforcement, inteiramente no `server/api` — por isso todo endpoint desses caminhos é tratado, na suíte de testes (seção 9), com o mesmo rigor que se testaria uma policy de RLS. Entre si, os dois caminhos do convidado também têm posturas diferentes: o link/QR prova posse de uma credencial (o token); a busca por nome não prova nada, só adiciona fricção (nomes mascarados) — um trade-off deliberado de UX sobre segurança, aceito na "Fase Jornada do Convidado" (CLAUDE.md, seção 32/14.5).

---

## 7. Fluxo de RSVP

RSVP é sempre **por convidado** — não existe mais um envio único que cobre todo um grupo de uma vez (ver CLAUDE.md, seção 16, e "Fase 7" no roadmap).

### 7.1 Carregamento inicial

```
1. Caminho A (GET /api/rsvp/[code]) ou caminho B (busca por nome + confirmação leve,
   ver 6.2) resolvem o mesmo payload: dados do wedding (nome do casal, data,
   event_segments) + todos os guests do invite, cada um com sua própria resposta
   (se já existir, para reabrir em modo de edição)
2. Página renderiza a lista de convidados do convite — cada um com seu próprio
   estado de confirmar/recusar, não um formulário único para o convite inteiro
```

### 7.2 Submissão — por convidado

```
1. Client valida com o schema Zod compartilhado (feedback imediato)
2. PUT /api/rsvp/guests/[guestId] com { status: 'confirmed' | 'declined', dietaryRestrictions? }
3. Handler revalida o guestId contra o invite já resolvido (caminho A ou B) e o schema no server
4. RPC upsert_guest_rsvp() — sem lock de convite (cada convidado é independente):
   upsert em rsvp_responses (chave: guest_id, único), grava responded_at,
   registra o evento em invite_events na mesma transação
5. Sucesso → resposta confirma o novo estado; UI atualiza esse convidado imediatamente
   (autosave a cada toque, não um submit único no fim do formulário)
6. Job assíncrono (opcional, Fase 2): enfileira e-mail de confirmação, registrado em communications
```

Recusar (`status: 'declined'`) usa o mesmo endpoint — não coleta `dietaryRestrictions` no client (CLAUDE.md 16.3), mas a validação de negócio real (não há acompanhante avulso a checar aqui) só entra na revisão final (7.3).

### 7.3 Revisão final do convite (acompanhante avulso + mensagem)

```
1. Depois de cada convidado responder, a tela de revisão final chama
   POST /api/rsvp/invites/[inviteId]/finalize com { companions?: [...], message? }
2. RPC finalize_invite_rsvp():
   a. abre transação
   b. SELECT ... FOR UPDATE na linha do invite (trava a checagem de max_companions)
   c. só processa companions se weddings.guest_list_mode = 'open'
   d. conta acompanhantes avulsos novos — excede invites.max_companions → aborta
      transação, retorna erro de domínio ("limite de acompanhantes do convite atingido")
   e. dentro do limite → soft-delete dos companions anteriores + insert dos novos
      (nunca hard delete — histórico), grava invites.rsvp_message/rsvp_message_at
   f. commit
```

### 7.4 Edição de resposta já enviada

Reenvio do formulário até `rsvp_deadline` segue exatamente os mesmos dois endpoints (upsert por `guest_id`, revisão final idempotente) — não existe um endpoint separado de "editar", o que elimina uma classe inteira de bugs de divergência entre "criar" e "editar". Após `rsvp_deadline`, os handlers recusam a escrita com um erro de domínio específico (`RsvpClosedError`), e a UI já havia colocado a tela em somente leitura preventivamente (CLAUDE.md 16.2).

### 7.5 Reflexo no dashboard administrativo

O dashboard (CLAUDE.md 19) não recebe push em tempo real (CLAUDE.md 16.4/27) — os contadores são computados em memória a cada carregamento/refetch da página administrativa, em `server/api/dashboard/summary.get.ts` (via `serverSupabaseClient`, respeitando RLS). A view `wedding_rsvp_summary` que fazia isso na Fase 1 foi removida por achado de segurança (CLAUDE.md 28.4) — estava órfã desde a reescrita do dashboard.

---

## 8. Fluxo de Presentes

> Reescrito na "Fase Presentes 2.0" (CLAUDE.md 18/32) — a vitrine pública ganhou três seções (Lista de Presentes, Contribuições, Presentes Emocionais) e um caminho de pagamento online real via InfinitePay, que convive com o caminho gratuito original. **Rodada 4** removeu o token de convite do módulo inteiro (CLAUDE.md 4.5/18/32) — diferente de RSVP (seção 7), presentes não usa `guest_access_token`: a página é pública a qualquer momento, e a identificação de quem presenteia é só nome/telefone, coletados no modal antes de qualquer ação.

### 8.1 Navegação e listagem pública

```
1. GET /api/public/[slug]/gifts — leitura pública, sem token, sem query
   de identificação (calcula hasPixOption a partir de weddings.infinitepay_handle
   e physicalDeliveryMode a partir de weddings.physical_gift_delivery_mode)
2. Presentes retornados já incluem estado agregado: quantityAvailable para
   itens simples, { collectedAmountCents, targetAmountCents, quotaAmountCents }
   para presentes de cota, e displayStyle/emotionalIcon para diferenciar
   "Contribuições" de "Presentes Emocionais" na UI — sem reservedByMe/
   contributedByMeCents (dependiam do token, que não existe mais; o servidor
   não tem mais como saber "quem é o convidado" entre uma visita e outra)
3. Client segmenta a resposta em 3 listas (shared/utils/filter-gifts.ts#segmentGifts)
   — física / contribuições / emocionais — nunca o servidor devolvendo três
   payloads separados, é a mesma lista de presentes vista sob três lentes
```

### 8.2 Identificação + reserva grátis de presente simples ("vou comprar e entregar")

```
1. Convidado abre o modal de escolha (GiftDeliveryChoiceModal) → se ainda não
   se identificou nesta sessão, primeiro informa nome (obrigatório) e
   telefone (opcional) — useGiftGiverIdentity, useState do Nuxt, reaproveitado
   em todos os presentes/contribuições da mesma visita
2. Escolhe "vou comprar e entregar" → POST /api/gifts/[id]/reserve com
   { giverName, giverPhone?, message? } — sem token/code
3. Handler chama RPC reserve_gift() diretamente (sem resolver nenhum token):
   a. abre transação
   b. SELECT ... FOR UPDATE na linha do gift
   c. quantity_available = 0 → aborta, erro de domínio ('GIFT_UNAVAILABLE')
   d. disponível → decrementa quantity_available, insere gift_reservations
      (guest_id/group_id sempre null; contributor_name/giver_phone = a
      identificação do modal), commit
4. Resposta atualiza a UI para o estado 'reserved' imediatamente — nenhum
   dinheiro passa pela plataforma neste caminho
```

### 8.3 Pagamento online (presente físico pago, contribuição livre ou em cotas fixas)

```
1. Convidado (já identificado, passo 8.2.1) escolhe "enviar valor pelo link
   de pagamento" (presente físico) ou contribui/compra cotas (presente de
   cota) → POST /api/gifts/[id]/checkout com { giverName, giverPhone?, ... }
2. Handler resolve wedding_id a partir do próprio gift_id (sem token), calcula
   amount_cents SEMPRE no servidor (nunca aceita valor do client, exceto
   contribuição de valor livre), cria uma linha gift_payments (status='pending',
   invite_id sempre null) e chama a API de checkout hospedado da InfinitePay
   (server/utils/infinitepay.ts#createInfinitePayCheckoutLink)
3. Browser navega (redirect completo) para o checkout hospedado da
   InfinitePay — não há geração de QR Code embutida na própria página
4. Convidado paga (Pix ou cartão) → InfinitePay redireciona de volta para
   /{slug}/presentes/pagamento/{paymentId} (com transaction_nsu/slug na
   querystring — achado real, necessários pro passo 5) E, em paralelo, chama
   o webhook (POST /api/gifts/payments/webhook) — só alcançável em produção,
   não em localhost
5. Os dois caminhos convergem em server/utils/gift-payment.ts#confirmGiftPayment
   — NUNCA confia no corpo do webhook, no retorno do navegador, nem no
   próprio paymentId isoladamente como prova de pagamento; sempre reverifica
   servidor-a-servidor via payment_check (com transaction_nsu/slug) antes de
   qualquer efeito (CLAUDE.md 28.3, detalhamento completo). O paymentId em si
   funciona como credencial de leitura de status (UUID não enumerável), mas
   nunca como prova de pagamento
6. Pago confirmado → RPC confirm_gift_payment() chama reserve_gift() (kind
   reservation) ou insere gift_contributions (kind contribution), atomicamente,
   e marca gift_payments.status='confirmed'. Corrida com o caminho gratuito
   (última unidade levada nesse meio-tempo) vira status='failed', nunca uma
   exceção que reverteria o registro do pagamento em si
7. Idempotência: gift_payments.status já não-'pending' é um no-op imediato —
   webhook duplicado ou corrida entre webhook e "pull" do convidado não
   duplica nem reprocessa nada
```

### 8.4 Cancelamento

Não existe mais self-service (CLAUDE.md 18.3/32) — `POST /api/gifts/[id]/cancel` e `giftCancelSchema` foram removidos junto com o token de convite: sem ele, não haveria como autenticar com segurança que quem está pedindo o cancelamento é a mesma pessoa que presenteou (nome/telefone sozinhos são triviais de forjar). Qualquer cancelamento — pago ou grátis — é resolvido falando direto com o casal, que ajusta manualmente pelo painel administrativo se necessário.

### 8.5 Visão administrativa

`/api/gifts` (variante autenticada) devolve, além da lista, um `paymentsSummary` mínimo (bruto arrecadado online confirmado, contagem de pagamentos com falha) e um `activity` — as até 20 reservas/contribuições mais recentes do casamento inteiro, cross-presente, com nome, telefone, presente, valor (quando pago) e mensagem — sem relatório completo de taxas/estornos, que dependeria de a InfinitePay documentar publicamente esses dados (CLAUDE.md 18.5/18.6). A listagem administrativa por item (CLAUDE.md 19) expõe quem reservou/contribuiu o quê, mensagem do convidado e status de pagamento — informação propositalmente **não exposta** na vitrine pública (CLAUDE.md 18.2), usada apenas para agradecimento pós-evento e resolução manual de pagamentos com falha.

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

**Estado real (não aspiracional)**: `tests/integration/{api,rls,guest-path}/` existem como pastas escafoldadas (só `.gitkeep`) — nenhum teste de integração/RLS/caminho-do-convidado foi escrito ainda. A cobertura de segurança hoje vem de `tests/unit/server/` (ex.: `guest-access-token.spec.ts`, `gift-payment.spec.ts`) e de `tests/e2e/` (3 specs: `smoke`, `login`, `guests-invites-rsvp`), não das três suítes dedicadas descritas abaixo. Preencher `rls/` e `guest-path/` continua sendo pré-requisito explícito antes da abertura multi-tenant (CLAUDE.md 33.4) — a ausência delas é uma lacuna real, não só de documentação.

### 9.2 Por que duas suítes de integração separadas (RLS vs. caminho do convidado)

Essa separação não é redundância — são dois mecanismos de enforcement diferentes (CLAUDE.md 4.5/14.6), cada um podendo falhar de forma independente. Um teste de RLS que passa não diz nada sobre a segurança do `server/api/rsvp/[code]`, porque esse endpoint usa a `service_role key` e nunca é avaliado por RLS. Tratar as duas como a mesma suíte esconderia essa lacuna.

### 9.3 Fluxos cobertos por E2E (mínimo obrigatório antes de qualquer release)

- Convidado confirma presença (link/QR e busca por nome) e, na revisão final, adiciona acompanhante avulso respeitando `invites.max_companions`.
- Convidado tenta adicionar acompanhante avulso além do `max_companions` — vê erro claro, não um erro genérico.
- Convidado recusa presença (caminho curto, sem campos de acompanhante/dietary).
- Convidado edita uma resposta já enviada antes do `rsvp_deadline`.
- Convidado tenta responder após `rsvp_deadline` — formulário em somente leitura.
- Convidado se identifica (nome/telefone) e reserva presente simples sem custo ("vou comprar e entregar"); segunda tentativa concorrente ao mesmo item vê "esgotado".
- Convidado paga um presente físico ou contribui (valor livre ou cotas) via checkout online; volta pra `/presentes/pagamento/[paymentId]` e vê o status confirmado após o `payment_check` real.
- Convidado tenta cancelar um item já pago — não há caminho self-service (CLAUDE.md 18.4/32); a orientação exibida é contato direto com o casal.
- Casal faz login, importa CSV de convidados, acompanha o job de importação até concluir.
- Casal exclui um convidado e confirma que o histórico de RSVP associado é preservado (soft delete).
- Colaborador sem permissão de `owner` tenta acessar configurações restritas e é bloqueado.

### 9.4 Dados de teste

Fábricas de dados (`tests/factories` — não confundir com seed de produto) geram `wedding`, `invite`, `guests` e `gifts` com valores mínimos válidos, permitindo que cada teste declare apenas o que é relevante para o cenário em questão. `supabase/seed.sql` continua servindo apenas para desenvolvimento manual local, nunca para os testes automatizados (que devem ser determinísticos e isolados entre execuções).

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
