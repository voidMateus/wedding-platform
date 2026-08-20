# Banco de Dados — MeuSiteCasamento

> Modelo de dados completo: princípios de modelagem, tabelas, relacionamentos e convenções SQL. Para como isso se traduz em migrations/RLS/funções Postgres na prática, ver [`ARCHITECTURE.md`](ARCHITECTURE.md) (seções 4, 9.1). Para regras de negócio que motivam certas colunas/constraints, ver [`PRODUCT.md`](PRODUCT.md). Em caso de conflito, [`CLAUDE.md`](../CLAUDE.md) prevalece.

---

## 1. Princípios de modelagem

- **SGBD**: PostgreSQL 15+ (via Supabase).
- **Modelagem**: normalizada (3FN) como padrão; denormalização só é aceita com justificativa de performance documentada em comentário SQL.
- **Chaves primárias**: `uuid` (`gen_random_uuid()`), nunca `serial`/`bigserial` — evita vazamento de contagem de registros e facilita merge futuro entre tenants.
- **Timestamps**: toda tabela possui `created_at` e `updated_at` (`timestamptz`, default `now()`), atualizados via trigger `set_updated_at`. Exceção deliberada: `invite_events` (log append-only) não tem `updated_at` — um log nunca é editado.
- **Soft delete**: entidades com valor histórico (convidados, presentes) usam `deleted_at timestamptz null` em vez de exclusão física, permitindo recuperação e auditoria. `invites` e `groups` também usam soft delete — não por valor histórico próprio, mas porque `guests.invite_id`/`guests.group_id` podem referenciar essas linhas mesmo após um convidado ser soft-deleted (ver seção 3.3). `event_segments`, por outro lado, usa exclusão física — nenhuma outra tabela referencia essa entidade e ela não tem valor histórico por si só. `guest_parties` e `invite_tags` não têm soft delete — não carregam valor histórico próprio (ver seção 3.2).
- **Row Level Security (RLS)**: habilitado em **todas** as tabelas desde a v1, mesmo em modo single-tenant. Na maioria das tabelas, a policy filtra por `wedding_id` pertencente ao usuário autenticado (caminho administrativo, preparando a base para o modelo SaaS); `weddings` e `event_segments` também têm uma policy adicional de leitura pública, sem filtro de `wedding_id`, para atender o site público (ver CLAUDE.md, Modelo de Confiança). O caminho do convidado tem enforcement próprio, fora de RLS.
- **`wedding_id` denormalizado em toda tabela filha**: mesmo quando `wedding_id` é tecnicamente derivável via join (ex.: `guests` → `invites` → `weddings`), a coluna é duplicada diretamente na tabela filha (`guests.wedding_id`, `rsvp_responses.wedding_id`, `gift_reservations.wedding_id` etc.). Isso simplifica e acelera as RLS policies (evita join por linha) e prepara particionamento futuro por `wedding_id` (ver [`ROADMAP.md`](ROADMAP.md), seção "Riscos técnicos"). A consistência entre `guests.wedding_id` e `guests.invite_id → invites.wedding_id` (assim como `group_id`/`party_id`, quando preenchidos) é garantida por trigger, não apenas por convenção.
- **Tokens de acesso hasheados em repouso**: qualquer valor que funcione como credencial (código de acesso do convite) é armazenado como hash (ex.: SHA-256), nunca em texto plano — comparação sempre feita pelo hash do valor recebido. Reduz o dano de um vazamento de banco a zero reutilização direta dos códigos.
- **Extensões utilizadas**: `pgcrypto` (geração de UUID e hashing), `citext` (e-mails case-insensitive), `unaccent` (busca tolerante de nome, ver seção 3.1).

## 2. Visão geral das tabelas

**Domínio principal**

