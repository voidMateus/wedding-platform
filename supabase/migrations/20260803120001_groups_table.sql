-- Etiqueta organizacional livre do convidado (Família da Noiva, Amigos,
-- Trabalho, Igreja...) — CLAUDE.md, seção 11/12. Deliberadamente distinta de
-- `invites` (a antiga guest_groups, renomeada na próxima migration): aqui é
-- só uma tag de organização/filtro, sem nenhuma semântica de RSVP.

create table groups (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint groups_color_format check (color is null or color ~ '^#[0-9a-fA-F]{6}$')
);

comment on table groups is
  'Etiqueta organizacional livre do convidado (Família da Noiva, Amigos, Trabalho...) — não confundir com invites (unidade de RSVP) nem guest_parties (acompanhantes).';
comment on column groups.color is
  'Hex opcional usado em badges/filtros/dashboard — validado por contraste na camada de aplicação (shared/utils/contrast.ts) antes de salvar.';
comment on column groups.deleted_at is
  'Soft delete — mesmo motivo de guest_groups/invites: guests.group_id pode referenciar um grupo mesmo após ele ser "excluído" (CLAUDE.md, seção 11).';

create index groups_wedding_id_idx on groups (wedding_id);

create trigger groups_set_updated_at
  before update on groups
  for each row
  execute function set_updated_at();

alter table groups enable row level security;

create policy groups_select_wedding_members
  on groups for select
  using (is_wedding_member(wedding_id));

create policy groups_insert_wedding_members
  on groups for insert
  with check (is_wedding_member(wedding_id));

create policy groups_update_wedding_members
  on groups for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy groups_delete_wedding_members
  on groups for delete
  using (is_wedding_member(wedding_id));
