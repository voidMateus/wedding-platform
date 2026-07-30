-- Acompanhantes nominais declarados em uma resposta de RSVP confirmada
-- (CLAUDE.md, seções 11-12, 16.3).

create table companions (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  rsvp_response_id uuid not null references rsvp_responses (id) on delete cascade,
  full_name text not null,
  dietary_restrictions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table companions is
  'Acompanhantes nominais de uma rsvp_response confirmada. O total de acompanhantes do grupo é count(companions), nunca um contador solto (CLAUDE.md, seção 12.2).';
comment on column companions.wedding_id is
  'Denormalizado a partir de rsvp_responses.wedding_id, seguindo o mesmo princípio aplicado a guests/rsvp_responses (CLAUDE.md, seção 11).';

create index companions_wedding_id_idx on companions (wedding_id);
create index companions_rsvp_response_id_idx on companions (rsvp_response_id);

create trigger companions_set_updated_at
  before update on companions
  for each row
  execute function set_updated_at();

-- Garante companions.wedding_id consistente com a rsvp_response pai e que a
-- resposta esteja confirmada (CLAUDE.md, seção 12.2).
create function companions_check_parent()
returns trigger
language plpgsql
as $$
declare
  v_parent_wedding_id uuid;
  v_parent_status text;
begin
  select wedding_id, status into v_parent_wedding_id, v_parent_status
  from rsvp_responses
  where id = new.rsvp_response_id;

  if v_parent_wedding_id is null then
    raise exception 'rsvp_responses % não encontrado', new.rsvp_response_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_parent_wedding_id <> new.wedding_id then
    raise exception 'companions.wedding_id (%) não bate com rsvp_responses.wedding_id (%)',
      new.wedding_id, v_parent_wedding_id
      using errcode = 'check_violation';
  end if;

  if v_parent_status <> 'confirmed' then
    raise exception 'companions só pode ser vinculado a uma rsvp_response confirmada (status atual: %)',
      v_parent_status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger companions_check_parent_trigger
  before insert or update of wedding_id, rsvp_response_id on companions
  for each row
  execute function companions_check_parent();

alter table companions enable row level security;

create policy companions_select_wedding_members
  on companions for select
  using (is_wedding_member(wedding_id));

create policy companions_insert_wedding_members
  on companions for insert
  with check (is_wedding_member(wedding_id));

create policy companions_update_wedding_members
  on companions for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy companions_delete_wedding_members
  on companions for delete
  using (is_wedding_member(wedding_id));
