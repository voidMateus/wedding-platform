-- Reestruturação de rsvp_responses (CLAUDE.md, seção 16): RSVP passa a ser
-- sempre por convidado — o antigo modo "per_group" (uma resposta cobrindo o
-- grupo inteiro) deixa de existir, já que agora cada convidado é
-- pré-cadastrado individualmente e confirma/recusa por conta própria dentro
-- do mesmo convite (mistura "pai vai, filho não vai" é o comportamento
-- padrão, não uma exceção).
--
-- Ambiente ainda pré-lançamento (sem convidados reais usando o produto) —
-- respostas antigas em modo grupo (guest_id null) são descartadas nesta
-- migration; não há dado de produção a preservar.

-- O trigger antigo é "before update OF ..., group_id" — precisa ser
-- dropado antes de dropar a coluna group_id (dependência de catálogo em
-- pg_trigger.tgattr).
drop trigger rsvp_responses_check_wedding_id_trigger on rsvp_responses;

alter table rsvp_responses add column invite_id uuid;

update rsvp_responses r
set invite_id = g.invite_id
from guests g
where r.guest_id = g.id;

delete from rsvp_responses where guest_id is null;

alter table rsvp_responses
  alter column guest_id set not null,
  alter column invite_id set not null;

alter table rsvp_responses drop constraint rsvp_responses_guest_xor_group;
alter table rsvp_responses drop column group_id;

alter table rsvp_responses
  add constraint rsvp_responses_invite_id_fkey foreign key (invite_id) references invites (id) on delete cascade;

-- Status ampliado (CLAUDE.md, seção 16.3): waitlisted/removed são
-- transições só administrativas — o convidado nunca as escolhe sozinho no
-- RSVP público, só confirmed/declined.
alter table rsvp_responses drop constraint rsvp_responses_status_check;
alter table rsvp_responses
  add constraint rsvp_responses_status_check
  check (status in ('pending', 'confirmed', 'declined', 'waitlisted', 'removed'));

-- dietary_notes migra para guests.dietary_restrictions (fonte única,
-- CLAUDE.md seção 16.3) — backfill só onde o convidado ainda não tem valor.
update guests g
set dietary_restrictions = r.dietary_notes
from rsvp_responses r
where r.guest_id = g.id
  and r.dietary_notes is not null
  and g.dietary_restrictions is null;

alter table rsvp_responses drop column dietary_notes;
-- message vira invites.rsvp_message (um por convite, preenchido só na
-- revisão final — CLAUDE.md, seção 16.3); texto livre por convidado não é
-- mantido nesta migração (ambiente pré-lançamento).
alter table rsvp_responses drop column message;

-- rsvp_responses_group_id_key já foi removido automaticamente junto com a
-- coluna group_id (índice parcial sobre a própria coluna).
drop index rsvp_responses_guest_id_key;
create unique index rsvp_responses_guest_id_key on rsvp_responses (guest_id);
create index rsvp_responses_invite_id_idx on rsvp_responses (invite_id);

comment on table rsvp_responses is
  'Resposta de RSVP, sempre por convidado (guest_id). invite_id é desnormalizado a partir de guests.invite_id para agregação rápida por convite (CLAUDE.md, seção 12.1).';
comment on column rsvp_responses.status is
  'pending (default) | confirmed | declined (escolhidos pelo convidado) | waitlisted | removed (só administrativos).';

create or replace function rsvp_responses_check_wedding_id()
returns trigger
language plpgsql
as $$
declare
  v_guest_wedding_id uuid;
  v_invite_wedding_id uuid;
begin
  select wedding_id into v_guest_wedding_id from guests where id = new.guest_id;
  if v_guest_wedding_id is null then
    raise exception 'guests % não encontrado', new.guest_id
      using errcode = 'foreign_key_violation';
  end if;
  if v_guest_wedding_id <> new.wedding_id then
    raise exception 'rsvp_responses.wedding_id (%) não bate com guests.wedding_id (%)',
      new.wedding_id, v_guest_wedding_id
      using errcode = 'check_violation';
  end if;

  select wedding_id into v_invite_wedding_id from invites where id = new.invite_id;
  if v_invite_wedding_id is null then
    raise exception 'invites % não encontrado', new.invite_id
      using errcode = 'foreign_key_violation';
  end if;
  if v_invite_wedding_id <> new.wedding_id then
    raise exception 'rsvp_responses.wedding_id (%) não bate com invites.wedding_id (%)',
      new.wedding_id, v_invite_wedding_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger rsvp_responses_check_wedding_id_trigger
  before insert or update of wedding_id, guest_id, invite_id on rsvp_responses
  for each row
  execute function rsvp_responses_check_wedding_id();
