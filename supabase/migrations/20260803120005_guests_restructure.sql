-- Reestruturação de guests (CLAUDE.md, seção 12.1/15):
--   * guests.group_id passa a apontar para a nova tabela `groups` (etiqueta
--     livre) — o que antes era guests.group_id (apontando para guest_groups,
--     agora invites) migra para a nova coluna guests.invite_id.
--   * novos campos de perfil (apelido, sexo, nascimento, foto, papel de
--     padrinho/madrinha, observações internas).
--   * guests.party_id/party_order — vínculo de Acompanhantes (guest_parties).
--   * is_child deixa de ser coluna: vira função calculada a partir de
--     birth_date + weddings.child_max_age (migration seguinte).

-- O trigger antigo é "before update OF wedding_id, group_id" — essa
-- cláusula cria uma dependência de catálogo na coluna (pg_trigger.tgattr),
-- então group_id não pode ser dropada enquanto o trigger antigo existir.
drop trigger guests_check_wedding_id_trigger on guests;

alter table guests add column invite_id uuid;
update guests set invite_id = group_id;

-- Remove a FK/coluna antiga (guest_id -> guest_groups/invites) e recria
-- group_id com o novo significado (guest_id -> groups, etiqueta livre,
-- opcional). Precisa vir depois do backfill acima.
alter table guests drop column group_id;
alter table guests add column group_id uuid references groups (id) on delete set null;

alter table guests
  add column nickname text,
  add column sex text check (sex is null or sex in ('male', 'female', 'other')),
  add column birth_date date,
  add column photo_path text,
  add column wedding_role text check (wedding_role is null or wedding_role in ('padrinho', 'madrinha')),
  add column notes text,
  add column party_id uuid references guest_parties (id) on delete set null,
  add column party_order smallint not null default 0;

alter table guests drop column is_child;

alter table guests
  add constraint guests_invite_id_fkey foreign key (invite_id) references invites (id) on delete restrict;

create index guests_invite_id_idx on guests (invite_id);
create index guests_party_id_idx on guests (party_id);
create index guests_group_id_idx on guests (group_id);
create unique index guests_party_id_party_order_key
  on guests (party_id, party_order)
  where party_id is not null;

comment on column guests.invite_id is
  'Convite ao qual o convidado pertence — nulo até ser vinculado a um convite (ex.: "Fazer Depois" no wizard de cadastro). Convidado só consegue RSVP depois de ter um invite_id.';
comment on column guests.group_id is
  'Etiqueta organizacional livre (groups) — não confundir com invite_id (unidade de RSVP) nem party_id (Acompanhantes).';
comment on column guests.party_id is
  'Vínculo simétrico de Acompanhantes (guest_parties) — todo guest com o mesmo party_id é acompanhante dos demais. Nunca exposto como "família" na UI.';
comment on column guests.party_order is
  'Posição de exibição dentro do grupo de Acompanhantes — 0 é sempre o responsável/principal, reordenável por drag-and-drop. Mesma ordem em toda a plataforma.';
comment on column guests.wedding_role is
  'padrinho | madrinha, opcional.';
comment on column guests.notes is
  'Observação interna do convidado (admin) — distinta das notas do convite (invites.notes).';

-- Reescreve o trigger de consistência de wedding_id: antes validava contra
-- guest_groups via group_id (obrigatório); agora valida invite_id (opcional,
-- mas quando presente precisa bater), group_id (opcional, novo significado)
-- e party_id (opcional) — todos precisam pertencer ao mesmo wedding_id.
create or replace function guests_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_invite_wedding_id uuid;
  v_group_wedding_id uuid;
  v_party_wedding_id uuid;
begin
  if new.invite_id is not null then
    select wedding_id into v_invite_wedding_id from invites where id = new.invite_id;
    if v_invite_wedding_id is null then
      raise exception 'invites % não encontrado', new.invite_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_invite_wedding_id <> new.wedding_id then
      raise exception 'guests.wedding_id (%) não bate com invites.wedding_id (%) do convite %',
        new.wedding_id, v_invite_wedding_id, new.invite_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.group_id is not null then
    select wedding_id into v_group_wedding_id from groups where id = new.group_id;
    if v_group_wedding_id is null then
      raise exception 'groups % não encontrado', new.group_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_group_wedding_id <> new.wedding_id then
      raise exception 'guests.wedding_id (%) não bate com groups.wedding_id (%) do grupo %',
        new.wedding_id, v_group_wedding_id, new.group_id
        using errcode = 'check_violation';
    end if;
  end if;

  if new.party_id is not null then
    select wedding_id into v_party_wedding_id from guest_parties where id = new.party_id;
    if v_party_wedding_id is null then
      raise exception 'guest_parties % não encontrado', new.party_id
        using errcode = 'foreign_key_violation';
    end if;
    if v_party_wedding_id <> new.wedding_id then
      raise exception 'guests.wedding_id (%) não bate com guest_parties.wedding_id (%) do grupo %',
        new.wedding_id, v_party_wedding_id, new.party_id
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger guests_check_wedding_id_trigger
  before insert or update of wedding_id, invite_id, group_id, party_id on guests
  for each row
  execute function guests_check_wedding_id();
