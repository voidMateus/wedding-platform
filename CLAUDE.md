# CLAUDE.md — Instruções Operacionais

> Este arquivo orienta **como trabalhar neste repositório**: convenções de código, comandos, regras críticas que nunca podem ser violadas, e onde encontrar cada tipo de documentação mais profunda. Ele **não é** a especificação completa do produto — decisões de produto, modelo de dados detalhado, design system e roadmap vivem em `docs/` (mapa completo na seção 15). Qualquer assistente de IA ou desenvolvedor humano deve ler este arquivo antes de propor mudanças; para mudanças estruturais (banco, autenticação, fluxos críticos, design system), ler também o documento específico apontado na seção 15 antes de agir.

**Status:** Documento vivo. Reorganizado em 2026-08-20 (histórico completo em `docs/CHANGELOG.md`) — antes disso, este arquivo continha a especificação completa de produto; esse conteúdo foi curado e movido para `docs/PRODUCT.md`, `docs/DATABASE.md`, `docs/DESIGN-SYSTEM.md` e `docs/ROADMAP.md`.

---

## 1. O Projeto

**MeuSiteCasamento** é uma aplicação web para casais organizarem o site do casamento, lista de convidados, RSVP e lista de presentes, com um painel administrativo para o casal acompanhar tudo. Single-tenant hoje (um casamento por instância, mas todo o modelo de dados já é particionado por `casamento_id`, preparando uma transição futura para SaaS multi-tenant — ver `docs/ROADMAP.md`). Visão completa de produto, personas e regras de negócio: **[`docs/PRODUCT.md`](docs/PRODUCT.md)**.

## 2. Stack Tecnológica

| Camada | Tecnologia | Nota |
|---|---|---|
| Framework Frontend/Fullstack | **Nuxt 4** (Vue 3, Composition API) | SSR nativo, file-based routing, Nitro server engine |
| Linguagem | **TypeScript** (`strict: true`) | Ponta a ponta, incluindo `server/` (Nitro) |
| Estilização | **Tailwind CSS v4** (CSS-first, `@theme` — sem `tailwind.config.ts`) + CSS Variables para tema | Customização de tema por casamento |
| Componentes UI base | **Reka UI** (headless) + Design System próprio | Ver `docs/DESIGN-SYSTEM.md` |
| Gerenciamento de estado | **Pinia** | Só `auth.store.ts`/`ui.store.ts` — ver seção 9 |
| Backend / API | **Nitro server routes** (`server/api/**`) | Dentro do próprio Nuxt |
| Banco de dados | **PostgreSQL** (via Supabase) | RLS em 100% das tabelas |
| Camada de dados/auth | **Supabase** (Postgres + Auth) | Client `service_role` só em `server/utils/` |
| Migrations | **Supabase CLI / SQL versionadas** | `supabase/migrations/`, nunca editadas após merge |
| Validação de schema | **Zod** (`shared/schemas/`) | Fonte de verdade client + server |
| Formulários | **VeeValidate** + resolver Zod | |
| Testes unitários | **Vitest** | `tests/unit/` |
| Testes E2E | **Playwright** | `tests/e2e/` |
| Lint/Format | **ESLint** (`@nuxt/eslint`) + **Prettier** | Formatação 100% delegada ao Prettier |
| Rate limiting | **Upstash Redis** | Store durável — nunca memória de processo (serverless multi-instância) |
| Hospedagem | **Vercel** | Deploy integrado, cron (`vercel.json`) |
| Pagamento online | **InfinitePay** (checkout hospedado) | Detalhes/limitações: `docs/PRODUCT.md` seção 6 |
| Mapa (exibição) | **Embed do Google Maps** (`<iframe>`, sem API key) | `components/ui/VenueMap.vue` — site público e preview do painel |
| Busca de lugares | **Google Places API (New)**, atrás de interface | `server/utils/places-provider.ts` (contrato) + `places-google.ts` (implementação). Chave server-only; opcional — sem ela, só cadastro manual |
| Mapa (posicionar marcador) | **Leaflet + tiles do OpenStreetMap** | Só no painel (`AdminLocationMapPicker`, `.client.vue`) — nunca no bundle do convidado |

## 3. Comandos