| Tabela | Propósito |
|---|---|
| `weddings` | Um casamento/evento — unidade central de particionamento |
| `wedding_members` | Usuários com acesso administrativo a um casamento (casal, colaboradores) |
| `event_segments` | Etapas do evento (cerimônia, recepção, festa), cada uma com local e horário próprios |
| `invites` | Convite — quem recebeu o mesmo convite físico/digital. Unidade real de RSVP, com um Convidado Responsável opcional (`responsible_guest_id`) |
| `groups` | Etiqueta organizacional livre do convidado (Família da Noiva, Amigos, Trabalho...) — **não é** a unidade de RSVP; não confundir com `invites` nem `guest_parties` (ver seção 3.1) |
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
| `gift_payments` | Tentativas de checkout via InfinitePay — única origem de efeito de negócio no caminho pago; `gift_reservations`/`gift_contributions` só são gravadas depois de um pagamento confirmado |

**Acesso e comunicação**

| Tabela | Propósito |
|---|---|
| `guest_access_tokens` | Credencial estável de acesso ao convite (hash do código), sempre por `invite_id` — independente de quantas comunicações foram enviadas |
| `communications` | Log de cada envio (convite, lembrete, confirmação) por canal — 1:N em relação ao token de acesso |

**Mídia e operação**

| Tabela | Propósito |
|---|---|
| `photos` | Itens da galeria de fotos do casal. Referencia um arquivo de uma fonte externa espelhada (`source_connection_id` → `gallery_source_connections`, `source_file_id`, `source_thumbnail_url`, `source_mime_type`), servido direto do Google (thumbnail do Drive), nunca copiado — `storage_path` é coluna legada (nullable, não mais escrita). Policy de leitura pública (`photos_select_public`) além da de membros; `focal_x`/`focal_y` (ponto de foco, ver [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md)) |
| `gallery_source_connections` | Conexão do casamento com a fonte externa da galeria (Google Drive hoje). Uma por `wedding_id`. Modo `oauth` (tokens cifrados em repouso — AES-256-GCM) ou `public_link` (URL de pasta pública). `provider` é ponto de extensão pra outras fontes sem migration estrutural. Sem policy pública (guarda segredo) |
| `jobs` | Fila de processamento assíncrono (importação de CSV, envio de e-mail em lote) — **ainda não implementada**, ver [`ARCHITECTURE.md`](ARCHITECTURE.md) seção 3.4 |
| `audit_logs` | Trilha de auditoria de ações administrativas sensíveis |

## 3. Modelo Entidade-Relacionamento

> As tabelas abaixo (colunas-chave e relações, não diagramas ASCII) são a representação de referência. Em caso de divergência, a lista de regras em texto (3.2) é a fonte de verdade.

### 3.1 Entidades e relações

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

### 3.2 Regras de relacionamento

