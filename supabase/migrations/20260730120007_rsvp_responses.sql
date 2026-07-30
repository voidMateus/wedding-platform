-- Resposta de confirmação de presença, vinculada a um convidado (modo
-- per_guest) ou a um grupo (modo per_group) — CLAUDE.md, seções 11-12, 16.

create table rsvp_responses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  guest_id uuid references guests (id) on delete cascade,
  group_id uuid references guest_groups (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  dietary_notes text,
  message text,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rsvp_responses_guest_xor_group check (num_nonnulls(guest_id, group_id) = 1)
);

comment on table rsvp_responses is
  'Resposta de RSVP. Referencia guest_id OU group_id (nunca ambos/nenhum) conforme weddings.rsvp_mode (CLAUDE.md, seção 12.2).';
comment on column rsvp_responses.message is
  'Texto livre do convidado — sempre renderizado via interpolação padrão do Vue no client, nunca v-html (CLAUDE.md, seção 28).';

create index rsvp_responses_wedding_id_idx on rsvp_responses (wedding_id);
-- Índices únicos parciais: alvo de upsert de confirm_rsvp() (ON CONFLICT) e
-- garantia de uma única resposta por convidado/grupo (CLAUDE.md, seção 16.4).
create unique index rsvp_responses_guest_id_key on rsvp_responses (guest_id) where guest_id is not null;
create unique index rsvp_responses_group_id_key on rsvp_responses (group_id) where group_id is not null;

create trigger rsvp_responses_set_updated_at
  before update on rsvp_responses
  for each row
  execute function set_updated_at();

-- Garante rsvp_responses.wedding_id consistente com o guest/group referenciado.
create function rsvp_responses_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_parent_wedding_id uuid;
begin
  if new.guest_id is not null then
    select wedding_id into v_parent_wedding_id from guests where id = new.guest_id;
  else
    select wedding_id into v_parent_wedding_id from guest_groups where id = new.group_id;
  end if;

  if v_parent_wedding_id is null then
    raise exception 'guest/group referenciado por rsvp_responses não encontrado'
      using errcode = 'foreign_key_violation';
  end if;

  if v_parent_wedding_id <> new.wedding_id then
    raise exception 'rsvp_responses.wedding_id (%) não bate com o wedding_id do guest/group referenciado (%)',
      new.wedding_id, v_parent_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger rsvp_responses_check_wedding_id_trigger
  before insert or update of wedding_id, guest_id, group_id on rsvp_responses
  for each row
  execute function rsvp_responses_check_wedding_id();

alter table rsvp_responses enable row level security;

create policy rsvp_responses_select_wedding_members
  on rsvp_responses for select
  using (is_wedding_member(wedding_id));

create policy rsvp_responses_insert_wedding_members
  on rsvp_responses for insert
  with check (is_wedding_member(wedding_id));

create policy rsvp_responses_update_wedding_members
  on rsvp_responses for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy rsvp_responses_delete_wedding_members
  on rsvp_responses for delete
  using (is_wedding_member(wedding_id));
