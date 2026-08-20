# RLS Policies

As policies em si **não são duplicadas aqui** — vivem fisicamente nas migrations
(`supabase/migrations/`), junto com a tabela que protegem. Duplicar o SQL das
policies neste diretório criaria duas fontes de verdade que poderiam divergir
silenciosamente; a alternativa adotada é documentar aqui a **convenção** e um
índice de onde cada conjunto de policies está definido, mantendo a migration
como o único artefato que efetivamente governa o banco.

Isso é uma correção deliberada sobre `docs/ARCHITECTURE.md` (seção 1.1), que
sugeria manter as policies "revisáveis isoladamente, mesmo que fisicamente
apliquem via migration" — na prática isso significaria duas cópias do mesmo
SQL. Ver nota de revisão no PR que introduziu o schema inicial.

## Convenção de nomenclatura

`<tabela>_<operação>_<regra>` (docs/DATABASE.md, seção 4), por exemplo:
`guests_select_wedding_members`, `wedding_members_delete_owner_only`.

## Modelo de confiança (CLAUDE.md, seção 4.2)

RLS protege **exclusivamente o caminho administrativo** (Supabase Auth,
`auth.uid()`). O caminho do convidado (RSVP, presentes) é atendido pelo Nitro
server usando a `service_role key`, que ignora RLS por completo — a
autorização desse caminho é responsabilidade do código em `server/api/**`,
não do banco. Por isso nenhuma tabela abaixo tem policy para usuários
anônimos: o convidado nunca fala com o Postgres via um client com a chave
anônima, só via `server/api` com `service_role`.

Toda tabela nasce com RLS habilitada e **nenhuma policy** (deny-by-default);
policies são adicionadas explicitamente por tabela.

## Funções auxiliares

Definidas em `20260730120003_wedding_members.sql`, reutilizadas por praticamente
toda policy abaixo:

- `is_wedding_member(wedding_id uuid) returns boolean` — `auth.uid()` pertence ao wedding (qualquer papel).
- `is_wedding_owner(wedding_id uuid) returns boolean` — `auth.uid()` é `owner` do wedding.

Ambas `security definer`, para evitar que a policy de `wedding_members`
precise consultar a si mesma sob a própria RLS.

## Índice por tabela

| Tabela                                                     | Migration           | Regra                                                                                                             |
| ---------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `weddings`                                                 | `20260730120002/03` | select/update: qualquer membro · delete: só owner · sem insert (criação é manual/seed nesta fase, docs/ROADMAP.md seção 5.1) |
| `wedding_members`                                          | `20260730120003`    | select: qualquer membro · insert/update/delete: só owner                                                          |
| `event_segments`                                           | `20260730120004`    | CRUD completo para qualquer membro                                                                                |
| `guest_groups`                                             | `20260730120005`    | CRUD completo para qualquer membro                                                                                |
| `guests`                                                   | `20260730120006`    | CRUD completo para qualquer membro                                                                                |
| `rsvp_responses`                                           | `20260730120007`    | CRUD completo para qualquer membro                                                                                |
| `companions`                                               | `20260730120008`    | CRUD completo para qualquer membro                                                                                |
| `gift_categories`                                          | `20260730120009`    | CRUD completo para qualquer membro                                                                                |
| `gifts`                                                    | `20260730120010`    | CRUD completo para qualquer membro                                                                                |
| `gift_reservations`                                        | `20260730120011`    | CRUD completo para qualquer membro                                                                                |
| `gift_contributions`                                       | `20260730120012`    | CRUD completo para qualquer membro                                                                                |
| `guest_access_tokens`                                      | `20260730120013`    | select/insert/update (revogar) · sem delete — preserva vínculo com `communications`                               |
| `communications`                                           | `20260730120014`    | select/insert/update · sem delete — log não é apagado                                                             |
| `photos`                                                   | `20260730120015`    | CRUD completo para qualquer membro                                                                                |
| `jobs`                                                     | `20260730120016`    | select/insert (enfileirar) · sem update/delete — só o worker (`service_role`) muda status                         |
| `audit_logs`                                               | `20260730120017`    | select/insert · sem update/delete — log imutável                                                                  |
| `plans`, `subscriptions`, `usage_counters`, `entitlements` | `20260730120018`    | RLS habilitada, **nenhuma policy** — sem UI/feature usando ainda (docs/ROADMAP.md, seção 8)                          |

### Simplificação assumida — sem ACL granular por colaborador

docs/PRODUCT.md (seção 1.1, Personas) descreve o `collaborator` como tendo
"acesso limitado ao painel administrativo (permissões)", mas o schema atual
não modela uma tabela de permissões por recurso — só o papel
(`owner`/`collaborator`) em `wedding_members.role`. Por isso, nesta fase,
**qualquer membro do wedding (owner ou collaborator) tem CRUD completo** nas
tabelas operacionais; só as ações explicitamente reservadas a `owner`
(docs/PRODUCT.md, seção 7.3 — gerenciar colaboradores, excluir o evento)
usam `is_wedding_owner`. Uma ACL granular por recurso é um schema novo
(tabela de permissões), não uma alteração de policy — fica para quando essa
necessidade de produto for confirmada.