```bash
npm run dev          # dev server (localhost:3000)
npm run build         # build de produção
npm run lint           # ESLint
npm run format          # Prettier --write (format:check para só checar)
npm run typecheck        # nuxt typecheck
npm run test               # Vitest (unitários)
npm run test:e2e            # Playwright (fluxos ponta a ponta)
```

Setup completo (variáveis de ambiente, banco): ver [`README.md`](README.md).

## 4. Arquitetura — o que nunca pode ser violado

### 4.1 Camadas

`pages/` orquestra composables e trata loading/erro/vazio, nunca lógica de negócio direta → `composables/` busca/muta dados → `server/api/` valida (Zod) + autoriza + executa → `server/utils`/Postgres é a fonte de verdade. Toda chamada de rede do client passa por um composable — nunca `$fetch`/`useFetch` direto numa página/componente de domínio. Detalhamento técnico completo (ciclo de vida de requisição, organização de `server/api`, estratégia Supabase): **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**.

### 4.2 Modelo de Confiança por Fluxo — a regra mais importante deste projeto

A arquitetura tem **cinco modelos de enforcement de segurança diferentes**. Confundir um com o outro é a forma mais provável de introduzir uma vulnerabilidade real neste código. Esta tabela organiza por **caminho/rota**; para a mesma informação organizada por **identidade** (dono vs colaborador vs operador de plataforma vs convidado vs visitante), ver [`docs/PRODUCT.md`](docs/PRODUCT.md) seção 1.1.1 — os dois precisam ser mantidos consistentes.

| Caminho | Autenticação | Quem garante isolamento entre dados |
|---|---|---|
| Administrativo (casal/colaboradores) | Supabase Auth (JWT) | **RLS no Postgres** — última linha de defesa; um bug em `server/api` não vaza dado de outro `casamento_id` |
| Convidado (RSVP) — link/QR ou busca por nome | Token opaco, ou nenhuma (busca = só fricção, nomes mascarados) | **Código do `server/api`** — usa `service_role key`, que ignora RLS. Mutação (não leitura) exige também a sessão `rsvp_session` emitida na identificação |
| Presentes (público, sem token) | Nenhuma — qualquer visitante | **Código do `server/api`**, mas a garantia não é "só o dono pode" — é "valor/quantidade são sempre recalculados no servidor, nunca aceitos do client" |
| Público (site do casamento) | Nenhuma — link direto | **RLS** com policy de leitura explícita (`select using (true)`), só em tabelas sem dado sensível |
| Plataforma (equipe interna, `/plataforma/**`) | Supabase Auth (JWT) + linha em `operadores_plataforma` | **Código do `server/api`** — este caminho é deliberadamente cross-tenant (lê entre `casamento_id`s), então RLS por-tenant não pode proteger nada aqui; `requirePlatformOperator()` checado em TypeScript é o portão real antes de qualquer uso de `service_role` |

Regras que decorrem disso, sempre:
- **Nunca** aceitar `casamento_id` vindo do body/query de uma requisição administrativa para decidir o que é acessível — sempre resolver a partir do JWT (`membros_casamento`).
- **Nunca** confiar em `guestId`/`inviteId` sozinho vindo de uma URL/busca pública para autorizar uma mutação — endpoints de mutação do caminho do convidado exigem `requireRsvpSessionForInvite()` (sessão emitida só depois de identificação real).
- **Nunca** aceitar valor/quantidade do client em endpoints de presente — sempre recalcular no servidor a partir do `gift_id`.
- **Nunca** tratar o corpo do webhook da InfinitePay como prova de pagamento — a única prova é a reverificação servidor-a-servidor (`payment_check`).
- Ao adicionar um endpoint novo em `/api/public/*` (leitura pura), confirmar antes que a tabela consultada realmente não expõe dado pessoal de convidado — esse padrão só vale para tabelas sem dado sensível.
- **Nunca** adicionar policy de RLS cross-tenant "de conveniência" pra facilitar o caminho da plataforma — o caminho Plataforma é sempre `service_role` + checagem explícita em TypeScript (`requirePlatformOperator`), nunca uma policy que qualquer tenant possa acidentalmente herdar.

Detalhamento completo de cada fluxo (RSVP, presentes, sessão de posse): **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**, seções "Fluxo de Autenticação", "Fluxo de RSVP", "Fluxo de Presentes".

### 4.3 Renderização