- `guests.invite_id` é o vínculo que habilita RSVP — nullable até o convidado ser vinculado a um convite (ex.: "Fazer Depois" no wizard de cadastro), mas obrigatório pra responder RSVP. `guests.group_id` (etiqueta livre) e `guests.party_id` (Acompanhantes) são **independentes** de `invite_id` e entre si — os três nunca devem ser confundidos (ver seção 2).
- `guests.wedding_id` e `rsvp_responses.wedding_id` são denormalizados (ver seção 1) e mantidos consistentes com o `wedding_id` de `invite_id`/`group_id`/`party_id` via trigger — nunca definidos de forma independente pela aplicação.
- `rsvp_responses.guest_id` é obrigatório e único (RSVP é sempre por convidado — não existe mais "modo grupo"); `invite_id` é desnormalizado a partir de `guests.invite_id` pra agregação rápida por convite.
- `is_child` **não é uma coluna** — é sempre calculado por `guest_is_child(birth_date, wedding_id)` a partir de `guests.birth_date` + `weddings.child_max_age` (default 11 anos). Sem `birth_date`, o convidado conta como adulto.
- `companions` (acompanhante avulso) só existe quando `weddings.guest_list_mode = 'open'`, pendurado em `invite_id`. Confirmar um avulso contra `invites.max_companions` é uma operação sujeita a concorrência — resolvida com `SELECT ... FOR UPDATE` na linha do convite dentro de `finalize_invite_rsvp()` (mesmo mecanismo de bloqueio usado na reserva de presentes, ver seção 4 e [`PRODUCT.md`](PRODUCT.md)), nunca apenas validação client-side.
- `gifts.is_group_gift = true` usa `gift_contributions` (soma de `amount_cents` até `target_amount_cents`); `gifts.is_group_gift = false` usa `gift_reservations` (reserva integral e exclusiva). As duas tabelas nunca se aplicam ao mesmo `gift_id`.
- `gift_reservations`/`gift_contributions` sempre têm `guest_id`/`group_id` nulos e `contributor_name` preenchido desde a "Fase Presentes 2.0" — a identificação do fluxo público é **inteiramente** nome/telefone (`contributor_name`/`giver_phone`), nunca ligada à lista de convidados cadastrados. As colunas `guest_id`/`group_id` continuam existindo por compatibilidade com dados anteriores a essa fase.
- `gift_payments.status = 'confirmed'` sempre tem `resulting_reservation_id` **ou** `resulting_contribution_id` preenchido (`CHECK`), nunca os dois — só uma dessas duas tabelas recebe o efeito de um mesmo pagamento, dependendo de `gifts.is_group_gift`.
- `guest_access_tokens` é sempre por `invite_id` (nunca `guest_id`/`group_id` isolado) — o link/QR resolve o convite inteiro; o convidado específico dentro do convite é resolvido por busca tolerante de nome (`guest_name_matches`/`search_guests_by_name`, ver CLAUDE.md, Modelo de Confiança) ou por seleção direta na tela do convite. `communications` é apenas log — revogar/rotacionar um token (`revoked_at`) não apaga o histórico já registrado.
- `invite_tags`/`invite_tag_links` não têm `wedding_id` próprio no link (evita duplicar o par se um convite trocasse de wedding, o que nunca acontece) — RLS via subquery em `invites`.
- Toda tabela com `wedding_id` possui índice composto `(wedding_id, <coluna mais consultada>)` para otimizar queries filtradas por evento.
- `event_segments.same_venue_as` (auto-referência, `on delete set null`) resolve o caso de cerimônia e recepção no mesmo local — quando definido, os campos `venue_name`/`venue_address`/`venue_latitude`/`venue_longitude` deste próprio registro ficam sempre nulos (fonte de verdade única). Validado na aplicação (`server/utils/validate-same-venue.ts`): não pode ser o próprio id, e não pode apontar para um segmento que já tem `same_venue_as` definido (só um nível de indireção). Excluir um segmento referenciado por outro é bloqueado até o dependente ser desvinculado.

## 4. Convenções SQL

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
- **Views**: usadas para agregações reaproveitadas por múltiplos endpoints, quando fizer sentido. Nenhuma view em produção hoje — o dashboard atual computa os contadores em memória em `server/api/dashboard/summary.get.ts`, via `serverSupabaseClient`, respeitando RLS (ver `docs/CHANGELOG.md` para o achado de segurança que motivou remover a última view). Qualquer view futura **precisa** ser criada com `security_invoker = true` (Postgres 15+) — sem isso, a view roda com o privilégio do dono (que ignora RLS), não do usuário que consulta.
- **Colunas de hash**: nomeadas `<coluna>_hash` (ex: `code_hash`), geradas via `pgcrypto` no momento da escrita; o valor em texto plano correspondente nunca é persistido, apenas retornado uma vez no momento da geração (ex: dentro do link enviado ao convidado).
- **Concorrência em operações de estoque/limite** (reserva de presente, acompanhante avulso contra `max_companions`): implementada via função Postgres com `SELECT ... FOR UPDATE` sobre a linha do recurso limitado, dentro de uma transação, combinada com índice único parcial que impede exceder o limite — nunca via `check-then-insert` feito na camada de aplicação.

---

*Este documento evolui junto com o schema real (`supabase/migrations/`). Qualquer mudança de modelagem de dados deve ser refletida aqui antes/junto da migration correspondente.*
