-- Agrupamento de convidados — unidade central de convite e comunicação
-- (CLAUDE.md, seções 11-12, 17).

create table guest_groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  max_members integer not null default 0 check (max_members >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table guest_groups is
  'Agrupamento de convidados (família, amigos...). Todo convidado pertence a um grupo, mesmo que "unitário" (CLAUDE.md, seção 12.2).';
comment on column guest_groups.max_members is
  'Limite de acompanhantes confirmáveis para o grupo — validado por confirm_rsvp() sob bloqueio (CLAUDE.md, seções 13, 17.3).';
comment on column guest_groups.notes is
  'Anotações internas visíveis apenas ao casal/colaboradores (CLAUDE.md, seção 17.2) — nunca renderizadas com v-html no client (CLAUDE.md, seção 28).';

create index guest_groups_wedding_id_idx on guest_groups (wedding_id);

create trigger guest_groups_set_updated_at
  before update on guest_groups
  for each row
  execute function set_updated_at();

alter table guest_groups enable row level security;

create policy guest_groups_select_wedding_members
  on guest_groups for select
  using (is_wedding_member(wedding_id));

create policy guest_groups_insert_wedding_members
  on guest_groups for insert
  with check (is_wedding_member(wedding_id));

create policy guest_groups_update_wedding_members
  on guest_groups for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy guest_groups_delete_wedding_members
  on guest_groups for delete
  using (is_wedding_member(wedding_id));