Site público: SSR (SEO, Open Graph para WhatsApp). Painel admin: client-side (`ssr: false`), não precisa de SEO. Dados que definem SEO (nome do casal, data) **precisam** vir de `useAsyncData` no server — nunca só `onMounted` + fetch client-side.

## 5. Estrutura de Pastas (resumo)

```
app/{assets,components,composables,layouts,middleware,pages,stores,types,utils}/
server/{api,middleware,utils}/
shared/{schemas,utils}/       # alias #shared — único importável por client E server
supabase/{migrations,seed.sql}/
tests/{unit,e2e}/
docs/                          # ver seção 15
```

Árvore completa e comentada, com mapeamento de `server/api` por domínio: **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)**, seção 1.

**Regras de organização (nunca violar):**
- Nenhum componente de `components/admin/` é importado em `components/public/` e vice-versa — contextos desacoplados.
- `components/ui/` é o único lugar para componentes "genéricos" (Button, Modal, Input). Duplicar um fora dali é proibido.
- Componente novo genérico só é promovido a `components/ui/`/reutilizável depois de aparecer em **2+ contextos reais** — nunca abstração especulativa.

## 6. Convenções de Código

- **Idioma**: desde a remodelagem para português de 2026-08-21 (aprovada mesmo contra a recomendação técnica original da auditoria — ver `docs/CHANGELOG.md`), identificador que **espelha vocabulário de banco/domínio** (tabelas, colunas, tipos derivados de `Row` do Supabase, campos de schema Zod que validam entrada para essas tabelas, enums de negócio) é em **português**, casando 1:1 com o nome da coluna Postgres — nunca uma tradução livre divergente. Duas exceções deliberadas e permanentes: (1) DTOs computados/agregados que um endpoint monta especificamente para exibição (ex.: `PublicGift`, o `wedding` de `RsvpInvitePayload`) permanecem em **inglês** — não espelham uma linha de tabela 1:1, e misturar os dois padrões no mesmo objeto seria pior que escolher um; (2) nomes de composable (`useGuests`, `useInvites`...), pastas de componente (`components/gifts/`) e pastas de rota de `server/api/**` permanecem em **inglês** — são organização interna de código/infraestrutura de protocolo, não vocabulário de dados do domínio (mesmo raciocínio já aplicado às rotas de API, decisão confirmada com o usuário em 2026-08-21). Termos universais (RSVP, CPF, CNPJ, UUID, URL) nunca são traduzidos. Identificador genérico/técnico sem ligação a vocabulário de negócio (loop, helper, nome de variável local) segue inglês, como de costume. Textos visíveis ao usuário sempre em **português (pt-BR)**.
- **Nomenclatura de arquivos**: componentes Vue `PascalCase.vue`; composables `camelCase.ts` com prefixo `use`; stores Pinia `kebab-case.store.ts`; rotas de API seguem a convenção do Nuxt (`index.get.ts`, `[id].patch.ts`).
- **Variáveis/funções**: `camelCase`. Constantes globais: `UPPER_SNAKE_CASE`. **Sem números mágicos** — valor de negócio (prazo, limite) é sempre constante nomeada.
- **Tipos/interfaces**: `PascalCase`, sem prefixo `I` (`Guest`, não `IGuest`).
- **Formatação**: 100% Prettier — nenhuma discussão manual de estilo em review.
- **Imports**: ordem por convenção manual, não imposta por regra de lint (built-in → externos → internos `~/` → relativos) — seguir o padrão dos arquivos vizinhos.
- **Comentários**: só quando o "porquê" não é óbvio (decisão não trivial, workaround, restrição de negócio). Proibido comentário que só repete o que o código já diz.
- **Tamanho**: componente `.vue` passando de ~200 linhas de `<script setup>` é sinal de dividir ou extrair pra composable.

## 7. Padrões Vue / Nuxt

- `<script setup lang="ts">` obrigatório — Options API não é permitida em código novo. Ordem interna: imports → props/emits → composables/stores → estado local → computed → watchers → handlers → lifecycle.
- Props/emits sempre tipados via `defineProps<Props>()`/`defineEmits<Emits>()` — nunca a forma runtime em código novo. Props obrigatórias sem default; opcionais usam `withDefaults`. Eventos: `update:algo` para v-model customizado; verbo claro para os demais (`confirmed`, `cancel`, `submit`).
- Aproveitar auto-import do Nuxt (componentes, composables, utils de `app/`) — nunca importar manualmente algo já auto-importável. `shared/` é exceção: precisa de import explícito via alias `#shared/...`.
- Composables com chamada assíncrona de dados usam `useAsyncData`/`useFetch`, nunca `fetch` cru.
- Layouts (`default`, `admin`, `auth`) definem o contexto — nenhuma página alterna visual admin/público via `v-if` dentro do mesmo layout.
- Dados que definem SEO (nome do casal, data, descrição) sempre via `useAsyncData` no server — nunca só `onMounted` + fetch client-side.

