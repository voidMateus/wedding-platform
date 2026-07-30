# CLAUDE.md — Especificação Técnica e de Produto

> Este documento é a fonte única de verdade (single source of truth) para o desenvolvimento do **Wedding Platform**. Toda decisão de arquitetura, convenção de código, modelagem de dados e prioridade de produto deve ser consultada e mantida atualizada aqui. Qualquer assistente de IA (Claude Code) ou desenvolvedor humano que trabalhe neste repositório deve ler este arquivo antes de propor mudanças estruturais.

**Status:** Documento vivo — versão inicial (pré-implementação).
**Escopo desta versão:** Especificação apenas. Nenhuma funcionalidade foi implementada ainda.

---

## Documentação Relacionada

O detalhamento técnico de execução — estrutura de diretórios completa, ciclo de vida de requisição do Nitro, estratégia Supabase por ambiente, organização das APIs e fluxos ponta a ponta de autenticação, RSVP e presentes, além da estratégia de testes — está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

- Este arquivo (CLAUDE.md) continua sendo o **documento principal e a fonte única de verdade** do projeto: decisões de produto, modelagem de dados, convenções de código e regras de negócio nascem e vivem aqui.
- `docs/ARCHITECTURE.md` é um documento **complementar e subordinado** — ele não redefine nada do que está aqui, apenas aprofunda como essas decisões se traduzem em execução técnica.
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
17. [Sistema de Grupos](#17-sistema-de-grupos)
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
- Não implementar pagamentos/gateway financeiro para presentes em dinheiro (fase futura, ver roadmap).
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
2. **Composables (composables/)** — encapsulam lógica de negócio reutilizável (ex: `useRsvp`, `useGuestGroups`, `useGiftReservation`).
3. **Camada de API (server/api/)** — validação de entrada (Zod), autorização, orquestração de regras de negócio, chamadas ao banco.
4. **Camada de dados (server/utils/db, tipos gerados do Supabase)** — acesso ao Postgres, sempre tipado.
5. **Banco de Dados (Postgres/Supabase)** — fonte de verdade, com constraints e RLS garantindo integridade mesmo se a camada de aplicação falhar.

### 4.3 Renderização

- **Site público do casamento**: SSR (Server-Side Rendering) para SEO e performance de primeira carga; páginas de baixa mutabilidade podem futuramente migrar para ISR/SSG.
- **Painel administrativo**: renderizado como SPA client-side após autenticação (não precisa de SEO), usando `ssr: false` no layout administrativo ou client-only components onde fizer sentido.

### 4.4 Multi-tenancy (preparação)

Embora a v1 opere como single-tenant (um casamento por instância/deploy), o modelo de dados já inclui a entidade `weddings` (evento) como unidade de particionamento lógico. Toda tabela relevante possui `wedding_id` como chave estrangeira, preparando o terreno para RLS baseada em tenant (ver seção 33).

### 4.5 Modelo de Confiança por Fluxo

A arquitetura tem **dois modelos de enforcement de segurança diferentes**, e isso precisa ser explícito para não gerar falsa sensação de proteção uniforme:

- **Caminho administrativo (casal/colaboradores)**: autenticado via Supabase Auth. As requisições ao Postgres carregam `auth.uid()`, e as **RLS policies são a última linha de defesa** — mesmo um bug no `server/api` não vaza dados de outro `wedding_id`, porque o banco recusa a query.
- **Caminho do convidado (RSVP, presentes)**: não há sessão Supabase — o acesso é resolvido por um token opaco (ver 14.3). O Nitro server usa a `service_role key` (que **ignora RLS**) para atender esse fluxo. Isso significa que, para o convidado, **a autorização é inteiramente responsabilidade do código do `server/api`**, não do banco.

Consequência prática: o caminho do convidado exige sua própria suíte de testes de segurança (garantir que um token só retorna dados do próprio `guest`/`group`), separada da suíte que valida RLS no caminho administrativo. Essa distinção é detalhada na seção 28.

---

## 5. Estrutura de Pastas

```
wedding-platform/
├── app/
│   ├── assets/                  # CSS global, fontes, imagens processadas pelo build
│   │   └── css/
│   │       └── main.css
│   ├── components/
│   │   ├── ui/                  # Design System — componentes atômicos (Button, Input, Badge...)
│   │   ├── public/              # Componentes do site público (Hero, Timeline, GallerySection)
│   │   ├── rsvp/                # Componentes do fluxo de RSVP
│   │   ├── gifts/                # Componentes da lista de presentes
│   │   └── admin/               # Componentes exclusivos do painel administrativo
│   ├── composables/
│   │   ├── useAuth.ts
│   │   ├── useGuests.ts
│   │   ├── useGuestGroups.ts
│   │   ├── useRsvp.ts
│   │   ├── useGifts.ts
│   │   └── useWedding.ts
│   ├── layouts/
│   │   ├── default.vue          # Layout do site público
│   │   ├── admin.vue            # Layout do painel administrativo
│   │   └── auth.vue             # Layout de telas de login/cadastro
│   ├── middleware/
│   │   ├── auth.global.ts       # Protege rotas /admin/**
│   │   └── guest-access.ts      # Valida token de acesso do convidado, se aplicável
│   ├── pages/
│   │   ├── index.vue            # Home pública do casamento
│   │   ├── rsvp/
│   │   │   └── [code].vue       # RSVP via código único do convidado/grupo
│   │   ├── presentes/
│   │   │   └── index.vue
│   │   ├── login.vue
│   │   └── admin/
│   │       ├── index.vue        # Dashboard
│   │       ├── convidados/
│   │       ├── grupos/
│   │       ├── presentes/
│   │       └── configuracoes/
│   ├── stores/                  # Pinia stores
│   │   ├── auth.store.ts
│   │   ├── guests.store.ts
│   │   ├── gifts.store.ts
│   │   └── ui.store.ts
│   ├── types/
│   │   ├── database.types.ts    # Tipos gerados a partir do schema Supabase
│   │   ├── guest.ts
│   │   ├── gift.ts
│   │   └── rsvp.ts
│   └── utils/
│       ├── formatters.ts
│       └── validators.ts
├── server/
│   ├── api/
│   │   ├── guests/
│   │   │   ├── index.get.ts
│   │   │   ├── index.post.ts
│   │   │   └── [id].patch.ts
│   │   ├── rsvp/
│   │   │   └── [code].post.ts
│   │   ├── gifts/
│   │   │   ├── index.get.ts
│   │   │   └── [id]/reserve.post.ts
│   │   └── auth/
│   │       └── session.get.ts
│   ├── middleware/
│   │   └── rate-limit.ts
│   └── utils/
│       ├── supabase.ts          # cliente admin (service role) server-side
│       └── schemas/             # schemas Zod compartilhados por endpoint
├── supabase/
│   ├── migrations/               # migrations SQL versionadas
│   └── seed.sql                  # dados de exemplo para desenvolvimento
├── tests/
│   ├── unit/
│   └── e2e/
├── public/                       # arquivos estáticos servidos diretamente
├── nuxt.config.ts
├── tailwind.config.ts
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
   - `ui.store.ts` — estado de UI global (tema ativo do casamento, sidebar aberta/fechada).
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
- **Timestamps**: toda tabela possui `created_at` e `updated_at` (`timestamptz`, default `now()`), atualizados via trigger `set_updated_at`.
- **Soft delete**: entidades com valor histórico (convidados, presentes) usam `deleted_at timestamptz null` em vez de exclusão física, permitindo recuperação e auditoria. `guest_groups` também usa soft delete — não por valor histórico próprio, mas porque `guests.group_id` é `NOT NULL` com `ON DELETE RESTRICT`: um grupo nunca pode ser excluído fisicamente enquanto qualquer convidado, mesmo já soft-deleted, ainda referenciar seu id (ver seção 17.3).
- **Row Level Security (RLS)**: habilitado em **todas** as tabelas desde a v1, mesmo em modo single-tenant — a policy já filtra por `wedding_id` pertencente ao usuário autenticado, preparando a base para o modelo SaaS. Válido para o caminho administrativo; o caminho do convidado tem enforcement próprio (ver 4.5 e 28).
- **`wedding_id` denormalizado em toda tabela filha**: mesmo quando `wedding_id` é tecnicamente derivável via join (ex.: `guests` → `guest_groups` → `weddings`), a coluna é duplicada diretamente na tabela filha (`guests.wedding_id`, `rsvp_responses.wedding_id`, `gift_reservations.wedding_id` etc.). Isso simplifica e acelera as RLS policies (evita join por linha) e prepara particionamento futuro por `wedding_id` (ver 33.4). A consistência entre `guests.wedding_id` e `guests.group_id → guest_groups.wedding_id` é garantida por `CHECK`/trigger, não apenas por convenção.
- **Tokens de acesso hasheados em repouso**: qualquer valor que funcione como credencial (código de acesso do convidado) é armazenado como hash (ex.: SHA-256), nunca em texto plano — comparação sempre feita pelo hash do valor recebido. Reduz o dano de um vazamento de banco a zero reutilização direta dos códigos.
- **Extensões utilizadas**: `pgcrypto` (geração de UUID e hashing), `citext` (e-mails case-insensitive).

### 11.1 Visão geral das tabelas

**Domínio principal**

| Tabela | Propósito |
|---|---|
| `weddings` | Um casamento/evento — unidade central de particionamento |
| `wedding_members` | Usuários com acesso administrativo a um casamento (casal, colaboradores) |
| `event_segments` | Etapas do evento (cerimônia, recepção, festa), cada uma com local e horário próprios |
| `guest_groups` | Agrupamento de convidados (família, "amigos do trabalho", etc.) |
| `guests` | Convidados individuais, sempre pertencentes a um grupo |
| `rsvp_responses` | Resposta de confirmação de presença, vinculada a um convidado ou grupo |
| `companions` | Acompanhantes nominais declarados em uma resposta de RSVP (nome, restrição alimentar) |

**Presentes**

| Tabela | Propósito |
|---|---|
| `gift_categories` | Categorias da lista de presentes (opcional, para organização visual) |
| `gifts` | Itens da lista de presentes, incluindo presentes de cota (`is_group_gift`) |
| `gift_reservations` | Reserva integral de um presente unitário por um convidado/grupo |
| `gift_contributions` | Contribuição parcial em dinheiro para um presente de cota (`is_group_gift = true`) |

**Acesso e comunicação**

| Tabela | Propósito |
|---|---|
| `guest_access_tokens` | Credencial estável de acesso do convidado/grupo (hash do código), independente de quantas comunicações foram enviadas |
| `communications` | Log de cada envio (convite, lembrete, confirmação) por canal — 1:N em relação ao token de acesso |

**Mídia e operação**

| Tabela | Propósito |
|---|---|
| `photos` | Itens da galeria de fotos do casal (Fase 3), já reservada na v1 para evitar migration disruptiva depois |
| `jobs` | Fila de processamento assíncrono (importação de CSV, envio de e-mail em lote) |
| `audit_logs` | Trilha de auditoria de ações administrativas sensíveis |

---

## 12. Modelo Entidade-Relacionamento

> Os diagramas abaixo são uma representação aproximada (ASCII) para orientação rápida. Em caso de divergência, a lista de colunas e regras em texto (12.2) é a fonte de verdade — diagramas ASCII tendem a desatualizar com o tempo.

### 12.1 Diagramas

**Núcleo: evento, locais, grupos, convidados, RSVP**

```
┌────────────────┐        ┌────────────────────┐
│    weddings     │1      *│  wedding_members    │
│─────────────────│◄──────►│──────────────────────│
│ id (PK)         │        │ id (PK)              │
│ slug            │        │ wedding_id (FK)       │
│ couple_names    │        │ user_id (FK auth)     │
│ event_date      │        │ role                  │
│ rsvp_mode       │        └──────────────────────┘
│ rsvp_deadline   │
│ theme_config    │
│ created_at      │
│ updated_at      │
└───────┬─────────┘
        │1
        │*
┌───────▼─────────┐
│  event_segments  │   (cerimônia, recepção, festa — local/horário próprios)
│──────────────────│
│ id (PK)          │
│ wedding_id (FK)  │
│ title            │
│ venue_name       │
│ venue_address    │
│ starts_at        │
│ ends_at          │
│ display_order    │
└──────────────────┘

┌────────────────┐        ┌────────────────────────┐
│  guest_groups    │1      *│         guests            │
│──────────────────│◄──────►│──────────────────────────────│
│ id (PK)          │        │ id (PK)                      │
│ wedding_id (FK)  │        │ wedding_id (FK, denormalizado) │
│ name             │        │ group_id (FK)                  │
│ max_members      │        │ full_name / email / phone       │
│ notes            │        │ is_child                          │
│ deleted_at       │        │ dietary_restrictions                │
│ created_at       │        │ deleted_at / created_at               │
└──────────────────┘        └──────────────┬─────────────────────────┘
                                            │1
                                            │
                             ┌──────────────▼─────────────┐
                             │       rsvp_responses          │
                             │─────────────────────────────────│
                             │ id (PK)                           │
                             │ wedding_id (FK, denormalizado)      │
                             │ guest_id (FK, nullable)               │
                             │ group_id (FK, nullable)                 │
                             │ status (enum)                             │
                             │ dietary_notes / message                     │
                             │ responded_at                                  │
                             └──────────────┬───────────────────────────────────┘
                                            │1
                                            │*
                             ┌──────────────▼─────────────┐
                             │        companions             │
                             │─────────────────────────────────│
                             │ id (PK)                           │
                             │ rsvp_response_id (FK)                │
                             │ full_name                              │
                             │ dietary_restrictions                     │
                             └───────────────────────────────────────────┘
```

**Presentes**

```
┌────────────────┐        ┌──────────────────────────┐
│ gift_categories │1      *│           gifts             │
│─────────────────│◄──────►│───────────────────────────────│
│ id (PK)         │        │ id (PK)                          │
│ wedding_id (FK)  │        │ wedding_id (FK, denormalizado)     │
│ name             │        │ category_id (FK)                     │
│ display_order    │        │ title / description / price_cents      │
└──────────────────┘        │ image_url / quantity_available           │
                             │ is_group_gift / target_amount_cents        │
                             │ is_active                                     │
                             └──────┬────────────────────────────┬────────────┘
                                    │1                           │1
                                    │*                           │*
                     ┌──────────────▼─────────┐   ┌──────────────▼──────────────┐
                     │   gift_reservations       │   │     gift_contributions        │
                     │─────────────────────────────│   │─────────────────────────────────│
                     │ id (PK)                       │   │ id (PK)                           │
                     │ gift_id (FK)                    │   │ gift_id (FK)                        │
                     │ guest_id / group_id (nullable)    │   │ guest_id / group_id (nullable)        │
                     │ contributor_name (avulso)           │   │ contributor_name (avulso)               │
                     │ reserved_at                            │   │ amount_cents / contributed_at             │
                     └───────────────────────────────────────┘   └───────────────────────────────────────────┘
```

**Acesso do convidado, comunicação e auditoria**

```
┌───────────────────────┐        ┌───────────────────────┐
│ guest_access_tokens      │1      *│      communications       │
│───────────────────────────│◄──────►│──────────────────────────────│
│ id (PK)                     │        │ id (PK)                      │
│ wedding_id (FK)               │        │ access_token_id (FK)          │
│ guest_id / group_id             │        │ type (invite|reminder|confirmation) │
│  (um dos dois, via CHECK)         │        │ channel (email|whatsapp|sms)          │
│ code_hash                           │        │ sent_at / opened_at                     │
│ revoked_at / created_at               │        └──────────────────────────────────────────┘
└──────────────────────────────────────┘

┌────────────────┐
│  audit_logs     │
│─────────────────│
│ id (PK)         │
│ wedding_id (FK)  │
│ actor_id (FK, nullable)       │  nulo em ações automatizadas do sistema
│ actor_type (member | system)    │
│ action / entity_type / entity_id  │
│ metadata (jsonb) / created_at       │
└──────────────────────────────────────┘
```

### 12.2 Regras de relacionamento

- `guests.group_id` é **obrigatório** — todo convidado pertence a um grupo, mesmo que seja um grupo "unitário" (grupo de 1 pessoa). Isso simplifica a lógica de RSVP e convite, que sempre opera no nível de grupo por padrão, mas pode ser respondida individualmente quando necessário.
- `guests.wedding_id` e `rsvp_responses.wedding_id` são denormalizados (ver 11) e mantidos consistentes com o `wedding_id` do grupo/convidado pai via `CHECK`/trigger — nunca definidos de forma independente pela aplicação.
- `rsvp_responses` referencia **ou** `guest_id` **ou** `group_id`, nunca ambos nulos nem ambos preenchidos (`CHECK` constraint) — o modo é controlado por `weddings.rsvp_mode` (`'per_guest'` | `'per_group'`).
- `companions` só existe vinculada a uma `rsvp_response` com `status = 'confirmed'`; o número de acompanhantes é `count(companions)` — não há mais um contador solto sem lastro nominal.
- Confirmar uma `rsvp_response` (e seus `companions`) contra `guest_groups.max_members` é uma operação sujeita a concorrência, resolvida com o mesmo mecanismo de bloqueio usado na reserva de presentes (ver 13 e 18.3) — validado no banco, nunca apenas no client, mesmo no modo `per_guest` onde múltiplas submissões independentes do mesmo grupo podem concorrer pela mesma vaga.
- `gifts.is_group_gift = true` usa `gift_contributions` (soma de `amount_cents` até `target_amount_cents`); `gifts.is_group_gift = false` usa `gift_reservations` (reserva integral e exclusiva). As duas tabelas nunca se aplicam ao mesmo `gift_id`.
- `gift_reservations`/`gift_contributions` permitem `guest_id`/`group_id` nulos simultaneamente apenas quando `contributor_name` está preenchido — cenário de presente físico/contribuição de alguém fora da lista de convidados cadastrados.
- `guest_access_tokens` é a única fonte de autenticação implícita do convidado; `communications` é apenas log — revogar/rotacionar um token (`revoked_at`) não apaga o histórico de comunicações já registrado, e um novo lembrete (Fase 2) gera uma nova linha em `communications` sem invalidar o link original.
- Toda tabela com `wedding_id` possui índice composto `(wedding_id, <coluna mais consultada>)` para otimizar queries filtradas por evento.

---

## 13. Convenções SQL

- **Nomenclatura de tabelas**: `snake_case`, plural (`guests`, `gift_reservations`).
- **Nomenclatura de colunas**: `snake_case`, singular (`full_name`, `event_date`).
- **Chaves estrangeiras**: sempre nomeadas `<entidade_singular>_id` (ex: `wedding_id`, `guest_id`).
- **Chaves primárias**: sempre `id uuid primary key default gen_random_uuid()`.
- **Enums**: implementados como `CHECK` constraint sobre `text`, não `CREATE TYPE ... AS ENUM`, para facilitar alteração de valores permitidos sem migração destrutiva.
  ```sql
  status text not null check (status in ('pending', 'confirmed', 'declined')) default 'pending'
  ```
- **Migrations**: uma migration por mudança lógica, nome no padrão `YYYYMMDDHHMMSS_short_description.sql`. Migrations nunca são editadas após merge na branch principal — correções viram uma nova migration.
- **Índices**: toda FK ganha índice explícito (Postgres não cria automaticamente para FKs). Índices únicos parciais usados para regras como "um único token de acesso ativo por convidado/grupo" (`guest_access_tokens.code_hash` onde `revoked_at is null`).
- **RLS Policies**: nomeadas no padrão `<tabela>_<operação>_<regra>` (ex: `guests_select_own_wedding`, `gifts_update_wedding_members_only`).
- **Comentários em SQL**: toda tabela e coluna não óbvia recebe `COMMENT ON TABLE`/`COMMENT ON COLUMN` explicando intenção de negócio, já que o schema é a documentação viva do domínio.
- **Views**: usadas para agregações reaproveitadas pelo dashboard administrativo (ex: `wedding_rsvp_summary`), evitando repetir lógica de agregação em múltiplos endpoints.
- **Colunas de hash**: nomeadas `<coluna>_hash` (ex: `code_hash`), geradas via `pgcrypto` no momento da escrita; o valor em texto plano correspondente nunca é persistido, apenas retornado uma vez no momento da geração (ex: dentro do link enviado ao convidado).
- **Concorrência em operações de estoque/limite** (reserva de presente, confirmação de vaga em grupo): implementada via função Postgres com `SELECT ... FOR UPDATE` sobre a linha do recurso limitado, dentro de uma transação, combinada com índice único parcial que impede exceder o limite — nunca via `check-then-insert` feito na camada de aplicação.

---

## 14. Fluxo de Autenticação

### 14.1 Dois contextos de acesso distintos

1. **Acesso administrativo (casal/colaboradores)** — autenticação completa via Supabase Auth (e-mail + senha, com opção de magic link). Protegido por `middleware/auth.global.ts`, redireciona para `/login` se não houver sessão válida.
2. **Acesso do convidado (site público/RSVP)** — **sem conta/senha**. O convidado acessa via link único contendo um `unique_code`, resolvido contra `guest_access_tokens` (tabela de credencial, hasheada — ver 11 e 12), que identifica seu grupo/convidado sem exigir cadastro. Reduz fricção drasticamente.

### 14.2 Fluxo administrativo

```
1. Casal acessa /login
2. Submete e-mail/senha → Supabase Auth valida credenciais
3. Supabase retorna JWT (access + refresh token), armazenado em cookie httpOnly
4. middleware/auth.global.ts valida sessão em cada navegação para /admin/**
5. server/api/** valida o JWT em cada request e resolve o wedding_id do usuário via wedding_members
```

### 14.3 Fluxo do convidado

```
1. Convidado recebe link: /rsvp/{unique_code}
2. server/api/rsvp/[code] calcula o hash do código recebido e busca em guest_access_tokens (nunca compara texto plano)
3. Token válido e não revogado → identifica guest/group + wedding
4. Convidado preenche formulário de RSVP (sem login)
5. Submissão grava em rsvp_responses (+ companions, se confirmado), vinculada ao guest_id/group_id resolvido pelo token
6. O acesso via unique_code é de uso repetido até rsvp_deadline (permite alterar resposta) ou até o token ser revogado
```

### 14.4 Autorização (RBAC simplificado)

| Papel | Escopo |
|---|---|
| `owner` | Casal — acesso total ao próprio `wedding_id` |
| `collaborator` | Convidado para ajudar na organização — acesso de leitura/escrita configurável por recurso (ex: pode gerenciar convidados, mas não configurações de conta) |
| `guest` (implícito, via código) | Acesso apenas ao próprio registro de RSVP e à lista de presentes pública |

### 14.5 Segurança do fluxo de convidado

- `unique_code` é gerado com entropia suficiente (ex: 22+ caracteres, base62) para não ser adivinhável por força bruta, e armazenado apenas como `code_hash` (ver 13) — o valor em texto plano existe somente no link enviado ao convidado, nunca no banco.
- Rate limiting aplicado ao endpoint de resolução de código (`server/middleware/rate-limit.ts`), com estado mantido em store durável compartilhado entre instâncias (Upstash Redis — ver 3), não em memória do processo — em ambiente serverless, rate limiting em memória não protege nada, pois cada instância tem seu próprio contador.
- Nenhum dado de outros convidados/grupos é exposto pela resolução de um código — o endpoint retorna estritamente o registro correspondente.
- Este caminho **não é protegido por RLS** (ver 4.5) — a suíte de testes de segurança do projeto precisa validar isoladamente que um token nunca retorna dados de outro `guest`/`group`/`wedding_id`, já que o Postgres, aqui, confiaria em qualquer query feita pela `service_role key`.

### 14.6 Modelo de confiança e RLS (resumo)

| Caminho | Autenticação | Enforcement de isolamento entre tenants |
|---|---|---|
| Administrativo (casal/colaboradores) | Supabase Auth (JWT, `auth.uid()`) | RLS policies no Postgres — banco é a última linha de defesa |
| Convidado (RSVP, presentes) | Token opaco (`guest_access_tokens`, hash) | Autorização manual em `server/api/**`, usando `service_role key` — servidor é a última linha de defesa |

Essa tabela existe para deixar explícito que "RLS em 100% das tabelas" (seção 28) protege o caminho administrativo; o caminho do convidado depende da correção do código do servidor e precisa de cobertura de teste equivalente em rigor, não apenas de RLS.

---

## 15. Sistema de Convidados

### 15.1 Conceito

Convidados (`guests`) são sempre organizados dentro de um `guest_group` — a unidade de convite e comunicação. Um grupo pode representar uma família, um casal de amigos, ou uma única pessoa.

### 15.2 Funcionalidades previstas

- Cadastro manual de convidado (formulário administrativo).
- Importação em massa (CSV) — mapeamento de colunas para `full_name`, `email`, `phone`, `group`.
- Edição inline de dados de contato e restrições alimentares.
- Marcação de convidado como criança (`is_child`) para fins de contagem de "lugares" no evento (crianças podem não contar no orçamento por adulto).
- Soft delete de convidados (remoção lógica, preservando histórico de RSVP/presentes associados).
- Busca e filtro por nome, grupo, status de RSVP.

### 15.3 Regras de negócio

- Um convidado não pode existir sem um grupo (mesmo que seja um grupo próprio).
- Alterar o grupo de um convidado não apaga suas respostas de RSVP anteriores (histórico preservado).
- E-mail/telefone não são obrigatórios (alguns convidados só têm envio de convite físico), mas ao menos um canal de contato é recomendado pela UI (aviso, não bloqueio).

---

## 16. Sistema de RSVP

### 16.1 Conceito

RSVP (*répondez s'il vous plaît*) é o fluxo pelo qual o convidado confirma ou recusa presença.

### 16.2 Configuração por casamento

- O casal define `weddings.rsvp_mode` (`'per_group'` | `'per_guest'`) — coluna própria de comportamento de negócio, deliberadamente separada de `theme_config` (que é exclusivamente visual — ver 22). `'per_group'`: uma resposta cobre todos os membros do grupo. `'per_guest'`: cada convidado do grupo responde separadamente.
- `rsvp_deadline` define o prazo final — após essa data, o formulário público entra em modo somente leitura.

### 16.3 Dados coletados

- Status: `pending` (default) | `confirmed` | `declined`.
- Acompanhantes confirmados como registros nominais em `companions` (nome + restrição alimentar individual), não como um contador solto — necessário para cerimonial/buffet e futuro mapa de mesas. O total de acompanhantes é `count(companions)`, sempre respeitando `guest_groups.max_members`.
- Restrições alimentares do próprio convidado (texto livre + possíveis tags pré-definidas: vegetariano, vegano, sem glúten, sem lactose, alergias) — mesmo formato usado em `companions.dietary_restrictions`.
- Mensagem opcional ao casal.
- Timestamp de resposta (`responded_at`), permitindo reenvio de lembrete apenas para quem ainda está `pending`.
- Fluxo de formulário diferenciado por resultado: recusar presença **não** solicita restrição alimentar/acompanhantes — reduz fricção de quem só precisa dizer "não vou".

### 16.4 Regras de negócio

- Resposta é **editável** até `rsvp_deadline` — reenvio do formulário atualiza o registro existente (não cria duplicata), usando o `guest_access_token` como chave de idempotência.
- Confirmar acompanhantes contra `guest_groups.max_members` é uma operação sujeita a corrida (dois membros do mesmo grupo respondendo simultaneamente no modo `per_guest`), resolvida com o mesmo mecanismo de bloqueio usado na reserva de presentes (ver 13 e 18.3) — nunca apenas validação client-side.
- Painel administrativo exibe contadores **atualizados a cada carregamento/refetch** (não é um canal de push em tempo real — ver 27): confirmados, recusados, pendentes, total de acompanhantes.
- Sistema de lembretes (fase 2 do roadmap): disparo automático de e-mail para convidados `pending` X dias antes do `rsvp_deadline`, registrado em `communications` (não em `guest_access_tokens`, que permanece estável entre envios).

---

## 17. Sistema de Grupos

### 17.1 Conceito

`guest_groups` é a unidade central de organização e comunicação. Todo convite, RSVP (no modo grupo) e lembrete opera nesse nível por padrão.

### 17.2 Funcionalidades previstas

- Criar/renomear/excluir grupos.
- Mover convidados entre grupos (drag-and-drop no painel administrativo).
- Definir `max_members` (limite de acompanhantes permitido para aquele grupo, ex: "Família Silva" pode confirmar até 5 pessoas).
- Visualização em árvore: grupo → convidados → status de RSVP de cada um → acompanhantes nominais confirmados.
- Anotações internas (`notes`) visíveis apenas para o casal/colaboradores (ex.: "sentar longe da família X").

### 17.3 Regras de negócio

- Excluir um grupo com convidados associados exige realocar os convidados para outro grupo ou confirmar exclusão em cascata (soft delete) — nunca exclusão física silenciosa. A cascata soft-deleta os convidados do grupo **e** o próprio grupo (nunca um `DELETE` físico na linha do grupo): `guests.group_id` é `NOT NULL`/`ON DELETE RESTRICT`, então a linha do grupo permanece referenciada por qualquer convidado soft-deleted que já tenha pertencido a ele. Um grupo sem nenhum convidado (nem ativo, nem soft-deleted) também é apenas soft-deleted, pela mesma convenção (seção 11).
- `max_members` é validado no momento do RSVP: o formulário não permite confirmar mais acompanhantes do que o limite definido pelo casal.

---

## 18. Sistema de Presentes

### 18.1 Conceito

Lista de presentes pública, organizada em categorias (`gift_categories`), onde convidados podem reservar itens para evitar duplicidade.

### 18.2 Funcionalidades previstas

- CRUD de presentes pelo painel administrativo (título, descrição, foto, preço estimado, quantidade disponível).
- Reserva de presente pelo convidado (via mesmo `guest_access_token` do RSVP, ou `contributor_name` avulso para presentes físicos entregues por terceiros).
- Suporte a "cota" (múltiplas pessoas contribuindo em dinheiro para um item de maior valor — ex: lua de mel): presentes marcados `is_group_gift = true` têm `target_amount_cents` e recebem múltiplos registros em `gift_contributions` (cada um com `amount_cents`), permitindo mostrar "R$ 3.200 de R$ 5.000 arrecadados" — não apenas "reservado/disponível".
- Presentes simples (`is_group_gift = false`) continuam usando `gift_reservations` — reserva integral e exclusiva de uma unidade.
- Indicação visual clara de "já reservado"/progresso de arrecadação no site público, sem expor nome completo do convidado que reservou (apenas ao casal, no painel administrativo).

### 18.3 Regras de negócio

- Reserva é **atômica**: implementada como função Postgres que executa `SELECT ... FOR UPDATE` na linha do presente dentro de uma transação antes de decrementar `quantity_available` e inserir a reserva — nunca um `check-then-insert` feito na camada de aplicação, que teria condição de corrida real sob concorrência.
- Presente com `quantity_available = 0` não aceita novas reservas e some da vitrine pública (ou aparece como "esgotado", configurável).
- Contribuições em `gift_contributions` não têm essa mesma exclusão mútua por natureza (múltiplas pessoas contribuem para o mesmo alvo), mas a soma nunca é validada apenas no client — o valor exibido de "arrecadado" é sempre uma agregação lida do banco no momento da renderização.
- Cancelamento de reserva/contribuição é possível dentro do próprio fluxo do convidado (via `guest_access_token`), liberando a unidade ou removendo a contribuição.
- Painel administrativo mostra quem reservou/contribuiu o quê, para fins de agradecimento pós-evento.

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
| **Presentes** | CRUD de itens, categorias, visão de reservas |
| **Cronograma** | Gestão de `event_segments` — cerimônia, recepção, festa, cada um com local/horário próprios |
| **Convites e Comunicações** | Geração de tokens de acesso (`guest_access_tokens`), histórico completo de envios por canal (`communications`), reenvio de lembretes sem invalidar o link já compartilhado |
| **Configurações** | Dados do evento (data, nome dos noivos, `rsvp_mode`), tema visual, prazo de RSVP |
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
2. **Convidado reserva presente**: acessa lista de presentes → filtra por categoria/faixa de preço → reserva → recebe confirmação, item marcado como reservado para os demais.
3. **Casal acompanha status**: login → dashboard → visão de pendências → ação direta (reenviar lembrete, editar convidado) sem sair do contexto.

### 20.3 Estados a tratar explicitamente em toda tela de listagem

- Vazio (nenhum convidado/presente cadastrado ainda) — com call-to-action claro.
- Carregando.
- Erro de carregamento — com opção de retry.
- Populado — com paginação ou virtualização se a lista crescer muito (casamentos grandes podem ter 300+ convidados).

---

## 21. Interface do Usuário (UI)

- Interface do **site público** é fortemente visual e emocional (fotos do casal, tipografia expressiva), permitindo customização de tema por casamento.
- Interface do **painel administrativo** é funcional e densa em informação, priorizando escaneabilidade (tabelas, contadores, filtros) sobre estética decorativa.
- Uso consistente de **estado vazio ilustrado** nas listagens administrativas para orientar o próximo passo do usuário.
- Modais reservados para ações rápidas e contidas (ex: editar um convidado); fluxos longos (ex: importação CSV com mapeamento de colunas) usam página dedicada ou wizard em etapas.
- Toasts para feedback de ações assíncronas (sucesso/erro), nunca `alert()` nativo do navegador.

---

## 22. Design System

### 22.1 Fundamentos (tokens)

- **Cor**: paleta base neutra (escala de cinzas) + uma cor de "tema do casamento" configurável (aplicada via CSS variables, permitindo customização por evento sem alterar código).
  ```css
  :root {
    --color-primary: #a8785c; /* customizável por casamento */
    --color-primary-foreground: #ffffff;
    --color-surface: #ffffff;
    --color-surface-muted: #f7f5f3;
    --color-border: #e5e1dd;
    --color-text: #2b2622;
    --color-text-muted: #6b6259;
  }
  ```
- **Tipografia**: uma fonte serifada para o site público (identidade emocional) e uma fonte sans-serif para o painel administrativo (legibilidade em densidade de dados).
- **Espaçamento**: escala baseada em múltiplos de 4px (Tailwind spacing scale padrão, sem customização salvo necessidade real).
- **Raio de borda e sombra**: escala limitada (`sm`, `md`, `lg`) aplicada consistentemente — nenhum valor arbitrário de `border-radius`/`box-shadow` direto em componentes.

### 22.2 Componentes base (`components/ui/`)

| Componente | Responsabilidade |
|---|---|
| `Button` | Variantes: `primary`, `secondary`, `ghost`, `destructive`; tamanhos `sm/md/lg` |
| `Input` / `Textarea` | Campos de formulário com estado de erro integrado |
| `Select` / `Combobox` | Seleção simples e busca (ex: selecionar grupo do convidado) |
| `Checkbox` / `RadioGroup` | Seleção múltipla/única (ex: restrições alimentares) |
| `Modal` / `Dialog` | Confirmações e edições rápidas |
| `Toast` | Feedback de ações |
| `Badge` | Status visual (RSVP confirmado/pendente/recusado) |
| `Card` | Contêiner padrão para itens de lista (convidado, presente) |
| `Table` | Listagens administrativas com ordenação/paginação |
| `Avatar` | Representação visual de convidado/casal |
| `Skeleton` | Estado de carregamento consistente |
| `EmptyState` | Estado vazio ilustrado e padronizado |

### 22.3 Regras de governança

- Nenhum estilo visual (cor, espaçamento, tipografia) é definido diretamente em componentes de domínio — sempre via classes Tailwind mapeadas aos tokens, ou via componente de `components/ui/`.
- Toda nova variante visual passa primeiro pelo Design System antes de ser usada em uma feature específica — proibido criar "botão especial" isolado dentro de uma página.
- Temas por casamento (cor primária, fonte de destaque, foto de capa) são dados armazenados em `weddings.theme_config` (jsonb — exclusivamente atributos visuais, nunca comportamento de negócio como `rsvp_mode`, ver 16.2), aplicados via CSS variables no layout público.

### 22.4 Validação automática de contraste

Ao salvar `theme_config`, a cor primária customizada pelo casal é validada contra `--color-surface`/`--color-text` calculando a razão de contraste (fórmula de luminância relativa do WCAG). Se a combinação ficar abaixo de 4.5:1, a interface administrativa bloqueia o salvamento e sugere o tom mais próximo que atende ao mínimo — evitando que a customização visual quebre a acessibilidade prometida na seção 25.

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

### 23.2 Critério para "promover" um componente a reutilizável

Um componente só é extraído para uso compartilhado após aparecer em **pelo menos 2 contextos reais** — evita abstração prematura sobre necessidades hipotéticas.

---

## 24. Responsividade

- **Mobile-first** obrigatório: a maioria dos convidados acessará o link de RSVP diretamente do WhatsApp no celular.
- Breakpoints padrão do Tailwind (`sm`, `md`, `lg`, `xl`) — sem breakpoints customizados salvo necessidade comprovada.
- Painel administrativo é otimizado primeiro para desktop/tablet (uso típico do casal planejando em casa), mas nenhuma tela pode "quebrar" em mobile — no mínimo, uso funcional garantido.
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

---

## 28. Segurança

- **Row Level Security** ativa em 100% das tabelas, mas com um limite explícito: RLS é a última linha de defesa apenas no **caminho administrativo** (Supabase Auth / `auth.uid()`). No **caminho do convidado**, o Nitro server usa a `service_role key` (que ignora RLS) e a autorização é feita manualmente no código — ver 4.5 e 14.6 para o detalhamento desse modelo de confiança duplo.
- **Princípio do menor privilégio**: o client (browser) nunca usa a `service_role key` do Supabase — apenas o server (Nitro) tem acesso a credenciais privilegiadas, via variáveis de ambiente não expostas ao bundle client.
- **Tokens de convidado hasheados em repouso**: `guest_access_tokens.code_hash` nunca armazena o valor em texto plano (ver 11 e 13) — um vazamento de banco não deve permitir reuso direto dos códigos de acesso.
- **Validação em ambas as camadas**: Zod no client (UX) e Zod novamente no server (segurança) — nunca confiar apenas na validação do formulário.
- **Rate limiting com store durável e compartilhado** (Upstash Redis, ver 3) em endpoints públicos sensíveis (`rsvp/[code]`, resolução de token de acesso) para mitigar enumeração/brute force — contadores em memória de processo não protegem nada em ambiente serverless multi-instância.
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

### Fase 0 — Fundação (atual)
- [x] Especificação técnica e de produto (este documento).
- [ ] Setup inicial do projeto Nuxt + Supabase + CI.
- [ ] Schema inicial do banco de dados + RLS básica.
- [ ] Design System — tokens e componentes atômicos essenciais.

### Fase 1 — MVP Single-Tenant
- [ ] Autenticação do casal (login/cadastro).
- [ ] CRUD de convidados e grupos.
- [ ] Configuração básica do evento (data, local, tema visual simples).
- [ ] Site público com informações do evento.
- [ ] Fluxo de RSVP via código único.
- [ ] Lista de presentes com reserva.
- [ ] Dashboard administrativo com contadores essenciais.

### Fase 2 — Consolidação
- [ ] Importação de convidados via CSV.
- [ ] Lembretes automáticos de RSVP por e-mail.
- [ ] Exportação de dados (convidados, presentes) em CSV/PDF.
- [ ] Convite com geração de link/QR code.
- [ ] Colaboradores com permissões granulares.
- [ ] Auditoria completa de ações administrativas.
- [ ] Testes E2E cobrindo os fluxos críticos (RSVP, reserva de presente, login).

### Fase 3 — Refinamento de Produto
- [ ] Galeria de fotos do casal com upload direto (Supabase Storage).
- [ ] Temas visuais pré-configurados (templates de Design System) selecionáveis pelo casal.
- [ ] Cronograma detalhado do evento (timeline visual: cerimônia, recepção, festa).
- [ ] Mapa/localização integrada (embed de mapa até o local do evento).
- [ ] Confirmação por WhatsApp (link direto pré-preenchido) como canal alternativo ao e-mail.
- [ ] Internacionalização (i18n) — suporte a inglês/espanhol.

### Fase 4 — Preparação para Escala
- [ ] Revisão de performance com dados de casamentos grandes (500+ convidados).
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
