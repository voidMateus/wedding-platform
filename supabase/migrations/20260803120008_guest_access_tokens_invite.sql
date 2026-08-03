-- guest_access_tokens passa a apontar sempre para invite_id — o link/QR
-- exclusivo sempre resolve o convite inteiro (CLAUDE.md, seção 14.5), nunca
-- mais um guest/group isolado, já que o RSVP público resolve o convidado
-- específico dentro do convite pela busca por nome (não mais pelo código).

-- Precisa ser dropado antes das colunas guest_id/group_id (dependência de
-- catálogo do "update of" do trigger antigo, mesmo caso de guests/rsvp_responses).
drop trigger guest_access_tokens_check_wedding_id_trigger on guest_access_tokens;

alter table guest_access_tokens add column invite_id uuid;

update guest_access_tokens
set invite_id = coalesce(group_id, (select invite_id from guests where id = guest_access_tokens.guest_id));

alter table guest_access_tokens alter column invite_id set not null;

alter table guest_access_tokens drop constraint guest_access_tokens_guest_xor_group;
alter table guest_access_tokens drop column guest_id;
alter table guest_access_tokens drop column group_id;

alter table guest_access_tokens
  add constraint guest_access_tokens_invite_id_fkey foreign key (invite_id) references invites (id) on delete cascade;

-- Os índices parciais antigos (active_guest_key/active_group_key) já foram
-- removidos automaticamente junto com as colunas guest_id/group_id.
create unique index guest_access_tokens_active_invite_key
  on guest_access_tokens (invite_id)
  where revoked_at is null;
create index guest_access_tokens_invite_id_idx on guest_access_tokens (invite_id);

comment on table guest_access_tokens is
  'Única fonte de autenticação implícita do convidado, sempre por invite_id. code_hash nunca guarda o valor em texto plano (CLAUDE.md, seções 11, 14.5).';

create or replace function guest_access_tokens_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_invite_wedding_id uuid;
begin
  select wedding_id into v_invite_wedding_id from invites where id = new.invite_id;

  if v_invite_wedding_id is null then
    raise exception 'invites % não encontrado', new.invite_id
      using errcode = 'foreign_key_violation';
  end if;

  if v_invite_wedding_id <> new.wedding_id then
    raise exception 'guest_access_tokens.wedding_id (%) não bate com invites.wedding_id (%)',
      new.wedding_id, v_invite_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger guest_access_tokens_check_wedding_id_trigger
  before insert or update of wedding_id, invite_id on guest_access_tokens
  for each row
  execute function guest_access_tokens_check_wedding_id();