## 8. Padrões TypeScript

- `strict: true`, incluindo `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`. **Proibido `any`** — tipo genuinamente desconhecido usa `unknown` + narrowing explícito.
- `database.types.ts` é gerado automaticamente (Supabase CLI) e **nunca editado manualmente** — ajuste de tipo de domínio vai em tipos derivados (`Guest`, `Wedding`...), não no arquivo gerado.
- Schemas Zod são a fonte de verdade de validação; o tipo TS é inferido via `z.infer<typeof schema>` — nunca duplicado entre validação e tipagem.
- Enum de domínio (status de RSVP etc.) é **union type de string literal**, espelhando o `CHECK` do Postgres — nunca `enum` do TypeScript.
- Tipo compartilhado client/server vive em `app/types/` (ou `shared/`) — nunca duplicado entre `server/` e `app/`.

## 9. Organização de Componentes e Estado

- **Categorias**: `components/ui/` (átomos, sem conhecimento de domínio) → `components/{public,rsvp,gifts,admin}/` (domínio, recebem dados via props/composable, não fazem fetch direto exceto quando claramente "self-contained" — ex.: um modal de formulário que chama sua própria mutação) → `pages/**` (orquestram).
- Nenhum componente ultrapassa 3 níveis de prop-drilling sem virar composable com estado compartilhado.
- **Estado**: local (`ref`/`reactive`) por padrão → composable com estado compartilhado quando múltiplos componentes não relacionados hierarquicamente precisam do mesmo dado → Pinia só para estado verdadeiramente global de sessão (hoje: `auth.store.ts`, `ui.store.ts` — `themeConfig`/`sidebarOpen`). Dado vindo do banco é *server state* (`useAsyncData`/`useFetch`), nunca duplicado em Pinia como fonte de verdade. Estado de formulário em andamento nunca vai para Pinia — vive local via VeeValidate.
- Mutação que altera dado no servidor sempre passa por uma action de composable — nenhum componente faz `$fetch` de mutação diretamente.

## 10. Regras críticas — Banco de Dados

- PK sempre `uuid` (`gen_random_uuid()`), nunca `serial`. `snake_case` plural em tabelas, singular em colunas.
- **RLS habilitado em 100% das tabelas**, sempre. Toda tabela nova nasce com RLS + nenhuma policy (deny-by-default); policies adicionadas explicitamente.
- `casamento_id` é **denormalizado** em toda tabela filha (mesmo quando derivável via join) — nunca definido de forma independente da hierarquia real (`convite_id`/`grupo_id`/`nucleo_id`), sempre via trigger.
- Soft delete (`excluido_em`) para entidades com valor histórico (convidados, presentes, convites, grupos); exclusão física só onde não há referência de terceiros nem valor histórico próprio.
- Credencial nunca em texto plano em repouso. Hash de mão única (`codigo_hash`, SHA-256) quando o segredo só precisa ser **comparado** — é sempre o hash que autentica. Cifra reversível (AES-256-GCM, chave só no ambiente do servidor, `server/utils/token-cipher.ts`) só quando o valor original precisa voltar: token OAuth do Drive (precisa ser *usado*) e código de acesso do convite (precisa ser *reexibido* pro casal reenviar sem invalidar o link/QR já compartilhado). Cifra **nunca** autentica, e chave é separada por finalidade — uma env por uso.
- Concorrência em operação de estoque/limite (reserva de presente, `max_acompanhantes`) é **sempre** função Postgres com `SELECT ... FOR UPDATE` numa transação — nunca `check-then-insert` na aplicação.
- View nova **precisa** de `security_invoker = true` — sem isso roda com privilégio do dono (ignora RLS). A regra vem de um achado de segurança real (`docs/CHANGELOG.md`). Existem duas hoje — `convidados_com_status` e `convites_com_resumo` (`docs/DATABASE.md`) —, ambas resolvendo estado consolidado que o PostgREST não expressa a partir da tabela e que a aplicação não pode calcular depois de paginar. View é o último recurso para esse caso, nunca conveniência de consulta.

