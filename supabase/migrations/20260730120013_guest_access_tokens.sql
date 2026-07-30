-- Credencial estável de acesso do convidado/grupo — hash do código, nunca o
-- valor em texto plano (CLAUDE.md, seções 11-13, 14.5).

create table guest_access_tokens (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  guest_id uuid references guests (id) on delete cascade,
  group_id uuid references guest_groups (id) on delete cascade,
  code_hash text not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_access_tokens_guest_xor_group check (num_nonnulls(guest_id, group_id) = 1)
);

comment on table guest_access_tokens is
  'Única fonte de autenticação implícita do convidado. code_hash nunca guarda o valor em texto plano — só existe no link enviado (CLAUDE.md, seções 11, 14.5).';
comment on column guest_access_tokens.revoked_at is
  'Revogação é lógica (soft) — o histórico de communications associado nunca é apagado (CLAUDE.md, seção 12.2). Não há policy de DELETE nesta tabela.';

create index guest_access_tokens_wedding_id_idx on guest_access_tokens (wedding_id);
create unique index guest_access_tokens_code_hash_key on guest_access_tokens (code_hash);
-- Um único token ativo por convidado/grupo (CLAUDE.md, seção 13).
create unique index guest_access_tokens_active_guest_key
  on guest_access_tokens (guest_id)
  where revoked_at is null and guest_id is not null;
create unique index guest_access_tokens_active_group_key
  on guest_access_tokens (group_id)
  where revoked_at is null and group_id is not null;

create trigger guest_access_tokens_set_updated_at
  before update on guest_access_tokens
  for each row
  execute function set_updated_at();

create function guest_access_tokens_check_wedding_id()
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
    raise exception 'guest/group referenciado por guest_access_tokens não encontrado'
      using errcode = 'foreign_key_violation';
  end if;

  if v_parent_wedding_id <> new.wedding_id then
    raise exception 'guest_access_tokens.wedding_id (%) não bate com o wedding_id do guest/group referenciado (%)',
      new.wedding_id, v_parent_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger guest_access_tokens_check_wedding_id_trigger
  before insert or update of wedding_id, guest_id, group_id on guest_access_tokens
  for each row
  execute function guest_access_tokens_check_wedding_id();

alter table guest_access_tokens enable row level security;

create policy guest_access_tokens_select_wedding_members
  on guest_access_tokens for select
  using (is_wedding_member(wedding_id));

create policy guest_access_tokens_insert_wedding_members
  on guest_access_tokens for insert
  with check (is_wedding_member(wedding_id));

-- Só UPDATE (revogar via revoked_at), nunca DELETE — preserva o vínculo
-- histórico com communications (CLAUDE.md, seção 12.2).
create policy guest_access_tokens_update_wedding_members
  on guest_access_tokens for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));
