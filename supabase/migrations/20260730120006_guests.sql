-- Convidados individuais, sempre pertencentes a um grupo (CLAUDE.md, seções
-- 11-12, 15).

create table guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  group_id uuid not null references guest_groups (id) on delete restrict,
  full_name text not null,
  email citext,
  phone text,
  is_child boolean not null default false,
  dietary_restrictions text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table guests is
  'Convidados individuais. group_id é obrigatório mesmo para convidados "avulsos" — usam um grupo de 1 pessoa (CLAUDE.md, seção 12.2).';
comment on column guests.wedding_id is
  'Denormalizado a partir de guest_groups.wedding_id para simplificar RLS e preparar particionamento futuro (CLAUDE.md, seção 11). Consistência garantida pelo trigger guests_check_wedding_id.';
comment on column guests.deleted_at is
  'Soft delete — preserva histórico de RSVP/presentes associados (CLAUDE.md, seções 11, 15.3).';

-- on delete restrict: excluir um grupo com convidados exige realocação
-- explícita ou exclusão em cascata decidida pela aplicação, nunca uma
-- exclusão física silenciosa (CLAUDE.md, seção 17.3).

create index guests_wedding_id_idx on guests (wedding_id);
create index guests_group_id_idx on guests (group_id);
create unique index guests_wedding_id_email_key
  on guests (wedding_id, email)
  where email is not null and deleted_at is null;

create trigger guests_set_updated_at
  before update on guests
  for each row
  execute function set_updated_at();

-- Garante guests.wedding_id = guest_groups.wedding_id do grupo referenciado
-- (CLAUDE.md, seção 11: consistência via CHECK/trigger, nunca só convenção).
create function guests_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_group_wedding_id uuid;
begin
  select wedding_id into v_group_wedding_id
  from guest_groups
  where id = new.group_id;

  if v_group_wedding_id is null then
    raise exception 'guest_groups % não encontrado', new.group_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_group_wedding_id <> new.wedding_id then
    raise exception 'guests.wedding_id (%) não bate com guest_groups.wedding_id (%) do grupo %',
      new.wedding_id, v_group_wedding_id, new.group_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger guests_check_wedding_id_trigger
  before insert or update of wedding_id, group_id on guests
  for each row
  execute function guests_check_wedding_id();

alter table guests enable row level security;

create policy guests_select_wedding_members
  on guests for select
  using (is_wedding_member(wedding_id));

create policy guests_insert_wedding_members
  on guests for insert
  with check (is_wedding_member(wedding_id));

create policy guests_update_wedding_members
  on guests for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy guests_delete_wedding_members
  on guests for delete
  using (is_wedding_member(wedding_id));