Schema completo, ERD e convenções SQL: **[`docs/DATABASE.md`](docs/DATABASE.md)**.

## 11. Regras críticas — Segurança

- Client (browser) **nunca** usa `service_role key` — só `server/utils/` a acessa, via variável de ambiente não exposta ao bundle.
- Rate limiting via Upstash Redis (store durável) em todo endpoint público sensível (`/api/rsvp/**`, busca por nome, mutações de presente) — nunca contador em memória de processo.
- Upload de arquivo: allowlist explícita de MIME type, limite de tamanho, nome regenerado no servidor (nunca reaproveitado do upload original).
- **Proibido `v-html` sobre conteúdo gerado por usuário** (mensagem de RSVP, notas) — só sobre conteúdo controlado pela própria equipe.
- Dado pessoal de convidado (nome, telefone, e-mail) nunca logado em texto pleno; acesso de leitura restrito a membros autenticados do respectivo `casamento_id`. Exclusão definitiva (hard delete) sob pedido formal é processo manual, não ação de UI self-service (base legal: legítimo interesse do casal organizador).
- PITR habilitado em produção (retenção 30 dias); restauração de backup testada manualmente antes de cada casamento com data próxima.
- Secrets nunca commitados — geridos via variável de ambiente/secret manager do provedor. `service_role key` tem rotação periódica documentada.
- Ação administrativa sensível (exclusão, mudança de permissão) registrada em `audit_logs` com ator/ação/timestamp; ação automatizada do sistema usa `actor_type = 'system'`.

## 12. Invariantes críticos de regra de negócio

Violar qualquer um destes é bug de produto real, não só estilo — se uma tarefa parecer exigir violar um desses, o objetivo provavelmente foi mal entendido:

- **RSVP é sempre por convidado** — não existe "modo grupo". Resposta editável até `prazo_rsvp`, sempre via upsert (nunca duplicata).
- **`convites` (convite/unidade de RSVP), `grupos` (etiqueta livre) e `nucleos_acompanhantes` (Acompanhantes) são três conceitos independentes** — nunca confundir um pelo outro apesar do nome parecido.
- Presente físico (`e_presente_cota = false`) usa `reservas_presentes`; presente de cota (`true`) usa `contribuicoes_presentes` — nunca os dois pro mesmo `presente_id`.
- Efeito de negócio de pagamento (`reservas_presentes`/`contribuicoes_presentes`) só nasce dentro de `confirmar_pagamento_presente()`, nunca direto de uma requisição do convidado.
- Não existe cancelamento self-service de presente (removido deliberadamente — sem token, não há como provar posse com segurança).
- **Faixa etária é sempre derivada, nunca gravada no convidado.** A data de nascimento pertence ao convidado; a regra de classificação pertence ao evento (`casamentos.config_faixas_etarias`). A classificação é a idade na **data do evento** aplicada às faixas configuradas — calculada por `shared/utils/faixa-etaria.ts`, nunca por limite hardcoded espalhado no código. `convidados.faixa_etaria_manual` existe só para quem não tem data de nascimento cadastrada e **sempre perde** para uma data válida; sem nenhuma das duas, a faixa é "não informada" (nunca se infere idade por nome ou parentesco). Mudar os limites do evento reclassifica a lista inteira sem alterar uma única linha de `convidados`, e a mesma pessoa pode ser criança num evento e adolescente em outro. Detalhes: `docs/PRODUCT.md` seção 3.4.
- **Localização de etapa do cronograma é entidade selecionada, não texto.** Latitude/longitude são dado interno: vêm da escolha no provedor de lugares ou do marcador arrastado no mapa, **nunca** de um campo de formulário. `endereco_local` é sempre o endereço pronto para exibição (as partes do endereço manual servem só para reabrir o formulário). Com `place_id_local` gravado, "Ver no mapa" resolve pelo id — nunca refaz busca textual. "Nenhum resultado no Maps" nunca é erro bloqueante: o cadastro manual é um caminho completo, e o Maps não pode ser dependência que impeça cadastrar um local. Detalhes: `docs/PRODUCT.md` seção 7.4.

