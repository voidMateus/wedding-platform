-- Log de cada envio (convite, lembrete, confirmação) por canal — 1:N em
-- relação ao token de acesso (CLAUDE.md, seções 11-12, 19).

create table communications (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  access_token_id uuid not null references guest_access_tokens (id) on delete cascade,
  type text not null check (type in ('invite', 'reminder', 'confirmation')),
  channel text not null check (channel in ('email', 'whatsapp', 'sms')),
  sent_at timestamptz,
  opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table communications is
  'Log de envio por canal. Reenviar um lembrete gera uma nova linha aqui, sem invalidar o guest_access_token original (CLAUDE.md, seção 12.2).';

create index communications_wedding_id_idx on communications (wedding_id);
create index communications_access_token_id_idx on communications (access_token_id);

create trigger communications_set_updated_at
  before update on communications
  for each row
  execute function set_updated_at();

create function communications_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_token_wedding_id uuid;
begin
  select wedding_id into v_token_wedding_id
  from guest_access_tokens
  where id = new.access_token_id;

  if v_token_wedding_id is null then
    raise exception 'guest_access_tokens % não encontrado', new.access_token_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_token_wedding_id <> new.wedding_id then
    raise exception 'communications.wedding_id (%) não bate com guest_access_tokens.wedding_id (%)',
      new.wedding_id, v_token_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger communications_check_wedding_id_trigger
  before insert or update of wedding_id, access_token_id on communications
  for each row
  execute function communications_check_wedding_id();

alter table communications enable row level security;

create policy communications_select_wedding_members
  on communications for select
  using (is_wedding_member(wedding_id));

create policy communications_insert_wedding_members
  on communications for insert
  with check (is_wedding_member(wedding_id));

create policy communications_update_wedding_members
  on communications for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));
