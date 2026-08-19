# CLAUDE.md — Especificação Técnica e de Produto

> Este documento é a fonte única de verdade (single source of truth) para o desenvolvimento do **Wedding Platform**. Toda decisão de arquitetura, convenção de código, modelagem de dados e prioridade de produto deve ser consultada e mantida atualizada aqui. Qualquer assistente de IA (Claude Code) ou desenvolvedor humano que trabalhe neste repositório deve ler este arquivo antes de propor mudanças estruturais.

**Status:** Documento vivo — Fase 0 e Fase 1 (MVP single-tenant) implementadas; ver roadmap (seção 32) para o detalhamento do que falta nas fases seguintes.

---

## Documentação Relacionada

O detalhamento técnico de execução — estrutura de diretórios completa, ciclo de vida de requisição do Nitro, estratégia Supabase por ambiente, organização das APIs e fluxos ponta a ponta de autenticação, RSVP e presentes, além da estratégia de testes — está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). O histórico de decisões, achados de bugs reais e rodadas de iteração de cada fase de trabalho — que não é necessário ler para executar uma tarefa nova, mas explica o "porquê" de decisões não óbvias — está em [`docs/CHANGELOG.md`](docs/CHANGELOG.md).

- Este arquivo (CLAUDE.md) continua sendo o **documento principal e a fonte única de verdade** do projeto: decisões de produto, modelagem de dados, convenções de código e regras de negócio nascem e vivem aqui — sempre descrevendo **o estado atual**, nunca narrativa de processo.
- `docs/ARCHITECTURE.md` é um documento **complementar e subordinado** — ele não redefine nada do que está aqui, apenas aprofunda como essas decisões se traduzem em execução técnica.
- `docs/CHANGELOG.md` é **só histórico** — achado de bug, reversão de escopo, rodada de iteração dentro de uma fase. Nunca a única fonte de uma regra atual: se um comportamento só está documentado lá, falta trazê-lo pra cá (ver regra de manutenção na seção 32).
- `docs/ARCHITECTURE.md` deve ser **consultado (e atualizado, quando aplicável) antes de qualquer alteração estrutural** — mudança na estrutura de pastas, no ciclo de vida de requisição, na estratégia Supabase, na organização das APIs ou nos fluxos críticos ali documentados.
- Em caso de conflito entre os dois documentos, **este CLAUDE.md prevalece** — a divergência é sinal de que `docs/ARCHITECTURE.md` está desatualizado e precisa ser corrigido.

---

## Índice