Regras de negócio completas por sistema (Convidados, RSVP, Convites/Grupos, Presentes, Admin): **[`docs/PRODUCT.md`](docs/PRODUCT.md)**.

## 13. Governança do Design System

- Nenhum estilo visual (cor, espaçamento, tipografia, raio, sombra) direto em componente de domínio — sempre classe Tailwind mapeada a token, ou componente de `components/ui/`. Nenhum valor arbitrário (`shadow-[...]`, `rounded-[Npx]`) fora de `components/ui/`.
- Toda nova variante visual passa pelo Design System antes de virar feature específica — proibido "botão especial" isolado numa página.
- `config_tema` (jsonb em `casamentos`) é **exclusivamente visual** — nunca comportamento de negócio (isso é `modo_lista_convidados` e afins, colunas próprias). Campo novo do schema precisa entrar também na lista explícita de `server/api/wedding/theme.patch.ts` (bug de campo descartado silenciosamente já ocorreu duas vezes).
- Cor customizada (`primaryColor`/`secondaryColor`/`titleColor`/`bodyColor`) é sempre validada por contraste (≥4.5:1, WCAG AA) antes de salvar.

Tokens, catálogo de componentes, UX, responsividade, acessibilidade e SEO: **[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)**.

## 14. Controle de Versão

- `main` é a branch protegida — sempre deployável, todo merge passa por CI (lint/typecheck/test/build).
- Branches curtas (idealmente < 3 dias): `feature/<descrição-curta>`, `fix/<descrição>`, `chore/`/`refactor/`. Rebase da feature sobre `main` antes do PR (histórico linear); merge do PR via squash.
- Commits seguem **Conventional Commits**, imperativo (`adicionar`, não `adicionado`):
  ```
  <tipo>(<escopo>): <descrição curta>
  ```
  Tipos: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`, `db`. Escopo referencia o domínio (`rsvp`, `gifts`, `guests`, `auth`, `admin`), não o arquivo. `BREAKING CHANGE:` no rodapé quando uma migration remove/renomeia coluna em uso, ou uma API muda contrato de forma incompatível.

## 15. Mapa de Documentação

| Documento | Conteúdo | Consultar antes de... |
|---|---|---|
| **[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)** | Execução técnica: estrutura de diretórios completa, ciclo de vida de requisição, estratégia Supabase por ambiente, organização de APIs, fluxos ponta a ponta (auth/RSVP/presentes), estratégia de testes | Mudar estrutura de pastas, ciclo de requisição, estratégia Supabase, organização de API, ou qualquer um dos três fluxos críticos |
| **[`docs/DATABASE.md`](docs/DATABASE.md)** | Schema completo, ERD, convenções SQL | Criar/alterar tabela, migration, RLS policy |
| **[`docs/PRODUCT.md`](docs/PRODUCT.md)** | Visão de produto, personas, regras de negócio de Convidados/RSVP/Convites/Grupos/Presentes/Admin | Mudar comportamento de um desses sistemas |
| **[`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)** | Tokens visuais, catálogo de componentes `ui/`, UX, responsividade, acessibilidade, SEO | Criar/alterar componente visual, tema, ou qualquer página nova |
| **[`docs/ROADMAP.md`](docs/ROADMAP.md)** | O que falta por fase, estratégia de transição SaaS multi-tenant | Planejar trabalho novo, avaliar se algo é "fase futura" |
| **[`docs/CHANGELOG.md`](docs/CHANGELOG.md)** | Histórico narrativo: achados de bug reais, reversões de escopo, rodadas de iteração por fase | Entender o "porquê" de uma decisão não óbvia — nunca necessário pra executar uma tarefa nova |
| **[`README.md`](README.md)** | Instalação, setup de ambiente, como rodar/testar/buildar localmente | Onboarding |

Em caso de conflito entre documentos, **este CLAUDE.md prevalece** para as regras que ele contém diretamente (seções 4, 10–13) — um documento de `docs/` desatualizado em relação a essas regras precisa ser corrigido, não o contrário. Para tudo que só existe em `docs/` (schema completo, regras de negócio detalhadas, catálogo visual), o documento correspondente é a única fonte — não duplicar aqui.

---

*Este arquivo deve ser atualizado a cada mudança de convenção, comando ou regra crítica. Mudança de regra de negócio/schema/design vai no documento correspondente em `docs/`, não aqui.*
