-- Etiquetas internas e reutilizáveis de convite (CLAUDE.md, seção 12.1) —
-- VIP, Mesa 01, Pastores... só uso administrativo (filtros/relatórios/
-- exportações), nunca exibidas ao convidado.

create table invite_tags (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table invite_tags is
  'Etiqueta interna livre e reutilizável de convite — só organização administrativa, nunca exibida ao convidado. Sem soft delete: não carrega valor histórico próprio.';

create unique index invite_tags_wedding_id_name_key on invite_tags (wedding_id, name);

create trigger invite_tags_set_updated_at
  before update on invite_tags
  for each row
  execute function set_updated_at();

alter table invite_tags enable row level security;

create policy invite_tags_select_wedding_members
  on invite_tags for select
  using (is_wedding_member(wedding_id));

create policy invite_tags_insert_wedding_members
  on invite_tags for insert
  with check (is_wedding_member(wedding_id));

create policy invite_tags_update_wedding_members
  on invite_tags for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy invite_tags_delete_wedding_members
  on invite_tags for delete
  using (is_wedding_member(wedding_id));

create table invite_tag_links (
  invite_id uuid not null references invites (id) on delete cascade,
  tag_id uuid not null references invite_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (invite_id, tag_id)
);

comment on table invite_tag_links is
  'Muitos-para-muitos entre invites e invite_tags.';

create index invite_tag_links_tag_id_idx on invite_tag_links (tag_id);

alter table invite_tag_links enable row level security;

-- RLS via subquery em invites (ambas as tabelas de invite_tag_links não têm
-- wedding_id próprio — desnormalizar aqui duplicaria o par toda vez que um
-- convite trocasse de wedding, o que nunca acontece; o link em si só existe
-- enquanto ambas as pontas existirem, CLAUDE.md seção 11 permite essa
-- exceção pontual já que não há policy pública nem caminho de convidado
-- para esta tabela).
create policy invite_tag_links_select_wedding_members
  on invite_tag_links for select
  using (exists (select 1 from invites i where i.id = invite_id and is_wedding_member(i.wedding_id)));

create policy invite_tag_links_insert_wedding_members
  on invite_tag_links for insert
  with check (exists (select 1 from invites i where i.id = invite_id and is_wedding_member(i.wedding_id)));

create policy invite_tag_links_delete_wedding_members
  on invite_tag_links for delete
  using (exists (select 1 from invites i where i.id = invite_id and is_wedding_member(i.wedding_id)));