- [Documentação Relacionada](#documentação-relacionada)

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Objetivos do Projeto](#2-objetivos-do-projeto)
3. [Stack Tecnológica](#3-stack-tecnológica)
4. [Arquitetura do Sistema](#4-arquitetura-do-sistema)
5. [Estrutura de Pastas](#5-estrutura-de-pastas)
6. [Convenções de Código](#6-convenções-de-código)
7. [Padrões Vue / Nuxt](#7-padrões-vue--nuxt)
8. [Padrões TypeScript](#8-padrões-typescript)
9. [Organização de Componentes](#9-organização-de-componentes)
10. [Estratégia de Gerenciamento de Estado](#10-estratégia-de-gerenciamento-de-estado)
11. [Banco de Dados](#11-banco-de-dados)
12. [Modelo Entidade-Relacionamento](#12-modelo-entidade-relacionamento)
13. [Convenções SQL](#13-convenções-sql)
14. [Fluxo de Autenticação](#14-fluxo-de-autenticação)
15. [Sistema de Convidados](#15-sistema-de-convidados)
16. [Sistema de RSVP](#16-sistema-de-rsvp)
17. [Sistema de Convites e Grupos](#17-sistema-de-convites-e-grupos)
18. [Sistema de Presentes](#18-sistema-de-presentes)
19. [Sistema Administrativo](#19-sistema-administrativo)
20. [Experiência do Usuário (UX)](#20-experiência-do-usuário-ux)
21. [Interface do Usuário (UI)](#21-interface-do-usuário-ui)
22. [Design System](#22-design-system)
23. [Componentes Reutilizáveis](#23-componentes-reutilizáveis)
24. [Responsividade](#24-responsividade)
25. [Acessibilidade](#25-acessibilidade)
26. [SEO](#26-seo)
27. [Performance](#27-performance)
28. [Segurança](#28-segurança)
29. [Controle de Versão](#29-controle-de-versão)
30. [Git Flow](#30-git-flow)
31. [Convenções de Commit](#31-convenções-de-commit)
32. [Roadmap](#32-roadmap)
33. [Estratégia SaaS Futura](#33-estratégia-saas-futura)

---

## 1. Visão Geral do Produto

O **Wedding Platform** é uma aplicação web voltada para casais que estão organizando seu casamento e precisam de uma ferramenta central para:

- Publicar um site de casamento personalizado (história do casal, data, local, cronograma do evento, galeria de fotos).
- Gerenciar a lista de convidados de forma estruturada, incluindo grupos familiares e acompanhantes.
- Coletar confirmações de presença (RSVP) com suporte a restrições alimentares, número de acompanhantes e mensagens.
- Disponibilizar uma lista de presentes (física, digital ou "cota" para lua de mel) com controle de reservas para evitar duplicidade.
- Fornecer um painel administrativo para os noivos (ou um planejador de casamentos contratado) acompanharem métricas de confirmação, presentes e comunicação com convidados.

O produto nasce como uma aplicação de uso único por casamento (single-tenant, uso por evento), mas é desenhado desde o início para evoluir para um modelo **multi-tenant SaaS**, onde múltiplos casais podem criar suas próprias instâncias de forma independente (ver seção 33).

### 1.1 Personas

| Persona | Descrição | Necessidades principais |
|---|---|---|
| **Noivo(a) / Casal** | Dono(a) da conta, administra o evento | Configurar site, gerenciar convidados, acompanhar RSVPs e presentes |
| **Convidado** | Recebe o convite e acessa o site público | Ver informações do evento, confirmar presença, escolher presente |
| **Colaborador/Família** | Auxilia o casal na organização (ex: mãe da noiva) | Acesso limitado ao painel administrativo (permissões) |
| **Planejador de Casamento** | Profissional contratado, pode gerenciar múltiplos eventos | Visão consolidada de múltiplos casamentos (papel futuro, SaaS) |

### 1.2 Proposta de Valor

- **Centralização**: substitui planilhas soltas, grupos de WhatsApp e formulários avulsos por uma única fonte de verdade.
- **Simplicidade para o convidado**: RSVP em poucos cliques, sem necessidade de criar conta.
- **Clareza para o casal**: dashboard com números reais de confirmados, pendentes e presentes reservados.
- **Personalização visual**: cada casal pode aplicar sua identidade visual (cores, fontes, fotos) dentro de um Design System consistente.

---

## 2. Objetivos do Projeto

### 2.1 Objetivos de Produto

1. Permitir que um casal configure um site de casamento funcional em menos de 30 minutos.
2. Reduzir a taxa de não-resposta de convidados através de lembretes e UX de RSVP simplificada.
3. Eliminar presentes duplicados através de reservas em tempo real.
4. Fornecer visibilidade total do status do evento (confirmados, grupos, presentes) em um único painel.
5. Garantir que o site público funcione perfeitamente em dispositivos móveis, já que a maioria dos convidados acessará via link enviado por WhatsApp.

### 2.2 Objetivos Técnicos

1. Base de código tipada de ponta a ponta (TypeScript estrito, sem `any` implícito).
2. Arquitetura que permita evoluir de single-tenant para multi-tenant sem reescrita completa.
3. Modelagem de banco de dados normalizada, com integridade referencial garantida via constraints, não apenas via aplicação.
4. Cobertura de testes automatizados crescente, priorizando fluxos críticos (RSVP, reserva de presentes, autenticação).
5. Performance de carregamento do site público competitiva (LCP < 2.5s em 4G) por ser a principal porta de entrada de convidados.
6. Segurança adequada ao tratar dados pessoais de convidados (nome, telefone, e-mail, restrições alimentares).

### 2.3 Não-objetivos (nesta fase)

- Não construir um app mobile nativo.
- ~~Não implementar pagamentos/gateway financeiro para presentes em dinheiro~~ — superado na "Fase Presentes 2.0" (seção 18/32), decisão explícita do usuário: pagamento Pix real via InfinitePay, apesar do não-objetivo original desta seção. Relatórios financeiros completos (taxas, estornos, exportação) continuam fora de escopo.
- Não suportar múltiplos idiomas na v1 (i18n é item de roadmap).
- Não implementar múltiplos tenants/contas na v1 (arquitetura já prepara terreno, mas não é exposta ao usuário).

---

## 3. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework Frontend/Fullstack | **Nuxt 4** (Vue 3, Composition API) | SSR/SSG nativo (importante para SEO do site público), file-based routing, Nitro server engine |
| Linguagem | **TypeScript** (`strict: true`) | Segurança de tipos ponta a ponta, incluindo camada de servidor (Nitro) |
| Estilização | **Tailwind CSS** + **CSS Variables** para tema | Consistência via utilitários, fácil customização de tema por casamento |
| Componentes UI base | **Reka UI** (headless) + componentes próprios do Design System | Acessibilidade garantida por primitives headless, visual 100% controlado |
| Gerenciamento de estado | **Pinia** | Padrão oficial do ecossistema Vue/Nuxt, tipagem excelente, devtools |
| Backend / API | **Nitro server routes** (`server/api/**`) dentro do próprio Nuxt | Evita manter dois deploys separados na fase inicial |
| Banco de dados | **PostgreSQL** (via Supabase) | Relacional, suporta Row Level Security (essencial para o futuro multi-tenant), extensões maduras |
| Camada de dados/auth | **Supabase** (Postgres + Auth + Storage) | Acelera fase inicial sem abrir mão de portabilidade (é Postgres puro por baixo) |
| Migrations | **Supabase CLI / SQL migrations versionadas** | Migrations declarativas e versionadas junto ao código |
| Validação de schema | **Zod** | Validação compartilhada entre client e server (mesmo schema) |
| Formulários | **VeeValidate** + Zod resolver | Padroniza validação de formulários complexos (RSVP, cadastro de convidado) |
| Testes unitários | **Vitest** | Integração nativa com Vite/Nuxt |
| Testes E2E | **Playwright** | Fluxos críticos: RSVP público, reserva de presente, login admin |
| Lint/Format | **ESLint** (`@nuxt/eslint`) + **Prettier** | Consistência de estilo automatizada |
| E-mail transacional | **Resend** (ou provedor equivalente) | Envio de convites, lembretes de RSVP, confirmações |
| Cache / Rate limiting | **Upstash Redis** (ou KV equivalente) | Store durável e compartilhado entre instâncias serverless — obrigatório para rate limiting real (ver 28) e idempotência de requisições |
| Processamento assíncrono | **Fila baseada em tabela (`jobs`) + worker/cron** | Evita processar importação de CSV e disparo de e-mails dentro do tempo de vida de uma função serverless síncrona (ver 27) |
| Hospedagem | **Vercel** (ou Netlify) | Deploy integrado com Nuxt, edge functions, preview deployments por PR |
| Observabilidade | **Sentry** (erros) + logs do provedor de hosting | Rastreio de erros em produção |
| CI/CD | **GitHub Actions** | Lint, type-check, testes e build em cada PR |
| Mapa interativo | **Embed do Google Maps** (`google.com/maps?q=...&output=embed` num `<iframe>`) | Mapa do local da Cerimônia/Recepção (`VenueMap.vue`), sem chave de API/billing — usa a URL pública de embed, não a "Maps Embed API" oficial (essa exige chave). Funciona a partir do endereço em texto sozinho (geocodificação do próprio Google) ou de coordenadas quando cadastradas, para mais precisão. Chegou a ser implementado com Leaflet + OpenStreetMap primeiro; trocado por pedido do usuário para bater visualmente com o Google Maps (mesma referência do comparativo desta fase) |
| Pagamento Pix | **InfinitePay** (checkout hospedado — `api.checkout.infinitepay.io`) | Pagamento real de presentes/contribuições ("Fase Presentes 2.0", seção 18). Modelo de checkout hospedado: o convidado é redirecionado pra uma página da InfinitePay (mostra Pix/cartão) e volta pro site depois — não há API pública documentada pra emitir QR Code Pix embutido na própria página. Autenticação é só o `handle` (InfiniteTag pública do casal, `weddings.infinitepay_handle`) — sem API key/token nesse fluxo. Sem split/marketplace nativo (uma única conta recebe tudo) e sem sandbox documentado publicamente — validação é sempre manual, com valores baixos, contra a API real (seção 18.5). O webhook de confirmação não é assinado, o que muda o modelo de confiança do caminho do convidado (seção 28) |

### 3.1 Critérios de escolha

- Preferência por soluções **gerenciadas** (Supabase, Vercel, Resend) na fase inicial para maximizar velocidade de entrega, mantendo portabilidade (Postgres puro, sem lock-in de ORM proprietário).
- Toda escolha de biblioteca deve favorecer **tipagem forte** e **suporte a SSR** (compatibilidade com Nuxt).
- Bibliotecas de UI devem ser **headless ou low-level**, para não conflitarem com o Design System próprio (seção 22).

---

## 4. Arquitetura do Sistema

### 4.1 Visão em Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                    │
│   Site Público do Casamento     │     Painel Administrativo │
│   (SSR/SSG, sem login)          │     (SPA autenticada)      │
└───────────────┬──────────────────────────────┬──────────────┘
                │                               │
                ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nuxt (Nitro Server)                      │
│  server/api/*  → endpoints REST internos                    │
│  server/middleware/* → autenticação, rate limiting           │
│  composables/*  → lógica compartilhada client/server         │
└───────────────┬───────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                          Supabase                            │
│  Postgres (dados)  │  Auth (JWT)  │  Storage (fotos/uploads)  │
│  Row Level Security aplicada em todas as tabelas             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Camadas da Aplicação

1. **Apresentação (pages/ + components/)** — responsável apenas por renderização e interação. Não deve conter lógica de acesso a dados diretamente.
2. **Composables (composables/)** — encapsulam lógica de negócio reutilizável (ex: `useRsvp`, `useInvites`, `useGifts`).
3. **Camada de API (server/api/)** — validação de entrada (Zod), autorização, orquestração de regras de negócio, chamadas ao banco.
4. **Camada de dados (server/utils/db, tipos gerados do Supabase)** — acesso ao Postgres, sempre tipado.
5. **Banco de Dados (Postgres/Supabase)** — fonte de verdade, com constraints e RLS garantindo integridade mesmo se a camada de aplicação falhar.

### 4.3 Renderização

- **Site público do casamento**: SSR (Server-Side Rendering) para SEO e performance de primeira carga; páginas de baixa mutabilidade podem futuramente migrar para ISR/SSG.
- **Painel administrativo**: renderizado como SPA client-side após autenticação (não precisa de SEO), usando `ssr: false` no layout administrativo ou client-only components onde fizer sentido.

### 4.4 Multi-tenancy (preparação)

Embora a v1 opere como single-tenant (um casamento por instância/deploy), o modelo de dados já inclui a entidade `weddings` (evento) como unidade de particionamento lógico. Toda tabela relevante possui `wedding_id` como chave estrangeira, preparando o terreno para RLS baseada em tenant (ver seção 33).

### 4.5 Modelo de Confiança por Fluxo

A arquitetura tem **quatro modelos de enforcement de segurança diferentes**, e isso precisa ser explícito para não gerar falsa sensação de proteção uniforme:

- **Caminho administrativo (casal/colaboradores)**: autenticado via Supabase Auth. As requisições ao Postgres carregam `auth.uid()`, e as **RLS policies são a última linha de defesa** — mesmo um bug no `server/api` não vaza dados de outro `wedding_id`, porque o banco recusa a query.
- **Caminho do convidado (RSVP)**: não há sessão Supabase, e há **dois caminhos de entrada** (ver 14.3) — um token opaco (link/QR) ou busca pública por nome (sem token nenhum, só fricção — nomes mascarados dos demais membros do convite). O Nitro server usa a `service_role key` (que **ignora RLS**) para atender os dois. Isso significa que, para o convidado, **a autorização é inteiramente responsabilidade do código do `server/api`**, não do banco — e no caminho por nome, nem "autorização" é o termo certo, já que não há credencial a validar (ver 14.5).
- **Caminho de presentes (mutação pública, sem token)**: desde a "Fase Presentes 2.0" (seção 18/32), presentear/contribuir **não usa `guest_access_token`** — a página é acessível a qualquer momento, sem link personalizado por convite. Também usa `service_role key` (mesma razão do caminho do convidado: `gift_reservations`/`gift_contributions`/`gift_payments` não têm RLS de escrita pública), mas com uma diferença importante: **não há nenhuma identidade a verificar** — qualquer requisição bem-formada (rate limitada por IP) pode reservar/contribuir. A segurança aqui não é "só o dono pode fazer X", é "o valor/quantidade são sempre calculados no servidor, nunca aceitos do client" (seção 18.4) — um modelo de confiança genuinamente diferente do caminho do convidado, não uma variação dele.
- **Caminho público (site do casamento)**: sem sessão e sem token — qualquer pessoa com o link (ex.: home pública, `GET /api/public/wedding`, `GET /api/public/event-segments`). Como as colunas expostas por esse caminho nunca são sensíveis, o enforcement continua sendo **RLS**, via uma policy de leitura explícita e deliberada (`<tabela>_select_public`, `using (true)`) — o banco permanece a última linha de defesa mesmo sem autenticação alguma, em vez de empurrar essa responsabilidade para o `server/api` como nos dois caminhos anteriores. Esse padrão só é válido para tabelas sem nenhum dado sensível (hoje: `weddings`, `event_segments`, `gifts`, `gift_categories` — leitura) — nunca para `guests` ou qualquer tabela com dado pessoal de convidado identificável.

Consequência prática: tanto o caminho do convidado quanto o caminho de presentes exigem sua própria suíte de testes de segurança — o primeiro validando que um token só retorna dados do próprio `guest`/`group`, o segundo validando que nenhum valor/quantidade é aceito do client sem revalidação servidor-side — separada da suíte que valida RLS no caminho administrativo e no caminho público. Essa distinção é detalhada na seção 28.

---

## 5. Estrutura de Pastas

```
wedding-platform/
├── app/
│   ├── assets/                  # CSS global (Tailwind v4 via @theme, sem tailwind.config.ts), fontes
│   │   └── css/
│   │       └── main.css
│   ├── components/
│   │   ├── ui/                  # Design System — componentes atômicos (Button, Input, Badge...)
│   │   ├── public/              # Componentes do site público (Hero, GrandeDiaSection, GallerySection)
│   │   ├── rsvp/                # Componentes do fluxo de RSVP
│   │   ├── gifts/                # Componentes da lista de presentes
│   │   └── admin/               # Componentes exclusivos do painel administrativo (guests/, gifts/...)
│   ├── composables/              # useAuth, useGuests, useInvites, useGroups, useRsvp, useGifts,
│   │                              # useWedding, useWeddingTheme, useGalleryConnection... (1:1 por domínio)
│   ├── layouts/
│   │   ├── default.vue          # Layout do site público
│   │   ├── admin.vue            # Layout do painel administrativo
│   │   └── auth.vue             # Layout de telas de login/cadastro
│   ├── middleware/
│   │   └── auth.global.ts       # Protege rotas /admin/** (sem middleware de guest-access — a
│   │                              # autorização do convidado é responsabilidade do server, ver 4.5)
│   ├── pages/
│   │   ├── index.vue            # Redireciona/resolve pro casamento ativo
│   │   ├── login.vue
│   │   ├── [slug]/               # Site público, sempre sob o slug do casamento
│   │   │   ├── index.vue
│   │   │   ├── rsvp/
│   │   │   │   ├── index.vue    # Busca por nome, sem código
│   │   │   │   └── [code].vue   # Link/QR direto do convite
│   │   │   ├── presentes/
│   │   │   │   ├── index.vue
│   │   │   │   └── pagamento/[paymentId].vue
│   │   │   └── galeria.vue
│   │   └── admin/
│   │       ├── index.vue        # Dashboard
│   │       ├── convidados/
│   │       ├── convites/        # Convite = unidade de RSVP (ver seção 17)
│   │       ├── grupos/          # Grupo = etiqueta livre (ver seção 17)
│   │       ├── presentes/
│   │       ├── cronograma/
│   │       ├── galeria/
│   │       └── configuracoes/
│   ├── stores/                  # Pinia — só auth.store.ts e ui.store.ts (ver seção 10; guests/gifts
│   │                              # são server state via composables + useAsyncData, não store)
│   ├── types/                    # Tipos de domínio derivados de database.types.ts (1:1 por entidade)
│   └── utils/
├── server/
│   ├── api/
│   │   ├── guests/ invites/ groups/ invite-tags/ guest-access-tokens/  # domínio de convidados/RSVP
│   │   ├── rsvp/                 # [code].get.ts, guests/[guestId].put.ts, invites/[id]/finalize.post.ts
│   │   ├── gifts/ gift-categories/
│   │   ├── wedding/               # dados do evento, theme, content, gallery (sync/connection)
│   │   ├── public/                # [slug]/wedding, [slug]/rsvp-search, gifts/**, rsvp-search/**
│   │   ├── admin/ auth/ dashboard/ event-segments/ photos/ cron/
│   ├── middleware/
│   │   └── rate-limit.ts
│   └── utils/                    # supabase-admin, gift-payment, gallery-sync, google-drive,
│                                   # token-cipher, guest-access-token, rsvp-invite-payload...
├── shared/                       # Código compartilhado client/server (schemas Zod, presets, conteúdo)
│   ├── schemas/                  # 1 arquivo por domínio (guests, invites, groups, gifts, theme...)
│   └── utils/                    # contrast, filter-gifts, mask-name, event-datetime...
├── supabase/
│   ├── migrations/               # migrations SQL versionadas
│   └── seed.sql                  # dados de exemplo para desenvolvimento
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── ARCHITECTURE.md
│   └── CHANGELOG.md              # histórico de decisões/incidentes (ver seção 32)
├── public/                       # arquivos estáticos servidos diretamente
├── nuxt.config.ts
├── vercel.json                   # cron da sincronização de galeria (ver seção 32)
├── tsconfig.json
├── package.json
└── CLAUDE.md
```

### 5.1 Regras de organização

- Nenhum componente de `components/admin/` pode ser importado dentro de `components/public/` e vice-versa — mantém os dois contextos desacoplados visualmente.
- `components/ui/` é o único lugar onde componentes "genéricos" (Button, Modal, Input) podem existir. Duplicar um botão fora dali é proibido.
- Toda chamada de rede a partir do client deve passar por um composable — páginas e componentes nunca chamam `$fetch`/`useFetch` diretamente para lógica de domínio.

---

## 6. Convenções de Código

- **Idioma do código**: identificadores (variáveis, funções, componentes, tabelas) em **inglês**. Textos visíveis ao usuário (UI copy) em **português (pt-BR)**, preparados para futura extração para i18n.
- **Nomenclatura de arquivos**:
  - Componentes Vue: `PascalCase.vue` (ex: `GuestCard.vue`).
  - Composables: `camelCase.ts` com prefixo `use` (ex: `useGuests.ts`).
  - Stores Pinia: `kebab-case.store.ts` (ex: `guests.store.ts`).
  - Rotas de API: seguem convenção de método HTTP do Nuxt (`index.get.ts`, `[id].patch.ts`).
- **Nomenclatura de variáveis/funções**: `camelCase`. Constantes globais: `UPPER_SNAKE_CASE`.
- **Nomenclatura de tipos/interfaces**: `PascalCase`, sem prefixo `I` (ex.: `Guest`, não `IGuest`).
- **Formatação**: delegada 100% ao Prettier — nenhuma discussão manual de estilo em code review.
- **Imports**: ordenados automaticamente via ESLint (built-in → externos → internos via alias `~/` → relativos).
- **Comentários**: apenas quando o "porquê" não é óbvio pelo código (decisão não trivial, workaround, restrição de negócio). Proibido comentário que apenas repete o que o código já diz.
- **Tamanho de função/componente**: se um componente `.vue` ultrapassar ~200 linhas de `<script setup>`, é sinal de que deve ser dividido ou ter lógica extraída para composable.
- **Sem números mágicos**: valores de negócio (ex: prazo limite de RSVP, número máximo de acompanhantes por convite) devem ser constantes nomeadas, nunca literais soltos.

---

## 7. Padrões Vue / Nuxt

### 7.1 Composition API obrigatória

- Todos os componentes usam `<script setup lang="ts">`. Options API não é permitida em código novo.
- Ordem interna recomendada dentro de `<script setup>`:
  1. Imports
  2. Props / Emits (`defineProps`, `defineEmits`)
  3. Composables e stores
  4. Estado reativo local (`ref`, `reactive`)
  5. Computed properties
  6. Watchers
  7. Funções/handlers
  8. Lifecycle hooks

### 7.2 Props e Emits

- Sempre tipados via `defineProps<Props>()` e `defineEmits<Emits>()` — nunca a forma runtime (`defineProps({ ... })`) para novos componentes.
- Props obrigatórias sem valor default; props opcionais usam `withDefaults`.
- Eventos nomeados no padrão `update:algo` para v-model customizado, e verbos no passado/infinitivo claro para os demais (`confirmed`, `cancel`, `submit`).

### 7.3 Auto-imports do Nuxt

- Aproveitar auto-import de componentes, composables e utils do Nuxt — não importar manualmente algo que já está na pasta auto-importável.
- Composables que envolvem chamadas assíncronas de dados devem usar `useAsyncData`/`useFetch` do Nuxt (não `fetch` cru), para aproveitar cache e comportamento correto em SSR.

### 7.4 Renderização condicional de contexto (público vs. admin)

- Layouts distintos (`default`, `admin`, `auth`) definem claramente o contexto — nenhuma página deve alternar visual de admin/público via `v-if` dentro do mesmo layout.

### 7.5 Server-side vs. client-side

- Dados que definem SEO (nome dos noivos, data, descrição do evento) **precisam** ser buscados via `useAsyncData` no server (SSR) — nunca apenas `onMounted` + fetch client-side.
- Interações puramente client-side (abrir modal, drag-and-drop de convidados em grupos) não precisam de SSR e podem usar estado local reativo.

### 7.6 Nomenclatura e estrutura de componentes `.vue`

```vue
<script setup lang="ts">
// 1. imports
import { useGuests } from '~/composables/useGuests'

// 2. props/emits
interface Props {
  guestId: string
}
const props = defineProps<Props>()

// 3. composables/stores
const { getGuestById, updateGuest } = useGuests()

// 4. estado local
const isEditing = ref(false)

// 5. computed
const guest = computed(() => getGuestById(props.guestId))

// 6. handlers
function handleSave() { /* ... */ }
</script>

<template>
  <!-- template limpo, sem lógica de negócio inline -->
</template>

<style scoped>
/* apenas overrides pontuais; preferir Tailwind no template */
</style>
```

---

## 8. Padrões TypeScript

- `strict: true` no `tsconfig.json`, incluindo `noImplicitAny`, `strictNullChecks` e `noUncheckedIndexedAccess`.
- Proibido uso de `any` — quando o tipo é genuinamente desconhecido, usar `unknown` e fazer narrowing explícito.
- Tipos de banco de dados são **gerados automaticamente** a partir do schema Supabase (`database.types.ts`) e nunca editados manualmente — qualquer ajuste de tipo de domínio é feito em tipos derivados (`Guest`, `Wedding`, etc.), não no arquivo gerado.
- Schemas Zod são a fonte de verdade para validação de entrada de API; o tipo TypeScript correspondente é inferido via `z.infer<typeof schema>`, evitando duplicação entre validação e tipagem.
- Funções exportadas de composables e utils sempre declaram tipo de retorno explícito quando o retorno não é trivialmente inferível.
- Enums de domínio (ex: status de RSVP) são modelados como **union types de string literais** (`type RsvpStatus = 'pending' | 'confirmed' | 'declined'`), espelhando o `CHECK` constraint / `enum` do Postgres — nunca `enum` do TypeScript (evita problemas de tree-shaking e serialização).
- Tipos compartilhados entre client e server ficam em `app/types/` ou em um pacote interno comum; nunca duplicados entre `server/` e `app/`.

---

## 9. Organização de Componentes

### 9.1 Categorias

| Categoria | Pasta | Regra |
|---|---|---|
| **Atoms** (Design System) | `components/ui/` | Sem conhecimento de domínio (Button, Input, Badge, Avatar, Modal) |
| **Domain components** | `components/{rsvp,gifts,admin}/` | Conhecem entidades de domínio, mas não fazem fetch direto — recebem dados via props ou composable |
| **Layout components** | `components/public/` (Hero, Footer, NavBar) | Estruturam a página pública |
| **Page-level containers** | `pages/**` | Orquestram composables + montam os componentes de domínio |

### 9.2 Convenções

- Componentes de domínio recebem dados via **props**, e emitem eventos para ações — a busca/mutação de dados acontece no composable chamado pela página, não dentro do componente filho, exceto quando o componente é claramente "self-contained" (ex.: um card de presente que reserva a si mesmo).
- Nenhum componente deve ultrapassar 3 níveis de prop-drilling — a partir daí, avaliar composable com estado compartilhado ou Pinia store.
- Slots nomeados são preferidos a múltiplas props booleanas de variação de conteúdo.

---

## 10. Estratégia de Gerenciamento de Estado

Modelo de decisão em camadas — do mais local ao mais global:

1. **Estado de componente (`ref`/`reactive`)**: usado por padrão. Se o estado só importa a um componente e seus filhos diretos, fica local.
2. **Composable com estado compartilhado**: quando múltiplos componentes não relacionados hierarquicamente precisam do mesmo estado, mas ele é derivado de uma fonte de dados específica (ex: `useRsvp()` compartilhando o convidado atual do fluxo de RSVP).
3. **Pinia store**: reservado para estado verdadeiramente global e de longa duração na sessão:
   - `auth.store.ts` — sessão do usuário autenticado (casal/admin).
   - `guests.store.ts` — cache normalizado da lista de convidados no painel admin.
   - `gifts.store.ts` — cache da lista de presentes e status de reserva.
   - `ui.store.ts` — estado de UI global: `themeConfig` (o `theme_config` bruto do casamento ativo, resolvido para CSS vars via `useWeddingTheme.ts` e aplicado pelos layouts via `useHead`, ver seção 21) e `sidebarOpen` (sidebar do admin).
4. **Server state vs. client state**: dados vindos do banco são tratados como *server state* — usam `useAsyncData`/`useFetch` com suas próprias chaves de cache; Pinia armazena apenas a "última versão conhecida" para uso síncrono na UI, não é a fonte de verdade.

### 10.1 Regras

- Nunca duplicar a mesma informação em dois stores diferentes — normalizar por entidade (ex: convidados sempre vivem em `guests.store.ts`, mesmo que exibidos dentro de um grupo).
- Mutações que alteram dados no servidor **sempre** passam por uma action de composable/store que chama a API — nenhum componente faz `$fetch` de mutação diretamente.
- Estado de formulário (ex: formulário de RSVP em andamento) não vai para Pinia — vive no componente/página via VeeValidate, é local por natureza.

---

## 11. Banco de Dados

- **SGBD**: PostgreSQL 15+ (via Supabase).
- **Modelagem**: normalizada (3FN) como padrão; denormalização só é aceita com justificativa de performance documentada em comentário SQL.
- **Chaves primárias**: `uuid` (`gen_random_uuid()`), nunca `serial`/`bigserial` — evita vazamento de contagem de registros e facilita merge futuro entre tenants.
- **Timestamps**: toda tabela possui `created_at` e `updated_at` (`timestamptz`, default `now()`), atualizados via trigger `set_updated_at`. Exceção deliberada: `invite_events` (log append-only) não tem `updated_at` — um log nunca é editado.
- **Soft delete**: entidades com valor histórico (convidados, presentes) usam `deleted_at timestamptz null` em vez de exclusão física, permitindo recuperação e auditoria. `invites` e `groups` também usam soft delete — não por valor histórico próprio, mas porque `guests.invite_id`/`guests.group_id` podem referenciar essas linhas mesmo após um convidado ser soft-deleted (ver seção 17.3). `event_segments`, por outro lado, usa exclusão física — nenhuma outra tabela referencia essa entidade e ela não tem valor histórico por si só. `guest_parties` e `invite_tags` não têm soft delete — não carregam valor histórico próprio (ver seção 12.2).
- **Row Level Security (RLS)**: habilitado em **todas** as tabelas desde a v1, mesmo em modo single-tenant. Na maioria das tabelas, a policy filtra por `wedding_id` pertencente ao usuário autenticado (caminho administrativo, preparando a base para o modelo SaaS); `weddings` e `event_segments` também têm uma policy adicional de leitura pública, sem filtro de `wedding_id`, para atender o site público (ver 4.5). O caminho do convidado tem enforcement próprio, fora de RLS (ver 4.5 e 28).
- **`wedding_id` denormalizado em toda tabela filha**: mesmo quando `wedding_id` é tecnicamente derivável via join (ex.: `guests` → `invites` → `weddings`), a coluna é duplicada diretamente na tabela filha (`guests.wedding_id`, `rsvp_responses.wedding_id`, `gift_reservations.wedding_id` etc.). Isso simplifica e acelera as RLS policies (evita join por linha) e prepara particionamento futuro por `wedding_id` (ver 33.4). A consistência entre `guests.wedding_id` e `guests.invite_id → invites.wedding_id` (assim como `group_id`/`party_id`, quando preenchidos) é garantida por trigger, não apenas por convenção.
- **Tokens de acesso hasheados em repouso**: qualquer valor que funcione como credencial (código de acesso do convite) é armazenado como hash (ex.: SHA-256), nunca em texto plano — comparação sempre feita pelo hash do valor recebido. Reduz o dano de um vazamento de banco a zero reutilização direta dos códigos.
- **Extensões utilizadas**: `pgcrypto` (geração de UUID e hashing), `citext` (e-mails case-insensitive), `unaccent` (busca tolerante de nome, ver 12.1).

### 11.1 Visão geral das tabelas

**Domínio principal**

| Tabela | Propósito |
|---|---|
| `weddings` | Um casamento/evento — unidade central de particionamento |
| `wedding_members` | Usuários com acesso administrativo a um casamento (casal, colaboradores) |
| `event_segments` | Etapas do evento (cerimônia, recepção, festa), cada uma com local e horário próprios |
| `invites` | Convite — quem recebeu o mesmo convite físico/digital. Unidade real de RSVP, com um Convidado Responsável opcional (`responsible_guest_id`) |
| `groups` | Etiqueta organizacional livre do convidado (Família da Noiva, Amigos, Trabalho...) — **não é** a unidade de RSVP; não confundir com `invites` nem `guest_parties` (ver 12.1) |
| `guest_parties` | Agrupamento simétrico de "Acompanhantes" — convidados comumente convidados juntos (casal, pais e filhos); nunca chamado de "família" na UI |
| `guests` | Convidados individuais, sempre pertencentes a um convite (`invite_id`) |
| `rsvp_responses` | Resposta de confirmação de presença, sempre por convidado (`guest_id`) |
| `companions` | Acompanhante avulso (nome sem cadastro prévio) de um convite — só existe quando `weddings.guest_list_mode = 'open'` |
| `invite_tags` / `invite_tag_links` | Etiquetas internas reutilizáveis de convite (VIP, Mesa 01...), M:N — só uso administrativo, nunca exibidas ao convidado |
| `invite_events` | Log append-only de eventos por convite (criado, token gerado/enviado, primeiro acesso, mudança de status de RSVP, mensagem enviada, arquivado) — alimenta auditoria e a Linha do Tempo visual do convite no admin |

**Presentes**

| Tabela | Propósito |
|---|---|
| `gift_categories` | Categorias da lista de presentes (opcional, para organização visual) |
| `gifts` | Itens da lista de presentes, incluindo presentes de cota (`is_group_gift`) |
| `gift_reservations` | Reserva integral de um presente unitário — grátis (o convidado compra por fora) ou paga online via InfinitePay (ver `gift_payments`) |
| `gift_contributions` | Contribuição parcial em dinheiro para um presente de cota (`is_group_gift = true`) — sempre paga online (InfinitePay) desde a "Fase Presentes 2.0" |
| `gift_payments` | Tentativas de checkout via InfinitePay — única origem de efeito de negócio no caminho pago; `gift_reservations`/`gift_contributions` só são gravadas depois de um pagamento confirmado (seção 18/28) |

**Acesso e comunicação**

| Tabela | Propósito |
|---|---|
| `guest_access_tokens` | Credencial estável de acesso ao convite (hash do código), sempre por `invite_id` — independente de quantas comunicações foram enviadas |
| `communications` | Log de cada envio (convite, lembrete, confirmação) por canal — 1:N em relação ao token de acesso |

**Mídia e operação**

| Tabela | Propósito |
|---|---|
| `photos` | Itens da galeria de fotos do casal. Referencia um arquivo de uma fonte externa espelhada (`source_connection_id` → `gallery_source_connections`, `source_file_id`, `source_thumbnail_url`, `source_mime_type`), servido direto do Google (thumbnail do Drive), nunca copiado — `storage_path` é coluna legada (nullable, não mais escrita). Policy de leitura pública (`photos_select_public`) além da de membros (seção 4.5); `focal_x`/`focal_y` (ponto de foco, §22.2) |
| `gallery_source_connections` | Conexão do casamento com a fonte externa da galeria (Google Drive hoje). Uma por `wedding_id`. Modo `oauth` (tokens cifrados em repouso — AES-256-GCM) ou `public_link` (URL de pasta pública). `provider` é ponto de extensão pra outras fontes sem migration estrutural. Sem policy pública (guarda segredo) |
| `jobs` | Fila de processamento assíncrono (importação de CSV, envio de e-mail em lote) |
| `audit_logs` | Trilha de auditoria de ações administrativas sensíveis |

---

## 12. Modelo Entidade-Relacionamento

> As tabelas abaixo (colunas-chave e relações, não diagramas ASCII) são a representação de referência. Em caso de divergência, a lista de regras em texto (12.2) é a fonte de verdade.

### 12.1 Entidades e relações

**Núcleo: evento, locais, convites, grupos, acompanhantes, RSVP**

| Tabela | FK principal | O que é |
|---|---|---|
| `weddings` | — | Evento — `slug`, `couple_names`, `event_date`, `rsvp_deadline`, `guest_list_mode`, `child_max_age`, `theme_config`, `content_config` |
| `wedding_members` | `wedding_id`; `user_id` (auth) | Acesso administrativo — `role` |
| `event_segments` | `wedding_id`; `same_venue_as` (auto-referência, opcional) | Cerimônia/recepção/festa — local, horário, `display_order` |
| `invites` | `wedding_id`; `responsible_guest_id` → `guests` (opcional) | Unidade real de RSVP — `internal_code`, `status` (`pending`\|`sent`), `max_companions`, `rsvp_message`, `archived_at` |
| `groups` | `wedding_id` | Etiqueta organizacional livre — `name`, `color` |
| `guest_parties` | `wedding_id` | Agrupamento simétrico de Acompanhantes — sem colunas de negócio próprias |
| `guests` | `wedding_id` (denormalizado); `invite_id` → `invites` (restrict); `group_id` → `groups` (opcional); `party_id` → `guest_parties` (opcional) | Convidado individual — nome, contato, `nickname`/`sex`/`birth_date`/`photo_path`/`wedding_role`, restrição alimentar, `party_order` |
| `rsvp_responses` | `wedding_id` (denormalizado); `guest_id` → `guests` (obrigatório, único); `invite_id` (denormalizado) | Resposta de RSVP, sempre por convidado — `status` (`pending`\|`confirmed`\|`declined`\|`waitlisted`\|`removed`) |
| `companions` | `invite_id` → `invites` | Acompanhante avulso do convite (nome livre) — só quando `guest_list_mode = 'open'`; soft delete |
| `invite_tags` / `invite_tag_links` | `wedding_id` (na tag); `invite_id` + `tag_id` (no link) | Etiqueta interna reutilizável de convite, M:N |
| `invite_events` | `wedding_id`; `invite_id` → `invites` | Log append-only de eventos do convite |

**Presentes**

| Tabela | FK principal | O que é |
|---|---|---|
| `gift_categories` | `wedding_id` | Categoria opcional — `name`, `display_order` |
| `gifts` | `wedding_id`; `category_id` (opcional) | Item — `price_cents`, `quantity_available`, `is_group_gift`, `target_amount_cents`, `quota_amount_cents`, `display_style`, `emotional_icon` |
| `gift_reservations` | `gift_id`; `guest_id`/`group_id` (legado, sempre `null` em registros novos) | Reserva integral — `contributor_name`/`giver_phone`, `message` |
| `gift_contributions` | `gift_id`; `guest_id`/`group_id` (legado, sempre `null` em registros novos) | Contribuição parcial — `amount_cents`, `quota_count`, `contributor_name`/`giver_phone`, `message` |
| `gift_payments` | `gift_id`; `invite_id` (legado, nullable); `resulting_reservation_id`/`resulting_contribution_id` (nullable, exclusivos entre si) | Tentativa de checkout InfinitePay — `status`, `provider_transaction_nsu`, `provider_invoice_slug` |

**Acesso do convidado, comunicação e auditoria**

| Tabela | FK principal | O que é |
|---|---|---|
| `guest_access_tokens` | `wedding_id`; `invite_id` → `invites` (único ativo por convite, `where revoked_at is null`) | Credencial — `code_hash`, `revoked_at` |
| `communications` | `access_token_id` → `guest_access_tokens` | Log de envio — `type`, `channel`, `sent_at`/`opened_at` |
| `gallery_source_connections` | `wedding_id` (único) | Conexão da galeria — `provider`, `mode`, tokens cifrados |
| `audit_logs` | `wedding_id`; `actor_id` (opcional — nulo em ações do sistema) | `actor_type`, `action`, `entity_type`/`entity_id`, `metadata` |

### 12.2 Regras de relacionamento

- `guests.invite_id` é o vínculo que habilita RSVP — nullable até o convidado ser vinculado a um convite (ex.: "Fazer Depois" no wizard de cadastro), mas obrigatório pra responder RSVP. `guests.group_id` (etiqueta livre) e `guests.party_id` (Acompanhantes) são **independentes** de `invite_id` e entre si — os três nunca devem ser confundidos (ver 11.1).
- `guests.wedding_id` e `rsvp_responses.wedding_id` são denormalizados (ver 11) e mantidos consistentes com o `wedding_id` de `invite_id`/`group_id`/`party_id` via trigger — nunca definidos de forma independente pela aplicação.
- `rsvp_responses.guest_id` é obrigatório e único (RSVP é sempre por convidado — não existe mais "modo grupo"); `invite_id` é desnormalizado a partir de `guests.invite_id` pra agregação rápida por convite.
- `is_child` **não é uma coluna** — é sempre calculado por `guest_is_child(birth_date, wedding_id)` a partir de `guests.birth_date` + `weddings.child_max_age` (default 11 anos). Sem `birth_date`, o convidado conta como adulto.
- `companions` (acompanhante avulso) só existe quando `weddings.guest_list_mode = 'open'`, pendurado em `invite_id`. Confirmar um avulso contra `invites.max_companions` é uma operação sujeita a concorrência — resolvida com `SELECT ... FOR UPDATE` na linha do convite dentro de `finalize_invite_rsvp()` (mesmo mecanismo de bloqueio usado na reserva de presentes, ver 13 e 18.3), nunca apenas validação client-side.
- `gifts.is_group_gift = true` usa `gift_contributions` (soma de `amount_cents` até `target_amount_cents`); `gifts.is_group_gift = false` usa `gift_reservations` (reserva integral e exclusiva). As duas tabelas nunca se aplicam ao mesmo `gift_id`.
- `gift_reservations`/`gift_contributions` sempre têm `guest_id`/`group_id` nulos e `contributor_name` preenchido desde a "Fase Presentes 2.0" — a identificação do fluxo público é **inteiramente** nome/telefone (`contributor_name`/`giver_phone`), nunca ligada à lista de convidados cadastrados. As colunas `guest_id`/`group_id` continuam existindo por compatibilidade com dados anteriores a essa fase.
- `gift_payments.status = 'confirmed'` sempre tem `resulting_reservation_id` **ou** `resulting_contribution_id` preenchido (`CHECK`), nunca os dois — só uma dessas duas tabelas recebe o efeito de um mesmo pagamento, dependendo de `gifts.is_group_gift`.
- `guest_access_tokens` é sempre por `invite_id` (nunca `guest_id`/`group_id` isolado) — o link/QR resolve o convite inteiro; o convidado específico dentro do convite é resolvido por busca tolerante de nome (`guest_name_matches`/`search_guests_by_name`, ver 14.3) ou por seleção direta na tela do convite. `communications` é apenas log — revogar/rotacionar um token (`revoked_at`) não apaga o histórico já registrado.
- `invite_tags`/`invite_tag_links` não têm `wedding_id` próprio no link (evita duplicar o par se um convite trocasse de wedding, o que nunca acontece) — RLS via subquery em `invites`.
- Toda tabela com `wedding_id` possui índice composto `(wedding_id, <coluna mais consultada>)` para otimizar queries filtradas por evento.
- `event_segments.same_venue_as` (auto-referência, `on delete set null`) resolve o caso de cerimônia e recepção no mesmo local — quando definido, os campos `venue_name`/`venue_address`/`venue_latitude`/`venue_longitude` deste próprio registro ficam sempre nulos (fonte de verdade única). Validado na aplicação (`server/utils/validate-same-venue.ts`): não pode ser o próprio id, e não pode apontar para um segmento que já tem `same_venue_as` definido (só um nível de indireção). Excluir um segmento referenciado por outro é bloqueado até o dependente ser desvinculado.

---

## 13. Convenções SQL

- **Nomenclatura de tabelas**: `snake_case`, plural (`guests`, `gift_reservations`).
- **Nomenclatura de colunas**: `snake_case`, singular (`full_name`, `event_date`).
- **Chaves estrangeiras**: sempre nomeadas `<entidade_singular>_id` (ex: `wedding_id`, `invite_id`).
- **Chaves primárias**: sempre `id uuid primary key default gen_random_uuid()`.
- **Enums**: implementados como `CHECK` constraint sobre `text`, não `CREATE TYPE ... AS ENUM`, para facilitar alteração de valores permitidos sem migração destrutiva.
  ```sql
  status text not null check (status in ('pending', 'confirmed', 'declined')) default 'pending'
  ```
- **Migrations**: uma migration por mudança lógica, nome no padrão `YYYYMMDDHHMMSS_short_description.sql`. Migrations nunca são editadas após merge na branch principal — correções viram uma nova migration.
- **Índices**: toda FK ganha índice explícito (Postgres não cria automaticamente para FKs). Índices únicos parciais usados para regras como "um único token de acesso ativo por convite" (`guest_access_tokens.invite_id` onde `revoked_at is null`).
- **RLS Policies**: nomeadas no padrão `<tabela>_<operação>_<regra>` (ex: `guests_select_own_wedding`, `gifts_update_wedding_members_only`).
- **Comentários em SQL**: toda tabela e coluna não óbvia recebe `COMMENT ON TABLE`/`COMMENT ON COLUMN` explicando intenção de negócio, já que o schema é a documentação viva do domínio.
- **Views**: usadas para agregações reaproveitadas por múltiplos endpoints, quando fizer sentido. Nenhuma view em produção hoje (ver 28.4) — o dashboard atual computa os contadores em memória em `server/api/dashboard/summary.get.ts`, via `serverSupabaseClient`, respeitando RLS. Qualquer view futura **precisa** ser criada com `security_invoker = true` (Postgres 15+) — sem isso, a view roda com o privilégio do dono (que ignora RLS), não do usuário que consulta.
- **Colunas de hash**: nomeadas `<coluna>_hash` (ex: `code_hash`), geradas via `pgcrypto` no momento da escrita; o valor em texto plano correspondente nunca é persistido, apenas retornado uma vez no momento da geração (ex: dentro do link enviado ao convidado).
- **Concorrência em operações de estoque/limite** (reserva de presente, acompanhante avulso contra `max_companions`): implementada via função Postgres com `SELECT ... FOR UPDATE` sobre a linha do recurso limitado, dentro de uma transação, combinada com índice único parcial que impede exceder o limite — nunca via `check-then-insert` feito na camada de aplicação.

---

## 14. Fluxo de Autenticação

### 14.1 Dois contextos de acesso distintos

1. **Acesso administrativo (casal/colaboradores)** — autenticação completa via Supabase Auth (e-mail + senha, com opção de magic link). Protegido por `middleware/auth.global.ts`, redireciona para `/login` se não houver sessão válida.
2. **Acesso do convidado (RSVP)** — **sem conta/senha**, por dois caminhos que convergem na mesma tela do convite (ver 14.3): link único (`guest_access_tokens`, resolve o convite inteiro) ou busca pública por nome (sem token — identidade é uma confirmação leve, não uma credencial).
3. **Acesso ao site público e aos Presentes** — também sem conta/senha, mas sem nenhum código/link personalizado: a home e `/{slug}/presentes` são acessíveis a qualquer momento a partir do link do casamento. Presentear/contribuir se identifica pelo nome/telefone digitados no modal (seção 18.2), não por um token.

### 14.2 Fluxo administrativo

```
1. Casal acessa /login
2. Submete e-mail/senha → Supabase Auth valida credenciais
3. Supabase retorna JWT (access + refresh token), armazenado em cookie httpOnly
4. middleware/auth.global.ts valida sessão em cada navegação para /admin/**
5. server/api/** valida o JWT em cada request e resolve o wedding_id do usuário via wedding_members
```

### 14.3 Fluxo do convidado

Dois caminhos de entrada, que convergem na mesma tela (lista de convidados do convite, um RSVP independente por pessoa):

**A — Link/QR direto** (`/{slug}/rsvp/{code}`):
```
1. Convidado recebe o link único do convite
2. server/api/rsvp/[code] calcula o hash do código recebido e busca em guest_access_tokens (nunca compara texto plano)
3. Token válido e não revogado → identifica invite_id + wedding_id, pula direto pra tela do convite
```

**B — Busca por nome** (`/{slug}/rsvp`, sem código):
```
1. Convidado digita o nome (busca tolerante — acentuação, ordem invertida, apelido, parcial: guest_name_matches/search_guests_by_name)
2. Resultado retorna só {guestId, fullName} — nunca convite, acompanhantes ou status
3. "Confirmação leve": antes de revelar dados completos, mostra os nomes mascarados dos demais membros do mesmo convite (reduz clique errado/curiosidade casual)
4. "Sim, sou eu" → payload completo do convite, equivalente ao caminho A
```

Depois de identificado (por qualquer um dos dois caminhos), o convidado responde por conta própria dentro do convite:
```
1. Cada convidado do convite confirma/recusa independentemente (upsert_guest_rsvp — autosave a cada toque, sem lock de convite)
2. Revisão final (finalize_invite_rsvp): acompanhante avulso (só se guest_list_mode='open', respeitando invites.max_companions sob lock) + mensagem única ao casal
3. O acesso é de uso repetido até rsvp_deadline (permite alterar resposta) ou até o token ser revogado (caminho A) — o caminho B não expira por token, só pelo rsvp_deadline
```

### 14.4 Autorização (RBAC simplificado)

| Papel | Escopo |
|---|---|
| `owner` | Casal — acesso total ao próprio `wedding_id` |
| `collaborator` | Convidado para ajudar na organização — acesso de leitura/escrita configurável por recurso (ex: pode gerenciar convidados, mas não configurações de conta) |
| `guest` (implícito, via token ou busca por nome) | Acesso apenas aos convidados do próprio convite |
| visitante (sem código, presentes) | Acesso de leitura à vitrine de presentes + presentear/contribuir se identificando por nome/telefone (sem posse de nenhum recurso pré-existente) |

### 14.5 Segurança do fluxo de convidado

- `unique_code` é gerado com entropia suficiente (ex: 22+ caracteres, base62) para não ser adivinhável por força bruta, e armazenado apenas como `code_hash` (ver 13) — o valor em texto plano existe somente no link enviado ao convidado, nunca no banco.
- Rate limiting aplicado a `/api/rsvp/**` **e** à busca pública por nome (`/api/public/[slug]/rsvp-search`, `server/middleware/rate-limit.ts`), com estado mantido em store durável compartilhado entre instâncias (Upstash Redis — ver 3), não em memória do processo.
- **A busca por nome (caminho B, 14.3) é um modelo de confiança mais fraco que o token (caminho A), deliberadamente**: não há credencial nenhuma, só uma etapa de fricção (nomes mascarados dos demais membros do convite) antes de revelar/permitir RSVP. Qualquer pessoa que saiba o nome de um convidado consegue confirmar/recusar presença por ele — trade-off aceito na "Fase Jornada do Convidado" pra reduzir fricção (mesmo racional do caminho de Presentes, seção 4.5: não é "só o dono pode", é fricção suficiente pra evitar erro casual, não ataque deliberado). A busca nunca retorna convite, acompanhantes ou status — só `{guestId, fullName}`; e filtra convidados sem `invite_id` (nada a confirmar).
- Nenhum dado de outros convidados/convites é exposto pela resolução de um código ou por uma busca — cada endpoint retorna estritamente o registro/convite correspondente.
- Este caminho **não é protegido por RLS** (ver 4.5) — a suíte de testes de segurança do projeto precisa validar isoladamente que um token ou uma busca nunca retorna dados de outro convite/`wedding_id`, já que o Postgres, aqui, confiaria em qualquer query feita pela `service_role key`.

### 14.6 Modelo de confiança e RLS (resumo)

| Caminho | Autenticação | Enforcement de isolamento entre tenants |
|---|---|---|
| Administrativo (casal/colaboradores) | Supabase Auth (JWT, `auth.uid()`) | RLS policies no Postgres — banco é a última linha de defesa |
| Convidado (RSVP) — link/QR | Token opaco (`guest_access_tokens`, hash) | Autorização manual em `server/api/**`, usando `service_role key` — servidor é a última linha de defesa |
| Convidado (RSVP) — busca por nome | Nenhuma — fricção (nomes mascarados), não credencial | `service_role key`; mesma responsabilidade do servidor, com garantia mais fraca de identidade (ver 14.5) |
| Presentes (público, sem token) | Nenhuma — qualquer visitante | `service_role key` (sem RLS de escrita pública nas tabelas de presente) + validação de valor/quantidade sempre recalculada no servidor (seção 4.5/18.4) — não há identidade a autorizar, só dado a validar |
| Público (site do casamento) | Nenhuma — link direto | RLS policy de leitura pública explícita (`select using (true)`) — banco continua sendo a última linha de defesa, sem dado sensível para vazar |

Essa tabela existe para deixar explícito que "RLS em 100% das tabelas" (seção 28) protege o caminho administrativo e o caminho público; os dois caminhos do convidado dependem da correção do código do servidor e precisam de cobertura de teste equivalente em rigor, não apenas de RLS — o caminho por busca de nome tem garantia de identidade deliberadamente mais fraca que o link/QR (ver 14.5).

---

## 15. Sistema de Convidados

### 15.1 Conceito

Convidados (`guests`) são sempre vinculados a um `invite` (a unidade real de RSVP) para poder responder — o vínculo pode ficar pendente ("Fazer Depois" no wizard) até ser resolvido. Independentemente disso, um convidado pode opcionalmente ter uma etiqueta livre (`group`, ex. "Família da Noiva") e pertencer a um agrupamento de Acompanhantes (`guest_party`) — os três vínculos (`invite_id`, `group_id`, `party_id`) são independentes entre si (ver seção 12.1).

### 15.2 Funcionalidades previstas

- Cadastro de convidado via wizard (dados pessoais, Acompanhantes, vínculo com convite) — persistência em lote numa única transação (`sync_guest_party()`).
- Perfil do convidado: apelido, sexo, data de nascimento, foto, papel de padrinho/madrinha, restrição alimentar, observações internas.
- Importação em massa (CSV) — mapeamento de colunas para `full_name`, `email`, `phone`.
- Edição inline de dados de contato e restrições alimentares.
- "Criança" nunca é um campo manual — calculada a partir de `birth_date` + `weddings.child_max_age` (`guest_is_child()`), para fins de contagem de "lugares" no evento.
- Soft delete de convidados (remoção lógica, preservando histórico de RSVP/presentes associados).
- Busca e filtro por nome (tolerante a acentuação/ordem/apelido — `guest_name_matches`), convite, status de RSVP.

### 15.3 Regras de negócio

- Um convidado só consegue responder RSVP depois de vinculado a um convite (`invite_id`); antes disso, existe no cadastro mas fica fora do fluxo de RSVP.
- Alterar o convite/etiqueta/grupo de Acompanhantes de um convidado não apaga suas respostas de RSVP anteriores (histórico preservado).
- E-mail/telefone não são obrigatórios (alguns convidados só têm envio de convite físico), mas ao menos um canal de contato é recomendado pela UI (aviso, não bloqueio).

---

## 16. Sistema de RSVP

### 16.1 Conceito

RSVP (*répondez s'il vous plaît*) é o fluxo pelo qual o convidado confirma ou recusa presença. É sempre **por convidado** — não existe mais um "modo grupo" que cobre todos os membros de uma vez (ver 12.2).

### 16.2 Configuração por casamento

- `weddings.guest_list_mode` (`'closed'` default | `'open'`) — coluna própria de comportamento de negócio, deliberadamente separada de `theme_config` (que é exclusivamente visual — ver 22). `'closed'`: só convidados pré-cadastrados podem confirmar presença. `'open'`: permite acompanhante avulso (nome livre, sem cadastro prévio) até `invites.max_companions`.
- `rsvp_deadline` define o prazo final — após essa data, o formulário público entra em modo somente leitura.

### 16.3 Dados coletados

- Status por convidado: `pending` (default) | `confirmed` | `declined` (escolhidos pelo próprio convidado) | `waitlisted` | `removed` (só administrativos, o convidado nunca escolhe sozinho).
- Acompanhante avulso (nome sem cadastro prévio, só em `guest_list_mode = 'open'`) registrado em `companions`, pendurado no convite (não numa resposta individual) — respeitando `invites.max_companions`.
- Restrições alimentares do convidado (texto livre + possíveis tags pré-definidas: vegetariano, vegano, sem glúten, sem lactose, alergias) — fonte única em `guests.dietary_restrictions`, mesmo formato usado em `companions.dietary_restrictions`.
- Mensagem opcional ao casal — uma por **convite** (`invites.rsvp_message`, preenchida na revisão final), não por convidado individual.
- Timestamp de resposta (`responded_at`) por convidado, permitindo reenvio de lembrete apenas para quem ainda está `pending`.
- Fluxo de formulário diferenciado por resultado: recusar presença **não** solicita restrição alimentar — reduz fricção de quem só precisa dizer "não vou".

### 16.4 Regras de negócio

- Resposta de cada convidado é **editável** até `rsvp_deadline` — `upsert_guest_rsvp()` atualiza o registro existente (não cria duplicata), gravando o evento em `invite_events` na mesma transação.
- Confirmar acompanhante avulso contra `invites.max_companions` é uma operação sujeita a corrida (múltiplos convidados do mesmo convite respondendo simultaneamente), resolvida com `SELECT ... FOR UPDATE` sobre a linha do convite dentro de `finalize_invite_rsvp()` (mesmo mecanismo da reserva de presentes, ver 13 e 18.3) — nunca apenas validação client-side.
- Painel administrativo exibe contadores **atualizados a cada carregamento/refetch** (não é um canal de push em tempo real — ver 27): confirmados, recusados, pendentes, total de acompanhantes.
- Sistema de lembretes (fase 2 do roadmap): disparo automático de e-mail para convidados `pending` X dias antes do `rsvp_deadline`, registrado em `communications` (não em `guest_access_tokens`, que permanece estável entre envios).

---

## 17. Sistema de Convites e Grupos

### 17.1 Conceito

Dois conceitos independentes, fáceis de confundir pelo nome (ver 12.1/12.2):

- **Convite (`invites`)** é a unidade real de RSVP e comunicação — "quem recebeu o mesmo convite físico/digital". Todo link/QR de acesso, lembrete e mensagem ao casal opera nesse nível. Um convite pode ter um Convidado Responsável (`responsible_guest_id`), usado pra personalizar mensagens.
- **Grupo (`groups`)** é só uma etiqueta organizacional livre (ex.: "Família da Noiva", "Trabalho") — sem nenhuma semântica de RSVP, comunicação ou limite de acompanhante. Serve pra filtrar/organizar a lista de convidados no admin.
- **Acompanhantes (`guest_parties`)** é um terceiro conceito, tratado à parte na seção 15 — agrupamento simétrico de convidados comumente convidados juntos.

### 17.2 Funcionalidades previstas

**Convites:**
- Criar convite, vincular convidados, definir Convidado Responsável.
- Gerar link/QR de acesso (`guest_access_tokens`) e reenviar sem invalidar o já compartilhado.
- Definir `max_companions` (limite de acompanhante avulso, só relevante em `guest_list_mode = 'open'`).
- Etiquetas internas reutilizáveis (`invite_tags`, ex.: "VIP", "Mesa 01") — só uso administrativo.
- Linha do Tempo do convite (`invite_events`): criado, token enviado, primeiro acesso, RSVP alterado, mensagem enviada, arquivado.
- Visualização: convite → convidados → status de RSVP de cada um.

**Grupos (etiqueta livre):**
- Criar/renomear/excluir grupos, definir cor.
- Atribuir/remover a etiqueta de um convidado (não move o convidado de convite nem de Acompanhantes).

### 17.3 Regras de negócio

- Excluir um convite ou grupo com convidados associados exige realocar os convidados ou confirmar exclusão em cascata (soft delete) — nunca exclusão física silenciosa. A cascata soft-deleta os convidados **e** o próprio convite/grupo (nunca um `DELETE` físico): `guests.invite_id` é `ON DELETE RESTRICT`, então a linha do convite permanece referenciada por qualquer convidado soft-deleted que já tenha pertencido a ele. Um convite/grupo sem nenhum convidado (nem ativo, nem soft-deleted) também é apenas soft-deleted, pela mesma convenção (seção 11).
- `max_companions` é validado no momento da revisão final do RSVP (`finalize_invite_rsvp`): não permite confirmar mais acompanhantes avulsos do que o limite definido pelo casal.

---

## 18. Sistema de Presentes

### 18.1 Conceito ("Presentes 2.0")

A lista de presentes é um "ecossistema de presentes", não uma lista fria de produtos: a página pública (`/{slug}/presentes`) abre com uma mensagem do casal e organiza os itens em três seções — **Lista de Presentes** (itens físicos, `gift_categories`), **Contribuições** (presentes de cota em dinheiro, agrupados por categoria) e **Presentes Emocionais** (contribuições com apresentação evocativa em vez de foto de produto). "Presente emocional" **não é uma entidade nova** — é um presente de cota comum (`gifts.is_group_gift = true`) com `display_style = 'emotional'` e um `emotional_icon` (catálogo fixo validado no Zod, `shared/schemas/gifts.ts#EMOTIONAL_GIFT_ICONS`) no lugar de foto.

**Nomenclatura "Pix" usada nesta seção**: por brevidade, o resto desta seção fala em "pagamento Pix"/"caminho pago", mas tecnicamente o que a plataforma gera é um **link de pagamento genérico da InfinitePay** — quais métodos ele aceita (Pix, cartão, ambos) é definido pela própria conta InfinitePay do casal, não pelo nosso código (nenhum parâmetro de método é enviado em `createInfinitePayCheckoutLink`). A UI (convidado e admin) reflete essa nuance com o rótulo "pagamento online", nunca prometendo "Pix" especificamente — ver 18.2.

### 18.2 Funcionalidades previstas

- CRUD de presentes pelo painel administrativo (título, descrição, foto, preço estimado, quantidade disponível, estilo de exibição, cota fixa).
- **A página de presentes é pública, sempre, sem link personalizado por convite** — diferente do RSVP (que ainda usa `guest_access_token`), `/{slug}/presentes` nunca exigiu nem exige um `?code=` (mudança deliberada, seção 32: a versão inicial desta fase exigia token, revertido a pedido do usuário — "não tem why travar ele a um link específico"). **Identificação de quem está presenteando é o primeiro passo antes de qualquer ação**: o convidado informa nome (obrigatório) e telefone (opcional) — coletados uma única vez por sessão (`useGiftGiverIdentity`, `useState` do Nuxt, isolado por requisição no SSR) e reaproveitados em todos os presentes/contribuições da mesma visita, não repetidos a cada card. Gravados em `gift_reservations.contributor_name`/`giver_phone` e `gift_contributions.contributor_name`/`giver_phone` (reaproveita a coluna `contributor_name`, que já existia para o cenário legado de "presenteador avulso" — os `CHECK`s existentes já permitiam ela existir sozinha, sem `guest_id`/`group_id`). `guest_id`/`group_id` nunca são preenchidos pelo fluxo público atual — a identificação é **inteiramente** nome/telefone, sem nenhuma ligação com a lista de convidados cadastrados. No painel administrativo, `contributor_name` é a identificação exibida — ver `server/api/gifts/[id]/reservations.get.ts#resolveName`.
- **Presente físico (`is_group_gift = false`) pode ter até duas formas de ser presenteado** — quais delas ficam disponíveis é decisão do casal (`weddings.physical_gift_delivery_mode`: `'both'` default, `'self_purchase_only'`, `'payment_only'` — em `/admin/configuracoes`, aba Geral); entre as habilitadas, o convidado escolhe qual usar, depois de se identificar:
  - **"Vou comprar e entregar"** — reserva de intenção grátis, fluxo original: `gift_reservations` gravada diretamente via `reserve_gift()`, sem dinheiro passar pela plataforma. Escondida quando `physical_gift_delivery_mode = 'payment_only'`.
  - **"Enviar o valor pelo link de pagamento"** — exige `weddings.infinitepay_handle` configurado **e** `physical_gift_delivery_mode ≠ 'self_purchase_only'`; o convidado paga `gifts.price_cents` via checkout online (InfinitePay) e, só depois do pagamento confirmado, a mesma `reserve_gift()` é chamada — ver 18.4.
  - Se a combinação de configurações não deixar nenhuma opção disponível (`'payment_only'` sem handle configurado), o botão "Presentear" some da vitrine e o modal, se já aberto, mostra que o casal ainda não configurou uma forma de receber.
  - Dentro do modal, a ordem é sempre: **escolher o método** (só exige clique quando há mais de uma opção — com uma só, já vem pré-selecionado) → **mensagem opcional** → **confirmar**. O site explica as opções disponíveis no momento de presentear — o convidado pode não saber qual usar sem essa explicação.
- **Contribuições (presente de cota) e Presentes Emocionais sempre exigem pagamento online real** — sem `infinitepay_handle` configurado, essas duas seções ficam bloqueadas/somente leitura na vitrine pública, com uma mensagem explicando que o casal ainda não ativou pagamentos.
- **Cotas fixas**: um presente de cota pode opcionalmente definir `gifts.quota_amount_cents` — quando preenchido, o convidado escolhe *quantidade de cotas* a comprar de uma vez em vez de digitar um valor livre (ex.: Air Fryer de R$800 dividida em cotas de R$100). Convive com o modo de contribuição de valor livre (sugestões de valor + campo aberto) para presentes sem cota fixa definida.
- Cartão/mensagem opcional do convidado ao presentear/contribuir (`gift_reservations.message` / `gift_contributions.message`) — separado da identificação (nome/telefone), sempre visível ao casal no painel, nunca a outros convidados.
- Indicação visual clara de "já reservado"/progresso de arrecadação no site público, sem expor nome completo do convidado que reservou (apenas ao casal, no painel administrativo).

### 18.3 Regras de negócio (caminho gratuito, inalterado)

- Reserva grátis é **atômica**: `reserve_gift()` executa `SELECT ... FOR UPDATE` na linha do presente dentro de uma transação antes de decrementar `quantity_available` e inserir a reserva — nunca um `check-then-insert` feito na camada de aplicação, que teria condição de corrida real sob concorrência.
- Presente com `quantity_available = 0` não aceita novas reservas e aparece como "Esgotado" na vitrine pública.
- **Não há cancelamento self-service** — sem token de convite, não haveria como provar posse com segurança (nome/telefone sozinhos são triviais de forjar; `cancel_gift_reservation()`/o antigo endpoint `POST /api/public/gifts/[id]/cancel` foram removidos junto com o token, seção 32). Qualquer ajuste (o convidado errou, quer trocar de presente) é resolvido falando direto com o casal — mesmo caminho já usado pra item pago (18.4), agora unificado pra tudo.
- Painel administrativo mostra quem reservou/contribuiu o quê (incluindo mensagem e status de pagamento) e uma atividade recente cross-presente (`/admin/presentes`, seção 19.2), para fins de agradecimento pós-evento.

### 18.4 Pagamento Pix (InfinitePay) — fluxo pago

`gift_payments` é a peça central do caminho pago: uma linha por tentativa de checkout, nunca por presente. **Nenhum efeito de negócio (`gift_reservations`/`gift_contributions`) nasce diretamente de uma requisição do convidado** — só a função `confirm_gift_payment()` grava esses registros, e só depois de o pagamento ser confirmado servidor-a-servidor (ver 28 para o porquê).

1. Convidado escolhe pagar (presente físico) ou contribuir/comprar cotas (presente de cota) → `POST /api/public/gifts/[id]/checkout` calcula `amount_cents` **sempre no servidor** (nunca aceita valor do client, exceto na contribuição de valor livre), cria uma linha `gift_payments` (`status = 'pending'`) e um link de checkout hospedado na InfinitePay (`server/utils/infinitepay.ts#createInfinitePayCheckoutLink`).
2. Browser navega (redirect completo, não iframe/modal) para o checkout hospedado da InfinitePay — não há API pública documentada pra emitir QR Code Pix embutido na própria página da plataforma.
3. Convidado paga (Pix e/ou cartão — o que a conta InfinitePay do casal aceitar, tela hospedada da InfinitePay) e é redirecionado de volta para `/{slug}/presentes/pagamento/{paymentId}`, que faz "pull" do status (`GET /api/public/gifts/payments/[id]/status`, com polling curto). Em paralelo, a InfinitePay chama o webhook (`POST /api/public/gifts/payments/webhook`) — só alcançável quando o site está publicado num domínio real (não `localhost`), então em dev o "pull" é o único caminho viável na prática.
4. Os dois caminhos (pull e webhook) convergem em `server/utils/gift-payment.ts#confirmGiftPayment` — idempotente (pagamento já `confirmed`/`failed`/`expired` não dispara nova verificação externa) e reverifica sempre via `payment_check` antes de qualquer efeito. `payment_check` exige `handle` + `order_nsu` **+ `transaction_nsu`/`slug`** (não confirma só com `order_nsu`) — esses dois últimos só chegam via querystring no redirect de volta ao site ou no corpo do webhook, e são persistidos em `gift_payments.provider_transaction_nsu`/`provider_invoice_slug` assim que aprendidos, reaproveitados em tentativas seguintes mesmo sem esses query params (ex.: refresh da página sem eles na URL) — ver `docs/CHANGELOG.md` para o achado real que revelou essa exigência (só visível com pagamento de verdade, nenhum teste com handle fake reproduz).
5. Pagamento confirmado → RPC `confirm_gift_payment(payment_id)` chama `reserve_gift()` (kind `reservation`) ou insere em `gift_contributions` (kind `contribution`), atomicamente, e marca `gift_payments.status = 'confirmed'`.
6. **Corrida aceita como limitação conhecida**: se a última unidade de um presente físico for levada pelo caminho gratuito entre o checkout e a confirmação do Pix, `reserve_gift()` falha dentro de `confirm_gift_payment()` — a função marca `status = 'failed'` (nunca propaga como exceção não tratada, ver comentário na migration) em vez de reverter a transação, porque "pago mas não conseguiu reservar" é um estado real que precisa ficar visível para o casal resolver manualmente (destacado na própria página `/admin/presentes`).
7. **Cancelamento de item já pago é bloqueado no self-service** — `POST /api/public/gifts/[id]/cancel` verifica se existe um `gift_payments` confirmado apontando pro registro e, se sim, recusa com 409 orientando contato direto com o casal. Sem estorno automático: a InfinitePay não documenta publicamente uma API de estorno.

### 18.5 Limitações conhecidas da integração InfinitePay

A API pública de checkout da InfinitePay tem documentação técnica limitada — isso molda decisões acima, não é uma lacuna de implementação:

- **Sem sandbox documentado**: validação do fluxo completo é sempre manual, contra a API real, com valores baixos (R$1–2) em ambiente controlado, antes de qualquer merge que toque este fluxo.
- **Sem assinatura no webhook**: o corpo recebido em `POST /api/public/gifts/payments/webhook` nunca é tratado como prova de pagamento — ver o novo modelo de confiança na seção 28.
- **Sem split/marketplace nativo**: uma única conta (`handle`) recebe todo o dinheiro — não há hoje um modelo de múltiplas contas por casal (relevante para a transição SaaS da seção 33, ainda não resolvido).
- **Sem API de estorno documentada**: motivo direto da regra "cancelamento de item pago é bloqueado" (18.4).

### 18.6 Fora de escopo desta fase (ver roadmap, seção 32)

Timeline pública de contribuições, modo anônimo explícito, fotos pós-presente, agradecimentos em massa pelo painel, gamificação de metas atingidas, relatórios financeiros completos (taxas detalhadas, estornos, exportação) e suporte a moeda estrangeira/cartão internacional.

---

## 19. Sistema Administrativo

### 19.1 Conceito

Painel autenticado (`/admin/**`) onde o casal e colaboradores gerenciam todo o evento.

### 19.2 Módulos previstos

| Módulo | Função |
|---|---|
| **Dashboard** | Visão consolidada: total de convidados, % confirmados, presentes reservados, prazo de RSVP restante |
| **Convidados** | CRUD completo, importação CSV, filtros e busca |
| **Grupos** | Organização de convidados em grupos, definição de limites de acompanhantes |
| **Presentes** | CRUD de itens, categorias, visão de reservas/contribuições por item (com identificação de quem presenteou, mensagem e status de pagamento), resumo mínimo do arrecadado online e uma atividade recente cross-presente (quem presenteou o quê, mais recente primeiro, sem precisar abrir item por item) — tudo na própria página `/admin/presentes` (seção 18) |
| **Cronograma** | Gestão de `event_segments` — cerimônia, recepção, festa, cada um com local/horário próprios |
| **Convites e Comunicações** | Geração de tokens de acesso (`guest_access_tokens`), histórico completo de envios por canal (`communications`), reenvio de lembretes sem invalidar o link já compartilhado |
| **Configurações** | Dados do evento (data, nome dos noivos, `guest_list_mode`), tema visual, prazo de RSVP, handle da InfinitePay (ativa pagamento Pix de presentes, seção 18) |
| **Colaboradores** | Convidar/remover pessoas com acesso administrativo, definir permissões |

### 19.3 Regras de negócio

- Apenas `owner` pode gerenciar colaboradores e excluir o evento.
- Toda ação sensível (exclusão de convidado, alteração de configurações do evento) é registrada em `audit_logs`.
- Exportação de dados (CSV de convidados, lista de presentes reservados) disponível a qualquer momento — o casal é o dono dos seus dados.

---

## 20. Experiência do Usuário (UX)

### 20.1 Princípios gerais

- **Fricção mínima para o convidado**: nenhuma criação de conta é exigida para RSVP ou reserva de presente.
- **Clareza de estado**: em qualquer tela, o usuário deve entender imediatamente "o que já foi feito" e "o que falta fazer" (ex: RSVP já enviado vs. pendente).
- **Feedback imediato**: toda ação de mutação (confirmar presença, reservar presente) mostra feedback otimista ou loading state claro, seguido de confirmação visual (toast/inline).
- **Prevenção de erro antes de correção de erro**: validações client-side (Zod + VeeValidate) bloqueiam submissões inválidas antes de chegar ao servidor, mas o servidor sempre revalida (nunca confia apenas no client).

### 20.2 Fluxos críticos mapeados

1. **Convidado confirma presença**: recebe link → vê informações do evento → preenche RSVP → recebe confirmação visual e (futuramente) por e-mail.
2. **Convidado reserva presente**: acessa lista de presentes → filtra por categoria → se identifica (nome/telefone) → escolhe forma de presentear → recebe confirmação, item marcado como reservado para os demais.
3. **Casal acompanha status**: login → dashboard → visão de pendências → ação direta (reenviar lembrete, editar convidado) sem sair do contexto.

### 20.3 Estados a tratar explicitamente em toda tela de listagem

- Vazio (nenhum convidado/presente cadastrado ainda) — com call-to-action claro.
- Carregando.
- Erro de carregamento — com opção de retry.
- Populado — com paginação ou virtualização se a lista crescer muito (casamentos grandes podem ter 300+ convidados).

---

## 21. Interface do Usuário (UI)

- Interface do **site público** é fortemente visual e emocional (fotos do casal, tipografia expressiva), permitindo customização de tema por casamento — cor primária, cor secundária e par tipográfico (`--font-display`) aplicados globalmente via `layouts/default.vue` (`ui.store.ts` + `useWeddingTheme.ts`), cobrindo `/{slug}`, `/{slug}/presentes` e `/{slug}/rsvp` (com ou sem código) automaticamente, por herdarem do mesmo layout.
- Interface do **painel administrativo** prioriza escaneabilidade (tabelas, contadores, filtros), mas a linguagem visual do Design System é **100% compartilhada com o site público**: pill buttons com glow (`rounded="full"`, default da plataforma inteira), cartões com raio/sombra premium (`radius="xl"`/`elevation="xl"`, default de `UiCard`) e dropdowns modernizados aparecem também no admin (histórico de como se chegou a essa decisão — inclusive uma reversão de escopo — em `docs/CHANGELOG.md`). O painel herda a paleta de cores do casamento (`layouts/admin.vue`, mesmo mecanismo do site público). A fonte, porém, nunca varia: `--font-sans` é fixa em toda a plataforma, mesmo que o casal tenha escolhido um `fontPairId` diferente para o site público — legibilidade em densidade de dados prevalece sobre identidade visual aqui, e é a única exceção mantida por essa razão, não por preferência estética. **Único ponto de divergência visual mantido, deliberado**: o "lift" de hover dos botões pill (`hover:scale-[1.03]`) é suprimido no admin via `provide(ADMIN_UI_CONTEXT_KEY, true)` em `layouts/admin.vue`, injetado (default `false`) dentro de `UiButton` — glow, uppercase e o `active:scale` de clique continuam idênticos nos dois contextos; só o hover passivo muda (`app/utils/admin-ui-context.ts`, testado em `Button.spec.ts`).
- **Polimento "Admin Premium"**: cards, botões, campos de formulário e linhas de tabela têm transições suaves (`transition-brand`, ver 22.1). Cabeçalho de página padronizado via `AdminSection.vue` (`components/admin/`, slots `title`/`description`/`actions`); métricas do dashboard via `AdminStatCard.vue` (ícone + label + valor); atalhos de ação via `AdminQuickAction.vue`. Configurações organizada em abas (`UiTabs`, ver 22.2) — Geral/Aparência/Conteúdo — com as subseções de Aparência agrupadas em `UiAccordion` por tema (Branding/Tema/Experiência). A variante `ghost` de `UiButton` tem uma borda sutil sempre visível (`border-border/60`), mesmo em repouso, pra não ler como texto solto sobre uma linha/card da mesma cor. Marca do sidebar/header do admin: "MeuSiteCasamento" (`layouts/admin.vue`), mesmo rebrand do público (rebrand completo do restante da plataforma segue pendente).
- Uso consistente de **estado vazio ilustrado** nas listagens administrativas para orientar o próximo passo do usuário.
- Modais reservados para ações rápidas e contidas (ex: editar um convidado); fluxos longos (ex: importação CSV com mapeamento de colunas) usam página dedicada ou wizard em etapas.
- Toasts para feedback de ações assíncronas (sucesso/erro), nunca `alert()` nativo do navegador.
- **Hero com contagem regressiva e atalhos embutidos, personalizáveis** (redesign de referência, ver "Fase Vermelho Clássico" no roadmap): a contagem regressiva não é mais uma seção própria mais abaixo na página (`CountdownSection.vue`, removido) — vive dentro do próprio `Hero.vue`, nas duas variantes (com/sem foto de capa), condicionada a `theme_config.showCountdown` como antes. Logo abaixo, uma linha de `UiButton` em formato pill (`rounded="full"`) com os atalhos que o casal escolher — catálogo fixo de 8 possíveis em `shared/hero-buttons.ts` (`HERO_BUTTON_CATALOG`: Presentes, Confirmar presença, Cerimônia e festa, Manual do convidado, Dress code, Nossa história, Galeria, FAQ — "Manual dos padrinhos" e "Contato" removidos por completo do site, seções sem uso real), seleção e destaque editáveis em `/admin/configuracoes` (Aparência → "Atalhos do Hero": checkboxes + `UiSelect` "Atalho em destaque", só entre os marcados). Persistido em `theme_config.heroButtons` (array de ids, mesmo schema do restante da Aparência — `PATCH /api/wedding/theme`) e `theme_config.heroFeaturedButton` (o único que recebe `variant="primary"`; os demais ficam `variant="outline"`). Sem seleção salva (casamentos que ainda não personalizaram), `resolveHeroButtons()` cai no default — os mesmos 4 atalhos já lançados no primeiro PR desta fase, com "Presentes" em destaque. `resolveHeroButtons()` ignora ids desconhecidos/removidos do catálogo silenciosamente — nunca quebra o Hero por causa de uma seleção antiga — e a lista pode ficar vazia (o casal desmarca tudo), caso em que a linha de atalhos simplesmente não renderiza. `wedding.couple_names` no formato `"Nome & Nome"` (convenção já usada em todo o projeto) é dividido em 3 linhas (`Nome` / `&` / `Nome`) para o tratamento tipográfico grande do Hero — nomes fora desse padrão caem no fallback de uma linha só, sem quebrar (`Hero.vue`, `coupleNameParts`). A linha da data ganhou o nome do local (`venue_name` do primeiro `event_segment` cadastrado, normalmente a Cerimônia) — `index.vue` passa `resolvedSegments` como prop nova (`segments`) para o Hero.

---

## 22. Design System

### 22.1 Fundamentos (tokens)

- **Cor**: paleta base neutra (escala de cinzas) + duas cores de "tema do casamento" configuráveis, `primary` e `secondary` (aplicadas via CSS variables, permitindo customização por evento sem alterar código — ver 22.3).
  ```css
  :root {
    --color-primary: #6b4a35; /* customizável por casamento */
    --color-primary-foreground: #ffffff;
    --color-secondary: #5f6f52; /* customizável por casamento */
    --color-secondary-foreground: #ffffff;
    --color-surface: #fbf9f5; /* off-white — fundo de página, fixo na plataforma */
    --color-surface-elevated: #ffffff; /* branco puro — cartões/conteúdo em destaque (Card.vue), flutuando sobre o off-white */
    --color-surface-muted: #f2ece2;
    --color-border: #e8ddd0;
    --color-text: #2b2622;
    --color-text-muted: #6b6259;
    --color-heading: var(--color-text); /* customizável por casamento (titleColor, opcional — modo de cor avançada) */
    --color-body: var(--color-text); /* customizável por casamento (bodyColor, opcional — modo de cor avançada) */
  }
  ```
  > `#6b4a35` (mesma família de tom do preset "Clássico Elegante") é o default real (`app/assets/css/main.css`, `shared/utils/contrast.ts#DEFAULT_PRIMARY_COLOR`), validado ≥4.5:1 de contraste contra `--color-surface` — `#a8785c` fica citado em `tests/unit/utils/contrast.spec.ts` só como caso de rejeição conhecido (~3.81:1, achado real documentado em `docs/CHANGELOG.md`).
  > **Off-white vs. branco puro**: `--color-surface`/`--color-surface-muted`/`--color-border` são tons neutros fixos da **plataforma inteira** (público e admin) — não variam por casamento, ao contrário de `primary`/`secondary`/`heading`/`body`. `--color-surface-elevated` existe à parte para dar profundidade sutil (cartão branco puro sobre página off-white, como um editorial impresso); `shared/utils/contrast.ts` continua validando contra branco puro como pior caso.
- **Tipografia**: um par tipográfico por casamento — uma fonte serifada de destaque (`--font-display`, aplicada ao site público) e uma fonte sans-serif fixa de plataforma (`--font-sans`, aplicada a corpo de texto e a todo o painel administrativo, nunca customizada por casamento — legibilidade em densidade de dados). O casal escolhe o par via `shared/theme-presets.ts#FONT_PAIRS`, independentemente da paleta de cores (ver 22.3). Cada par pode opcionalmente definir uma terceira família só para botões/CTAs (`FontPair.buttonFontFamily`, ex.: preset `vermelho-classico` usa Montserrat) — resolvida para `--font-button` por `useWeddingTheme.ts` (mesmo padrão condicional de `--color-heading`/`--color-body`: só entra quando o par a define) e aplicada globalmente por `UiButton` (`[font-family:var(--font-button)]` nas classes base). Sem sobrescrita, `--font-button` cai em `var(--font-sans)` (default declarado em `main.css`) — pares sem `buttonFontFamily` não mudam de aparência. Como só o layout público injeta `--font-button` (`includeFont: true`; o admin usa `includeFont: false`, mesma regra de `--font-display`), botões do painel administrativo nunca variam por casamento.
- **Espaçamento**: escala baseada em múltiplos de 4px (Tailwind spacing scale padrão, sem customização salvo necessidade real).
- **Raio de borda e sombra**: escala limitada (`--radius-sm/md/lg/xl`, `--shadow-sm/md/lg/xl`) fixa na plataforma — não varia por tema, aplicada consistentemente via os componentes de `components/ui/`; nenhum valor arbitrário de `border-radius`/`box-shadow` direto em componentes de domínio. O tier `xl` é o **default de `UiCard`** na plataforma inteira, público e admin (ver §21).
- **Movimento**: `--transition-duration` (200ms) e `--transition-easing` (`cubic-bezier(0.16, 1, 0.3, 1)`), consumidos pela utility `.transition-brand` (`app/assets/css/main.css`, `@layer utilities`) — duração/easing únicos para toda a plataforma, para que ajustar a "sensação" das transições seja uma mudança de 2 variáveis, não de dezenas de componentes. Usada em todos os componentes de `components/ui/` (Button, Card, Input, Select, Textarea, Checkbox, RadioGroup, Toast) e em hovers/transições de página do admin (nav ativa, linhas de tabela).

### 22.2 Componentes base (`components/ui/`)

| Componente | Responsabilidade |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `outline` (borda sutil `border-primary/25` + fundo translúcido `bg-surface-elevated/70` com `backdrop-blur-sm` — CTAs secundários sobre fundo claro ou foto), `ghost` (borda sutil `border-border/60` sempre visível, mesmo em repouso, pra não ler como texto solto sobre um card/linha da mesma cor), `destructive`; tamanhos `sm/md/lg`; prop `rounded` (`'full'` = pill, **default da plataforma inteira**; `'md'` só onde pedido explicitamente). CTAs em pill ganham rótulo uppercase tracked e, quando também `variant="primary"`, um glow colorido (`box-shadow` via `color-mix(in srgb, var(--color-primary) ...)`) em toda a plataforma. O "lift" de hover (`hover:scale-[1.03]`) é a única parte condicional: presente no site público, suprimido no admin via `inject(ADMIN_UI_CONTEXT_KEY)` (provido por `layouts/admin.vue`) — ruído visual numa tela com dezenas de botões pill lado a lado; `active:scale-95`/glow/uppercase continuam iguais nos dois contextos. Prop `to` (renderiza como `NuxtLink` em vez de `<button>`, mesmas classes de variante) + `target` (só com `to`, ex.: `"_blank"`, aplica `rel="noopener noreferrer"` automaticamente) |
| `Input` / `Textarea` / `Select` / `Checkbox` / `RadioGroup` | Campos de formulário com estado de erro integrado; foco/hover com `.transition-brand` (§22.1) |
| `Modal` / `Dialog` | Confirmações e edições rápidas; prop `size` (`'md'` default, `'lg'` para conteúdo mais largo — ex.: lightbox de foto da galeria pública) |
| `Tabs` | Headless via Reka UI (`TabsRoot`/`List`/`Trigger`/`Content`), estilo próprio (não um passthrough) — props `tabs: {id, label}[]` + `v-model`, conteúdo via slot nomeado por `id` (mesmo padrão de `Accordion`). Usado nas abas Geral/Aparência/Conteúdo de `/admin/configuracoes`, mas é um componente genérico (fica em `components/ui/`, não `components/admin/`) — reutilizável em qualquer tela, pública ou admin |
| `Toast` / `ToastViewport` | Feedback de ações assíncronas (nunca `alert()` nativo) — estado em `ui.store.ts` (`toasts`), disparado via `useToast().success()/error()/warning()/info()` (tom `warning` e duração por tom — 3500ms/5000ms/6000ms), `ToastViewport` montado uma vez em `app.vue`; toasts entram/saem com transição (`TransitionGroup` + `.transition-brand`) |
| `Chip` | Label + estado opcional de seleção (`selected`), toggle (`clickable`, emite `click`) e remoção (`removable`, emite `remove`) + slot `actions` para botões extras (ex.: editar) — único componente de "pill" da plataforma (categorias de presente, tags de convite, atalhos do wizard de convidados) |
| `Badge` | Status visual (RSVP confirmado/pendente/recusado) |
| `Card` | Contêiner padrão para itens de lista (convidado, presente); props `radius` (`'xl'` = tratamento premium, **default da plataforma inteira**; `'lg'` = degrau reduzido, só onde cartões densamente empilhados fariam o raio/sombra grandes competirem entre si), `elevation` (`'xl'` default, acompanha `radius="xl"`; `'sm'` no degrau reduzido) e `variant` (`'default'` | `'interactive'` — hover `shadow-md`/`border-primary` no degrau médio | `'highlight'` — leve ênfase `bg-primary/[0.03]` para cards de destaque, ex. prazo de RSVP no dashboard) |
| `Table` | Listagens administrativas com ordenação/paginação; linhas com hover (`hover:bg-surface-muted/60 .transition-brand`) em cada página |
| `Avatar` | Representação visual de convidado/casal |
| `Skeleton` | Estado de carregamento consistente |
| `EmptyState` | Estado vazio ilustrado e padronizado; prop opcional `icon` (ícone lucide acima do título, "Fase Admin Premium") |
| `SectionDivider` | Ornamento linha–ponto–losango–ponto–linha, tingido na cor primária do tema (`primary/30`–`primary/60`); puramente decorativo (`aria-hidden`), sem conhecimento de domínio — usado por `PublicEditorialSection`, sempre abaixo do título (não mais acima, "Fase Linguagem Visual") |
| `Accordion` | Headless via Reka UI (`AccordionRoot`/`Item`/`Header`/`Trigger`/`Content`), `type="single" collapsible`; navegação por teclado e `aria-expanded` nativos do primitive — usado pela seção de FAQ pública. Slot com escopo `#content="{ item }"` (opcional, "Fase Admin Premium") permite conteúdo rico por item além do texto simples de `item.content` — usado para agrupar as subseções de Aparência em `/admin/configuracoes` e as coordenadas opcionais em `/admin/cronograma` (substitui `<details>/<summary>` nativo) |
| `CountdownTimer` | Contagem regressiva até a data/hora do evento (dias/horas/minutos/segundos); sem conhecimento de domínio (props `targetDateTime`, `variant` — `'cards'` default/caixas, `'inline'` números soltos com separador —, slot `past` para a mensagem de "já aconteceu") — usado no Hero público (`variant="inline"`, condicionado a `theme_config.showCountdown`) e no dashboard admin (`variant="cards"` default, sempre visível, é uso interno do casal) |

### 22.3 Regras de governança

- Nenhum estilo visual (cor, espaçamento, tipografia) é definido diretamente em componentes de domínio — sempre via classes Tailwind mapeadas aos tokens, ou via componente de `components/ui/`.
- Toda nova variante visual passa primeiro pelo Design System antes de ser usada em uma feature específica — proibido criar "botão especial" isolado dentro de uma página.
- Temas por casamento são dados armazenados em `weddings.theme_config` (jsonb — exclusivamente atributos visuais, nunca comportamento de negócio como `guest_list_mode`, ver 16.2), aplicados via CSS variables no layout público. Shape atual: `{ presetId?: string, primaryColor: string, secondaryColor: string, titleColor?: string, bodyColor?: string, fontPairId: string, coverImageUrl?: string, storyImageUrl?: string, coverFocalX?: number, coverFocalY?: number, storyFocalX?: number, storyFocalY?: number, showCountdown: boolean, heroButtons?: string[], heroFeaturedButton?: string }`. **Todo campo novo do schema precisa ser adicionado também à lista explícita de `server/api/wedding/theme.patch.ts`** — o endpoint enumera as chaves manualmente e descarta silenciosamente as que não conhece (bug já ocorrido duas vezes). `presetId` é só um rótulo informativo do último preset aplicado (ou `'custom'` após qualquer edição manual) — nunca usado para resolver a aparência em si, que sempre lê `primaryColor`/`secondaryColor`/`fontPairId` diretamente.
- `theme_config` é gerenciado por um endpoint próprio (`PATCH /api/wedding/theme`, `shared/schemas/theme.ts`), separado dos dados de negócio do evento (`PATCH /api/wedding`, `shared/schemas/wedding.ts`) — reflexo, na camada de API, da mesma separação já documentada para a coluna. `coverImageUrl`/`storyImageUrl` ficam de fora até desse schema: são geridos exclusivamente pelos respectivos endpoints de upload/remoção (`cover-upload`/`story-upload`, seção 28), nunca submetidos junto com o restante do formulário de Aparência, evitando que salvar cor/fonte apague uma foto por engano. As duas fotos são **independentes** (feedback de produto: a foto de capa do Hero e a foto da seção "Nossa História" não podem ser forçosamente a mesma) — arquivos próprios no mesmo bucket `wedding-covers` (`{wedding_id}/cover.{ext}` e `{wedding_id}/story.{ext}`), cada uma com seu próprio par de endpoints (`server/api/wedding/theme/cover-upload.*`, `server/api/wedding/theme/story-upload.*`) e composable (`useWeddingCoverUpload`, `useWeddingStoryUpload`).
- A paleta do casal é sempre **duas cores** (`primaryColor` + `secondaryColor`, cada uma validada independentemente pela seção 22.4), sempre editáveis por hexadecimal exato. `shared/theme-presets.ts` cataloga temas prontos (`THEME_PRESETS`, cor+cor+par tipográfico combinados) e pares tipográficos (`FONT_PAIRS`, independentes de cor) — presets são só um atalho de largada: escolher um preenche os três campos de uma vez, mas cada um continua editável manualmente depois, e a fonte é sempre uma escolha independente da cor (nunca embutida apenas dentro do preset).
- **Personalização avançada (Fase Editorial)**: além da paleta primária/secundária, o casal pode opcionalmente sobrescrever `titleColor`/`bodyColor` — resolvidos para `--color-heading`/`--color-body` (`useWeddingTheme.ts`), tokens que, sem sobrescrita, herdam `--color-text` (`app/assets/css/main.css`). É um toggle "Personalização avançada" na tela de Aparência (`app/pages/admin/configuracoes/index.vue`): desligá-lo limpa os dois campos no submit seguinte, em vez de deixar um valor escondido e não-editável. Cada cor é validada por contraste independentemente, como `primaryColor`/`secondaryColor` (seção 22.4). Adoção pelos componentes é incremental — `text-heading`/`text-body` (utilities geradas a partir dos tokens) substituem `text-text` onde fizer sentido, não em todo o código de uma vez; o Hero (variante sem foto de capa) é o primeiro consumidor real do `<h1>` com `text-heading`. Na variante *com* foto de capa, o texto permanece branco fixo (legibilidade sobre a imagem) — a cor de título do casal não se aplica ali, decisão deliberada, não lacuna.
- `shared/theme-presets.ts` inclui o preset `borgonha-editorial` ("Borgonha Editorial" — Borgonha profundo `#5c1a2b` + Dourado fosco `#8a6a1f`, par `DM Serif Display + DM Sans`), aplicado como `theme_config` real do casamento desde a Fase Editorial.
- **Ferramenta de enquadramento (ponto de foco)**: toda foto que é cortada em proporção fixa (grade da galeria em `aspect-square`, foto da "Nossa História" em `aspect-[4/5]`, foto de capa em `object-cover` de altura de viewport) pode ter seu ponto de foco escolhido na edição da foto (galeria) ou no upload (capa/história), em vez de sempre cortar pelo centro. `AdminImageFocalPointPicker.vue` (`components/admin/`) é o componente compartilhado — área de seleção mostra a foto **inteira, sem cortar** (clique/arraste mapeia 1:1 para as coordenadas reais da imagem; cortar a prévia impediria escolher um foco hoje fora da área visível), com um bloco secundário mostrando a prévia do corte real. Aceita teclado (setas, passos de 5%) além de ponteiro. Usado em 3 pontos: `PhotoGalleryManager.vue` (campos `photos.focal_x`/`focal_y`, no modal de edição — mesmo `PATCH /api/photos/[id]` que já salva legenda/ordem), `CoverImageUploader.vue`/`StoryImageUploader.vue` (campos `theme_config.coverFocalX`/`coverFocalY`/`storyFocalX`/`storyFocalY`, endpoint próprio `PATCH /api/wedding/theme/focal-point` — separado do upload porque o foco só faz sentido escolhido depois de ver a prévia da foto já enviada). Persistência é debounced (400ms) no client para não disparar uma requisição a cada pixel de arraste; valor default ausente = 50/50 (centro), idêntico ao comportamento anterior à ferramenta existir. Um upload novo de capa/história sempre reseta o foco da imagem anterior (imagens diferentes, focos diferentes) — nunca herda o ponto de foco da foto trocada. Na galeria (Fase Galeria via Google Drive), o foco é preservado entre syncs pela chave `source_file_id`; reenviar o mesmo arquivo no Drive gera um `fileId` novo e perde o foco salvo (limitação conhecida documentada).
- **`content_config` é uma coluna irmã de `theme_config`, não uma extensão dela** (roadmap "Fase Mensagens Personalizáveis", fora da sequência numerada): guarda as mensagens narrativas do site público (boas-vindas, história, dress code, manual do convidado, intro de presentes, FAQ), nunca atributos visuais — endpoint próprio (`PATCH /api/wedding/content`, `shared/schemas/content.ts`), nunca misturado ao formulário de Aparência.

### 22.4 Validação automática de contraste

Ao salvar `theme_config`, `primaryColor`, `secondaryColor` e, quando definidas, `titleColor`/`bodyColor` são validadas independentemente contra `--color-surface`/`--color-text` calculando a razão de contraste (fórmula de luminância relativa do WCAG, `shared/utils/contrast.ts#checkColorContrast`). Se qualquer uma ficar abaixo de 4.5:1, a interface administrativa bloqueia o salvamento — evitando que a customização visual quebre a acessibilidade prometida na seção 25. Todo preset de `shared/theme-presets.ts` é coberto por teste de guarda garantindo que as duas cores de cada entrada passam nesse mínimo.

---

## 23. Componentes Reutilizáveis

### 23.1 Componentes de domínio compartilhados

| Componente | Uso |
|---|---|
| `GuestCard` | Exibição de um convidado (nome, status RSVP, ações rápidas) — usado em listagens e dentro de grupos |
| `GroupTree` | Visualização hierárquica de grupo → convidados |
| `RsvpForm` | Formulário de confirmação de presença, reutilizado no fluxo individual e em grupo |
| `GiftCard` | Exibição de um item da lista de presentes, com estado reservado/disponível |
| `GiftReservationModal` | Fluxo de reserva de presente |
| `StatusBadge` | Badge de status genérico, parametrizado por mapa de cores/labels (RSVP, convite enviado, etc.) |
| `ProgressSummary` | Barra/cartão de progresso (ex: "82 de 120 confirmados") reutilizado no dashboard e em relatórios |
| `CsvImportWizard` | Fluxo de importação de convidados em etapas (upload → mapear colunas → revisar → confirmar) |
| `EditorialSection` | Wrapper padrão de "capítulo" da home pública (Fase Editorial) — prop `eyebrow` (rótulo curto, uppercase, tracked, cor `primary/60` — "Fase Linguagem Visual") + título centralizado + `SectionDivider` (nessa ordem: eyebrow → título → divisor), alternância de fundo `bg-surface`/`bg-surface-muted`/`bg-secondary/10` (prop `tone`, aplicada de forma consistente em toda seção pública — nunca ad hoc), reveal-on-scroll via `v-motion`, `id` para âncora de navegação. Toda seção da home o reutiliza — conteúdo do slot default fica livre para o layout interno de cada seção |
| `VenueMap` | Embed do Google Maps num `<iframe>` (SSR-safe, sem manipulação de `window`/DOM) — mapa interativo do local de `EventSpotlight.vue`, props `query` (coordenadas ou endereço em texto) e `label`. Aparece sempre que há local/endereço ou coordenadas cadastrados (junto do botão "Abrir no Google Maps"); sem nenhum dos dois, nem mapa nem botão aparecem — nunca um espaço quebrado |
| `AdminSection` (`components/admin/`) | Wrapper padrão de página do admin — slots `title`/`description` (props string, não slot) + `actions` (botões do cabeçalho) + slot default para o conteúdo. Extraído na "Fase Admin Premium" depois de aparecer, hand-rolado, em 8+ páginas (`div class="flex items-center justify-between"` + `h1`/`p` + botão) — todas as páginas do admin o usam hoje |
| `AdminStatCard` (`components/admin/`) | Cartão de métrica do dashboard — ícone lucide + label + valor + `tone` opcional (`default`/`primary`/`success`/`warning`/`danger`), valor truncado com `title` para o texto completo no hover. Substitui o padrão anterior de `UiCard` + dois `<p>` cru repetido em ~20 métricas do dashboard |
| `AdminQuickAction` (`components/admin/`) | Atalho de ação do dashboard — ícone + label + link (`NuxtLink`), mesma linguagem visual de `Card` `variant="interactive"` mas construído à parte por não ser um `Card` (é sempre um link). Usado na seção "Ações rápidas" do dashboard (novo convidado, editar evento, novo presente, ver site público) |

### 23.2 Critério para "promover" um componente a reutilizável

Um componente só é extraído para uso compartilhado após aparecer em **pelo menos 2 contextos reais** — evita abstração prematura sobre necessidades hipotéticas.

---

## 24. Responsividade

- **Mobile-first** obrigatório: a maioria dos convidados acessará o link de RSVP diretamente do WhatsApp no celular.
- Breakpoints padrão do Tailwind (`sm`, `md`, `lg`, `xl`) — sem breakpoints customizados salvo necessidade comprovada.
- Painel administrativo é otimizado primeiro para desktop/tablet (uso típico do casal planejando em casa), mas nenhuma tela pode "quebrar" em mobile — no mínimo, uso funcional garantido. A navegação do admin é uma sidebar (`layouts/admin.vue`, estado `sidebarOpen` em `ui.store.ts`): no desktop, colapsa para uma trilha só de ícones; no mobile, vira um drawer sobreposto (com overlay escurecido) que começa fechado e fecha sozinho ao navegar para outra página.
- Tabelas administrativas em telas estreitas colapsam para formato de cards empilhados, em vez de scroll horizontal forçado como única solução.
- Imagens (galeria do casal, fotos de presentes) sempre com `srcset`/componente de imagem otimizada do Nuxt (`<NuxtImg>`), nunca `<img>` cru com imagem em resolução total.

---

## 25. Acessibilidade

- Meta: conformidade com **WCAG 2.1 nível AA**.
- Uso de componentes headless acessíveis (Reka UI) como base para Modal, Dialog, Combobox, garantindo gerenciamento correto de foco e navegação por teclado.
- Contraste mínimo de 4.5:1 entre texto e fundo, validado para toda combinação de tema customizado pelo casal (paleta de tema precisa respeitar um contraste mínimo mesmo quando customizada — validação automática ao salvar `theme_config`).
- Todo elemento interativo é acessível via teclado (`Tab`/`Enter`/`Space`), sem exceções para componentes customizados.
- Formulários (RSVP, cadastro de convidado) com `label` associado a cada campo, mensagens de erro anunciadas via `aria-live`.
- Imagens decorativas com `alt=""`; imagens de conteúdo (fotos do casal) com `alt` descritivo preenchido pelo casal.
- Testado com leitor de tela (NVDA/VoiceOver) nos fluxos críticos antes de cada release maior.

---

## 26. SEO

- Site público renderizado via **SSR** — essencial para que links compartilhados no WhatsApp gerem preview correto (Open Graph) e para indexação eventual em buscadores.
- Meta tags dinâmicas por casamento: `title`, `description`, `og:image` (foto de capa do casal), geradas via `useSeoMeta`/`useHead` do Nuxt a partir dos dados de `weddings`.
- URLs amigáveis: `wedding-platform.com/{slug}` como página pública principal (`slug` único por casamento, editável pelo casal).
- `robots.txt` e `sitemap.xml` gerados automaticamente para o domínio público; painel administrativo (`/admin/**`) sempre `noindex, nofollow`.
- Páginas de RSVP individuais (`/rsvp/{code}`) são `noindex` — contêm identificador único e não devem ser indexadas.

---

## 27. Performance

- **Metas de Core Web Vitals** para o site público: LCP < 2.5s, CLS < 0.1, INP < 200ms (medidos em condição de rede 4G simulada).
- Imagens sempre servidas via `<NuxtImg>`/`<NuxtPicture>` com formatos modernos (`webp`/`avif`) e lazy loading fora do viewport inicial.
- Dados do painel administrativo paginados no servidor (nunca carregar lista completa de 500 convidados de uma vez) — paginação ou scroll infinito com limite de página razoável (ex: 25–50 itens).
- Uso de `useAsyncData` com chaves de cache adequadas para evitar refetch desnecessário ao navegar entre páginas do admin.
- Bundle do painel administrativo carregado separadamente do bundle do site público (via code-splitting natural de rotas do Nuxt) — um convidado nunca baixa código do admin.
- Consultas ao banco sempre com índice de suporte (ver seção 13); consultas de dashboard usam `views` agregadas em vez de agregação em memória na aplicação.
- **Importação de CSV processada de forma assíncrona** via `jobs` (ver 11.1/3): o endpoint que recebe o upload apenas enfileira o processamento e retorna imediatamente; o parsing/validação/inserção em lote roda em um worker separado, evitando estourar o tempo de vida de uma função serverless síncrona em listas grandes.
- **Rate limiting com store compartilhado** (Upstash Redis, ver 3) — contadores em memória de processo não funcionam corretamente em ambiente serverless com múltiplas instâncias, e dariam falsa sensação de proteção.

### 27.1 Estado medido (Lighthouse mobile)

A meta de LCP < 2.5s (acima) **ainda não é cumprida** na home pública — última medição real ficou em 5.8s, com o elemento de LCP sendo o `<h1>` do Hero (texto, não imagem) bloqueado por um chunk JS inicial que inclui parte do grafo de rotas do admin, contrariando o item "bundle do admin carregado separadamente" acima. Não é um bug pontual introduzido por uma fase específica — é o padrão de bundling já existente do projeto. Investigar por que o manifesto de rotas do admin entra no chunk inicial do público (lazy-carregar via `defineAsyncComponent`/rotas com `lazy: true`) é o item de maior prioridade da Fase 4 ("Revisão de performance", seção 32) — ver `docs/CHANGELOG.md` para a medição completa.

### 27.2 `sizes` do NuxtImg exige formato por breakpoint

Todo uso de `sizes` com unidade `vw` em `NuxtImg`/`NuxtPicture` neste projeto precisa listar os 5 breakpoints explicitamente (`@nuxt/image` não aceita a sintaxe crua do HTML — `sizes="100vw"` sozinho silenciosamente gera um `srcset` de ~1-2px de largura, sem nenhum erro visível), ex.: `sizes="sm:100vw md:100vw lg:100vw xl:100vw 2xl:100vw"` (constante) ou `sizes="sm:100vw md:50vw lg:50vw xl:50vw 2xl:50vw"` (variável — a biblioteca desloca cada valor para valer "a partir deste breakpoint até o próximo", não "abaixo deste breakpoint"; sempre conferir o `srcset`/`naturalWidth` renderizado após qualquer mudança). Valores em `px` (ex.: `sizes="400px"`, usado em `GiftCard.vue`) não têm esse problema — é específico de unidades fluidas (`vw`). Aplica-se a capa/história (`Hero.vue`, `StorySection.vue`) e qualquer novo uso de `NuxtImg`/`NuxtPicture`; não se aplica à Galeria, que usa `<img loading="lazy">` direto do Google (seção 27, achado real documentado em `docs/CHANGELOG.md`).

---

## 28. Segurança

- **Row Level Security** ativa em 100% das tabelas, mas com um limite explícito: RLS é a última linha de defesa apenas no **caminho administrativo** (Supabase Auth / `auth.uid()`). No **caminho do convidado**, o Nitro server usa a `service_role key` (que ignora RLS) e a autorização é feita manualmente no código — ver 4.5 e 14.6 para o detalhamento desse modelo de confiança duplo. `gift_payments` (seção 18) leva isso um passo além: RLS ativa com **só** policy de `select` pra membros — nenhuma policy de insert/update/delete pra ninguém, nem o `owner`, porque a única forma legítima de mutar essa tabela é a lógica verificada de `confirm_gift_payment()` — ver 28.3.
- **Princípio do menor privilégio**: o client (browser) nunca usa a `service_role key` do Supabase — apenas o server (Nitro) tem acesso a credenciais privilegiadas, via variáveis de ambiente não expostas ao bundle client.
- **Tokens de convidado hasheados em repouso**: `guest_access_tokens.code_hash` nunca armazena o valor em texto plano (ver 11 e 13) — um vazamento de banco não deve permitir reuso direto dos códigos de acesso.
- **Validação em ambas as camadas**: Zod no client (UX) e Zod novamente no server (segurança) — nunca confiar apenas na validação do formulário.
- **Rate limiting com store durável e compartilhado** (Upstash Redis, ver 3) em endpoints públicos sensíveis (`/api/rsvp/**`, busca pública por nome, resolução de token de acesso) para mitigar enumeração/brute force — contadores em memória de processo não protegem nada em ambiente serverless multi-instância.
- **Upload de arquivos** (fotos, Fase 3): allowlist explícita de tipo MIME (`image/jpeg`, `image/png`, `image/webp`), limite de tamanho por arquivo, e nome de arquivo sempre regenerado no servidor (nunca reaproveitado do upload original) antes de gravar no Storage.
- **Proibição de `v-html` sobre conteúdo gerado por usuário**: campos livres de convidado (`message` do RSVP, `notes` de grupo) são sempre renderizados via interpolação padrão do Vue (auto-escapada) — `v-html` só é permitido sobre conteúdo controlado pela própria equipe, nunca sobre dado de entrada externo.
- **Dados pessoais de convidados** (nome, telefone, e-mail, restrições alimentares) são tratados como dados sensíveis: nunca logados em texto pleno, acesso de leitura restrito a membros autenticados do respectivo `wedding_id`.
- **HTTPS obrigatório** em todos os ambientes (garantido pela plataforma de hosting).
- **Cookies de sessão**: `httpOnly`, `secure`, `sameSite=lax`.
- **Dependências**: atualização periódica via Dependabot (ou equivalente), com checagem de vulnerabilidades conhecidas no CI.
- **Secrets**: nunca commitados no repositório — geridos via variáveis de ambiente e secret manager do provedor de hosting. A `service_role key` tem rotação periódica documentada (ex.: a cada troca de colaborador com acesso de infraestrutura, ou no mínimo anualmente).
- **Auditoria**: ações administrativas sensíveis (exclusão, alteração de permissões) registradas em `audit_logs` com ator, ação e timestamp; ações automatizadas do sistema (lembretes, jobs) registram `actor_type = 'system'` com `actor_id` nulo.

### 28.1 Proteção de Dados Pessoais (LGPD)

- Dados de convidados incluem categorias potencialmente sensíveis (restrição alimentar/alergia pode revelar informação de saúde ou religião) — tratados com o mesmo rigor de dados sensíveis mesmo quando coletados como texto livre.
- Base legal de tratamento: legítimo interesse do organizador do evento (o casal), com o convidado informado sobre a finalidade (organização do casamento) no próprio formulário de RSVP.
- Direito de exclusão: o casal, como controlador dos dados dos seus convidados, pode excluir um convidado (soft delete) a qualquer momento; exclusão definitiva (hard delete) sob pedido formal é um processo manual documentado, não exposto como ação de UI de autoatendimento na v1.
- Retenção: dados de um casamento permanecem acessíveis por padrão após o evento (valor sentimental/histórico para o casal); política de retenção/expiração automática é decisão de produto a ser tomada antes da Fase 5 (SaaS), quando dados de terceiros em escala aumentam o risco de compliance.

### 28.2 Backup e Recuperação de Desastre

- Point-in-time recovery (PITR) habilitado no Supabase desde o primeiro ambiente de produção — a lista de convidados de um casamento é, na prática, dado irrecuperável se perdido antes do evento.
- Retenção mínima de backup: 7 dias em desenvolvimento/staging, 30 dias em produção (ajustável conforme plano do Supabase).
- Restauração testada manualmente antes de cada casamento com data de evento próxima em produção (não apenas confiar que o backup existe — validar que ele restaura).

### 28.3 Modelo de confiança do pagamento Pix (webhook não assinado)

O pagamento de presentes via InfinitePay (seção 18.4) introduz um **terceiro modelo de confiança**, além dos dois já descritos na seção 4.5 (RLS no caminho administrativo; autorização em código no caminho do convidado): **nenhuma fonte externa prova pagamento por si só**.

- O corpo recebido em `POST /api/public/gifts/payments/webhook` **nunca** é tratado como prova de pagamento — a InfinitePay não documenta publicamente um mecanismo de assinatura para esse endpoint. O payload serve só para *localizar* a linha de `gift_payments` (via `order_nsu`, que é o próprio `id` gerado por nós no momento do checkout).
- O retorno do navegador (`/{slug}/presentes/pagamento/{paymentId}`) também não é confiável isoladamente — o convidado poderia, em tese, adulterar a URL. Desde que presentes deixou de usar `guest_access_token` (seção 4.5/18.2/32), o próprio `paymentId` (UUID gerado por nós no checkout, nunca listado publicamente) é a credencial de acesso a `GET /api/public/gifts/payments/[id]/status` — mesmo padrão de link de acompanhamento de pedido de um checkout de convidado no e-commerce em geral: conhecer o UUID é suficiente, e ele nunca é enumerável. Isso vale igualmente para `transaction_nsu`/`slug` (seção 18.4) — a InfinitePay os anexa na querystring do redirect, mas um convidado poderia forjar valores aí. Tratados só como **hints** repassados pra `payment_check`: um valor forjado faz a reverificação servidor-a-servidor falhar/ficar inconclusiva (permanece `pending`, inofensivo), nunca confirma um pagamento por si só — a mesma regra de "nenhuma fonte externa prova pagamento sozinha" se aplica aqui.
- A única prova real de pagamento é uma chamada **servidor-a-servidor** (`payment_check`, `server/utils/infinitepay.ts`), disparada de dentro de `server/utils/gift-payment.ts#confirmGiftPayment` — chamada tanto pelo webhook quanto pelo retorno do convidado, que funcionam apenas como **gatilhos** para essa mesma verificação, nunca como fonte de verdade.
- Todo efeito de negócio (gravar `gift_reservations`/`gift_contributions`) nasce **exclusivamente** dentro da função Postgres `confirm_gift_payment()`, chamada só depois de `payment_check` confirmar. Isso é reforçado no próprio schema: `gift_payments` não tem policy de RLS de escrita para ninguém (seção 28) — nem um bug de autorização no admin conseguiria forjar um pagamento confirmado.
- Consequência prática para testes: a suíte de segurança deste fluxo precisa validar explicitamente idempotência (webhook duplicado, corrida entre webhook e "pull" do convidado não deve reprocessar nem duplicar o efeito) — coberto em `tests/unit/server/gift-payment.spec.ts`.

### 28.4 Nenhuma view em produção hoje

A view `wedding_rsvp_summary` (criada na Fase 1) foi removida — o Supabase Security Advisor sinalizou, com severidade CRITICAL, que ela rodava sem `security_invoker` e por isso ignorava RLS por completo (views Postgres executam com o privilégio do dono por padrão, não do usuário que consulta). Sem consumidor real no código (o dashboard já computava os contadores em memória, respeitando RLS), a view foi apenas removida (`drop view`) em vez de corrigida in-place. **Regra daqui pra frente**: qualquer view nova neste projeto precisa ser criada com `security_invoker = true` (ver §13) — relato completo do achado em `docs/CHANGELOG.md`.

---

## 29. Controle de Versão

- Repositório único (monorepo lógico, embora tecnicamente um único app Nuxt) hospedado no GitHub.
- `main` é a branch protegida — reflete sempre o que está (ou pode ir) para produção.
- Nenhum push direto em `main` — toda mudança entra via Pull Request com ao menos 1 aprovação (mesmo em fase solo, PR serve como checkpoint de revisão própria).
- CI (GitHub Actions) obrigatório e verde antes de merge: lint, type-check, testes unitários, build.
- Tags de versão semântica (`vMAJOR.MINOR.PATCH`) criadas a cada release significativa, após estabilização do MVP.

---

## 30. Git Flow

Modelo simplificado, adequado ao tamanho do time (trunk-based com branches de feature curtas):

```
main
 └── feature/guest-import-csv
 └── feature/rsvp-public-flow
 └── fix/gift-reservation-race-condition
 └── chore/update-dependencies
```

### 30.1 Regras

- **`main`**: sempre deployável. Todo merge nela passa por CI.
- **Branches de feature**: nomeadas `feature/<descrição-curta-em-kebab-case>`, criadas a partir de `main`, vida curta (idealmente < 3 dias).
- **Branches de correção**: prefixo `fix/`.
- **Branches de manutenção** (dependências, tooling, refactor sem mudança de comportamento): prefixo `chore/` ou `refactor/`.
- **Rebase vs. merge**: preferir `rebase` da branch de feature sobre `main` antes de abrir o PR, para manter histórico linear; o merge do PR em si usa "squash and merge" para manter um commit limpo por feature na `main`.
- Sem branch `develop` separada — o volume de trabalho não justifica essa complexidade adicional na fase atual.
- Quando o modelo SaaS multi-tenant evoluir para ter ambientes de staging formais, reavaliar a introdução de uma branch `staging` de longa duração.

---

## 31. Convenções de Commit

Baseado em **Conventional Commits**, para permitir changelog automatizado futuro e leitura rápida do histórico.

```
<tipo>(<escopo opcional>): <descrição curta no imperativo>

[corpo opcional explicando o porquê]

[rodapé opcional: BREAKING CHANGE, referências a issues]
```

### 31.1 Tipos permitidos

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade visível ao usuário |
| `fix` | Correção de bug |
| `refactor` | Mudança interna sem alterar comportamento externo |
| `chore` | Tarefas de manutenção (dependências, configuração) |
| `docs` | Alterações de documentação (incluindo este CLAUDE.md) |
| `test` | Adição/ajuste de testes, sem mudança de código de produção |
| `style` | Formatação pura, sem mudança de lógica |
| `perf` | Melhoria de performance mensurável |
| `db` | Mudanças de schema/migrations |

### 31.2 Exemplos

```
feat(rsvp): adicionar suporte a restrições alimentares por convidado
fix(gifts): corrigir condição de corrida ao reservar último item disponível
db(guests): adicionar coluna is_child e migration correspondente
docs: atualizar CLAUDE.md com convenções de commit
```

### 31.3 Regras adicionais

- Mensagens no imperativo ("adicionar", não "adicionado"/"adicionando").
- Escopo (entre parênteses) referencia o domínio afetado (`rsvp`, `gifts`, `guests`, `auth`, `admin`), não o nome de arquivo.
- `BREAKING CHANGE:` no rodapé sempre que uma migration remove/renomeia coluna em uso, ou uma API muda contrato de forma incompatível.

---

## 32. Roadmap

> **Regra de manutenção**: um fato de estado atual (o que o produto faz hoje) vai na seção numerada correspondente do documento (1–31, 33). Narrativa de processo — achado de bug, rodada de iteração, reversão de escopo, "como chegamos aqui" — vai direto em [`docs/CHANGELOG.md`](docs/CHANGELOG.md), nunca misturada à seção de especificação. Cada fase nomeada abaixo tem só um resumo curto + pointer; o histórico completo mora só no CHANGELOG. Essa separação é o que manteve este documento legível depois da reorganização registrada na última entrada do CHANGELOG — sem ela, o documento volta a inchar do mesmo jeito na próxima fase.

### Fase 0 — Fundação (concluída)
- [x] Especificação técnica e de produto (este documento).
- [x] Setup inicial do projeto Nuxt + Supabase.
- [x] CI (GitHub Actions) — `.github/workflows/ci.yml` roda lint/typecheck/test/build em todo PR contra `main`. Não exige nenhum secret (build e testes funcionam sem `.env`, confirmado localmente). Falta ainda habilitar a branch protection rule na configuração do repositório para transformar o check em gate obrigatório de fato (hoje ele roda e reporta status, mas não bloqueia merge sozinho) — ação de configuração do GitHub, fora do escopo de um PR de código.
- [x] Upstash Redis (rate limiting, CLAUDE.md seção 3/28) — `server/middleware/rate-limit.ts`, validado contra a instância real (sliding window, 20 requisições/60s por IP em `/api/rsvp/**`).
- [x] Schema inicial do banco de dados + RLS básica.
- [x] Design System — tokens e componentes atômicos essenciais.

### Fase 1 — MVP Single-Tenant (concluída)
- [x] Autenticação do casal (login/cadastro) — login por e-mail/senha e magic link; cadastro é manual/via seed nesta fase (self-service nasce só na Fase 5, ver seção 33.2).
- [x] CRUD de convidados e grupos.
- [x] Configuração básica do evento (data, local, tema visual simples) — inclui o cronograma (`event_segments`).
- [x] Site público com informações do evento.
- [x] Fluxo de RSVP via código único — geração de token (admin), `/rsvp/[code]` (confirmar/recusar, acompanhantes nominais, limite de grupo validado via `confirm_rsvp()`), com rate limiting. **Superado pela "Fase 7" (abaixo)**: RSVP passou a ser sempre por convidado, `confirm_rsvp()` foi substituída por `upsert_guest_rsvp()`/`finalize_invite_rsvp()`, e um segundo caminho de entrada (busca por nome, sem código) foi adicionado — este bullet permanece como registro histórico do que a Fase 1 entregou (seções 14/16 têm o comportamento atual).
- [x] Lista de presentes com reserva — CRUD administrativo, vitrine pública (`/presentes?code=`), reserva atômica (`reserve_gift()`), contribuição em presentes de cota e cancelamento, todos via `guest_access_token`. Contribuição avulsa por `contributor_name` (presente físico entregue por terceiro, CLAUDE.md §18.2) é só de uso administrativo/manual — não exposta como fluxo self-service na vitrine pública ainda. **Superado pela "Fase Presentes 2.0" (abaixo)**: a vitrine deixou de depender de `?code=`/`guest_access_token` (identificação por nome/telefone) e o cancelamento self-service foi removido por completo — este bullet permanece como registro histórico do que a Fase 1 entregou, não como descrição do comportamento atual.
- [x] Dashboard administrativo com contadores essenciais — confirmados/recusados/pendentes, acompanhantes confirmados e prazo de RSVP, lidos originalmente da view `wedding_rsvp_summary` (CLAUDE.md, seção 13). Contador de presentes reservados ainda não foi adicionado ao dashboard — a lista de presentes já existe agora, então isso deixou de ser um bloqueio; fica como ajuste pontual futuro. **A view foi removida por achado de segurança (seção 28.4)** — o dashboard já havia sido reescrito para computar os contadores em memória, então este bullet permanece só como registro histórico do que a Fase 1 entregou.

### Fase 2 — Consolidação
- [ ] Importação de convidados via CSV.
- [ ] Lembretes automáticos de RSVP por e-mail.
- [ ] Exportação de dados (convidados, presentes) em CSV/PDF.
- [ ] Convite com geração de link/QR code.
- [ ] Colaboradores com permissões granulares.
- [ ] Auditoria completa de ações administrativas.
- [ ] Testes E2E cobrindo os fluxos críticos (RSVP, reserva de presente, login).

### Fase 3 — Refinamento de Produto
- [x] Galeria de fotos do casal com upload direto (Supabase Storage) — adiantada para a Fase Editorial (fora da sequência original do roadmap): bucket `wedding-photos`, CRUD admin em `/admin/galeria` (`PhotoGalleryManager.vue`), grade pública com lightbox (`PublicGallerySection.vue`, `GET /api/public/photos`). **Superado pela "Fase Galeria via Google Drive"** (abaixo): o upload manual e o bucket foram removidos — a galeria passou a espelhar uma pasta do Google Drive (referenciar, nunca copiar). Este bullet permanece como registro histórico do que a Fase Editorial entregou.
- [x] Temas visuais pré-configurados (templates de Design System) selecionáveis pelo casal — adiantado para a Fase Visual (fora da sequência original do roadmap): `shared/theme-presets.ts` (`THEME_PRESETS`), `AdminThemePresetPicker.vue`, seção "Aparência" de `/admin/configuracoes`. Preset é só um atalho de largada — cor e fonte continuam manualmente editáveis (ver CLAUDE.md, seção 22.3).
- [x] Cronograma detalhado do evento (cerimônia, recepção, festa) — CRUD administrativo de `event_segments` já implementado na Fase 1. Na home pública, cada item do cronograma vira sua própria seção em destaque (`PublicEventSpotlight`, uma por `event_segment`, ordenadas por `display_order`) — a versão anterior tinha uma lista "Programação" (`PublicTimeline.vue`) **e** seções de destaque de Cerimônia/Recepção mostrando a mesma informação duas vezes; a lista separada foi removida por redundância (feedback de produto), unificando tudo num único fluxo de seções. A classificação por palavra-chave (`shared/utils/event-segment-keywords.ts`) segue decidindo o ícone de cada seção e, só para Cerimônia/Recepção, uma âncora fixa (`#cerimonia`/`#recepcao`) — os demais itens do cronograma (ex.: chá de panela, coquetel) aparecem normalmente, sem âncora própria.
- [x] Mapa/localização integrada — embed do Google Maps (`VenueMap.vue`, ver §22.2) em cada seção do cronograma que tenha local/endereço ou coordenadas, com botão "Abrir no Google Maps". Segmentos podem também apontar `same_venue_as` para outro segmento (ex.: recepção no mesmo local da cerimônia, ver §12.2) em vez de repetir o endereço.
- [ ] Confirmação por WhatsApp (link direto pré-preenchido) como canal alternativo ao e-mail.
- [ ] Internacionalização (i18n) — suporte a inglês/espanhol.

### Fase 7 — Convites, Grupos e Acompanhantes (concluída, fora da sequência numerada)

Reestruturação de schema do domínio de convidados/RSVP — a mudança mais profunda já feita no produto (ver `docs/CHANGELOG.md` para o histórico completo). `guest_groups` virou `invites` (unidade real de RSVP), e duas tabelas novas nasceram com semânticas independentes: `groups` (etiqueta organizacional livre, ex. "Família da Noiva") e `guest_parties` (agrupamento de Acompanhantes). RSVP passou a ser sempre por convidado (não mais "modo grupo"); busca de convidado por nome (não só por código) habilitada. Modelo atual documentado nas seções 11, 12, 14, 15, 16 e 17.

### Fase Editorial (concluída, fora da sequência numerada)

Redesign completo de identidade visual e conteúdo do site público (paleta Borgonha/Dourado, 7 novas seções na home, galeria ativada, navegação por âncora). Histórico completo (14 PRs, decisões de escopo) em `docs/CHANGELOG.md`.

### Fase Vermelho Clássico (concluída, fora da sequência numerada)

Redesign visual "front only" da home pública para casar com uma referência real de mercado (Hero com contagem embutida e atalhos, cronograma em card único, vitrine de presentes embutida na home, RSVP informativo). Histórico completo (4 PRs, restrições de escopo deliberadas) em `docs/CHANGELOG.md`.

### Fase Jornada do Convidado (concluída, fora da sequência numerada)

Reordenação da home pública simulando "entrar na casa dos noivos": Nossa História logo após o Hero, "Confirme sua Presença" com destaque real (CTA funcional pra `/rsvp`) movida antes da lista de presentes, Galeria virou prévia pequena ("Nossos Momentos"). Histórico completo em `docs/CHANGELOG.md`.

### Fase Linguagem Visual (concluída, fora da sequência numerada)

Padronização visual do site público — cabeçalho de seção consistente (eyebrow + divisor), alternância de fundo por seção, tier de cartão "premium" (`radius-xl`/`elevation-xl`), Hero reconstruído em várias rodadas até a versão atual ("Convite de Luxo": monograma d'água, tipografia grande, costuras curvas entre seções), menu em pílulas. 13 rodadas de iteração incremental, incluindo 3 bugs reais (SVG `preserveAspectRatio`, `backdrop-blur` quebrando `position: fixed` do drawer mobile, menu quebrando linha) — histórico completo em `docs/CHANGELOG.md`.

### Fase Admin Premium (concluída, fora da sequência numerada)

Painel administrativo ganhou o mesmo polimento visual do site público (transições, `AdminSection`/`AdminStatCard`/`AdminQuickAction`, Configurações em abas) — inicialmente com intensidade reduzida frente ao público, depois revertido para tratamento visual idêntico a pedido do usuário (Rodada 2). Estado atual documentado nas seções 21 e 22. Histórico completo em `docs/CHANGELOG.md`.

### Fase Presentes 2.0 (concluída, fora da sequência numerada)

Refatoração completa do módulo de presentes: vitrine em três seções (Lista, Contribuições, Presentes Emocionais), pagamento Pix real via InfinitePay, cotas fixas, identificação do convidado por nome/telefone (sem `guest_access_token`), cancelamento self-service removido. 4 rodadas de ajuste pós-lançamento, incluindo um bug real só visível com pagamento de R$1 de verdade. Estado atual documentado na seção 18. Histórico completo em `docs/CHANGELOG.md`.

### Fase Mensagens Personalizáveis (concluída, fora da sequência numerada)

`weddings.content_config` permite ao casal reescrever as mensagens narrativas do site público (boas-vindas, história, dress code, manual do convidado, intro de presentes, FAQ) sem tocar em código — os textos padrão de `shared/wedding-content.ts` continuam sendo o default. Histórico completo em `docs/CHANGELOG.md`.

### Fase Galeria via Google Drive (concluída, fora da sequência numerada)

Upload manual da galeria substituído por sincronização com uma pasta do Google Drive do casal (OAuth ou link público) — fotos são sempre referenciadas, nunca copiadas para o nosso Storage. Sync automático via Vercel Cron (1x/dia, plano Hobby) + botão manual. Estado atual documentado na seção 11.1. Histórico completo (arquitetura, limitações conhecidas) em `docs/CHANGELOG.md`.

### Fase 4 — Preparação para Escala
- [ ] Revisão de performance com dados de casamentos grandes (500+ convidados) — inclui investigar o achado de code-splitting da seção 27.1 (chunk inicial do site público carregando referências de rotas do admin).
- [ ] Observabilidade completa (Sentry + métricas de uso).
- [ ] Testes de carga nos endpoints públicos (RSVP, reserva de presentes).
- [ ] Revisão de segurança/RLS por terceiros antes da abertura multi-tenant.

### Fase 5 — Transição para SaaS Multi-Tenant
- [ ] Onboarding self-service (qualquer casal cria sua própria conta/evento).
- [ ] Planos e cobrança (ver seção 33).
- [ ] Domínio customizado por casamento (ex: `nomedoscasais.com` apontando para a plataforma).
- [ ] Painel de administração da plataforma (visão do time interno sobre todos os tenants).
- [ ] Papel de "planejador de casamentos" gerenciando múltiplos eventos de clientes distintos.

---

## 33. Estratégia SaaS Futura

### 33.1 Premissa arquitetural

A v1 já foi desenhada para que a transição a multi-tenant seja **evolutiva, não uma reescrita**:

- Toda entidade relevante já carrega `wedding_id`.
- RLS já opera filtrando por `wedding_id` acessível ao usuário autenticado, mesmo que hoje só exista um `wedding_id` "vivo" por deploy.
- Autenticação já é multiusuário (`wedding_members`), permitindo múltiplos papéis por evento desde o início.

### 33.2 O que muda na transição

| Aspecto | Hoje (single-tenant) | Futuro (SaaS multi-tenant) |
|---|---|---|
| Criação de evento | Feita manualmente/via seed, um por deploy | Self-service — qualquer usuário cria seu `wedding` no cadastro |
| Domínio | Um domínio fixo para o casamento | Subdomínio (`{slug}.wedding-platform.com`) ou domínio customizado (`meucasamento.com`) via CNAME |
| Cobrança | Inexistente | Planos por assinatura (ver 33.3) |
| Limites de uso | Não aplicável | Limites por plano (nº de convidados, storage de fotos, presentes cadastrados) |
| Painel interno | Inexistente | Painel de operação da plataforma: métricas de todos os tenants, suporte, billing |
| Isolamento de dados | Garantido por RLS + único tenant real | Garantido por RLS com múltiplos tenants simultâneos — auditoria de policy se torna crítica |

### 33.3 Modelo de monetização proposto

- **Plano Gratuito**: 1 evento, até N convidados (ex: 50), sem domínio customizado, marca d'água discreta da plataforma.
- **Plano Casal**: evento único, convidados ilimitados, domínio customizado, remoção de marca d'água, temas premium do Design System.
- **Plano Planejador**: múltiplos eventos simultâneos sob uma conta (para profissionais de organização de casamentos), com painel consolidado entre eventos de clientes.
- Cobrança recorrente (mensal até o casamento, ou taxa única "vitalícia" por evento) — modelo exato a validar com pesquisa de mercado antes da Fase 5.

### 33.4 Riscos técnicos a mitigar antes da abertura multi-tenant

1. **Vazamento de dados entre tenants**: exige suíte de testes automatizados específica validando que toda query respeita RLS, incluindo endpoints novos adicionados ao longo do tempo — e, separadamente, testes do caminho do convidado (não coberto por RLS, ver 4.5/14.6).
2. **Ruído de performance de um tenant afetando outro**: a denormalização de `wedding_id` em tabelas filhas (ver 11) já prepara o particionamento declarativo por `wedding_id` em `guests`, `rsvp_responses` e `gift_reservations`. Gatilho de decisão sugerido: avaliar particionamento quando qualquer uma dessas tabelas ultrapassar ~5 milhões de linhas agregadas, ou quando queries de dashboard de um único tenant começarem a competir visivelmente por I/O com outros tenants.
3. **Suporte ao cliente em escala**: painel interno de operação precisa existir antes de abrir cadastro self-service, para permitir suporte, reembolsos e resolução de disputas sem acesso direto ao banco de produção.
4. **Escalabilidade de e-mail transacional**: volume de convites/lembretes cresce proporcionalmente ao número de tenants — revisar limites e reputação de envio do provedor (Resend) antes da Fase 5.

### 33.5 Tabelas de preparação para SaaS (criadas desde a v1, mesmo sem cobrança ativa)

Para evitar retrofitar limites de plano em cima de dados de produção já existentes, as seguintes tabelas são criadas (ainda que com uso mínimo) já na Fase 0/1:

| Tabela | Propósito |
|---|---|
| `plans` | Catálogo de planos (nome, limites — nº de convidados, storage, presentes) |
| `subscriptions` | Vínculo entre `wedding` e `plan` (mesmo que hoje todo `wedding` esteja em um único plano padrão "interno") |
| `usage_counters` | Contadores materializados por `wedding_id` (nº de convidados ativos, storage usado) para checagem rápida de limite sem `count(*)` sob demanda |
| `entitlements` | Feature flags por `wedding_id`/plano (ex.: domínio customizado habilitado) — evita espalhar `if (plan === 'pro')` pelo código quando o billing chegar |

Essas tabelas não têm UI de gestão na v1 — existem apenas para que o modelo de dados não precise de uma migration estrutural disruptiva no momento da transição da Fase 5.

### 33.6 Não-decisões (a validar antes de implementar)

- Ainda não decidido se o modelo multi-tenant será por **schema separado por tenant** ou **RLS em schema compartilhado** — a abordagem atual (RLS + schema compartilhado) é a assumida como padrão pela comunidade Supabase e a mais provável de seguir, mas deve ser revisitada com dados reais de volume antes da Fase 5.
- Estratégia de billing (Stripe Billing vs. solução própria) não definida — item de pesquisa antes da Fase 5.

---

*Fim do documento. Este arquivo deve ser atualizado a cada decisão arquitetural relevante — tratá-lo como parte do código, não como documentação à parte.*
