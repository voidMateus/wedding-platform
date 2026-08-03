-- Reestruturação de companions (CLAUDE.md, seção 18.2/12.1): passa a
-- pendurar no convite (invite_id), não mais numa rsvp_response individual —
-- faz sentido já que RSVP agora é por convidado, mas o acompanhante avulso
-- (nome sem cadastro prévio, só quando weddings.guest_list_mode='open') é um
-- conceito do convite inteiro, não de uma pessoa específica dentro dele.
-- Ganha soft delete: nunca mais removido fisicamente (histórico/auditoria).

-- wedding_rsvp_summary depende de companions.rsvp_response_id (join) —
-- precisa ser dropada antes, senão o DROP COLUMN abaixo falha.
drop view wedding_rsvp_summary;

alter table companions add column invite_id uuid;

update companions c
set invite_id = r.invite_id
from rsvp_responses r
where c.rsvp_response_id = r.id;

drop trigger companions_check_parent_trigger on companions;
drop function companions_check_parent();

alter table companions alter column invite_id set not null;
alter table companions drop column rsvp_response_id;
alter table companions add column deleted_at timestamptz;

alter table companions
  add constraint companions_invite_id_fkey foreign key (invite_id) references invites (id) on delete cascade;

-- companions_rsvp_response_id_idx já foi removido automaticamente junto
-- com a coluna rsvp_response_id.
create index companions_invite_id_idx on companions (invite_id);

comment on table companions is
  'Acompanhante avulso (nome sem cadastro prévio) do convite — só existe quando weddings.guest_list_mode = ''open''. Soft delete: nunca removido fisicamente (CLAUDE.md, seção 11).';
comment on column companions.deleted_at is
  'Soft delete — preserva histórico/rastreabilidade mesmo após o convidado remover um acompanhante avulso no RSVP.';

-- Recriação da view (companions não referencia mais rsvp_response_id) e
-- ajuste de nomenclatura (guest_groups -> invites), já contando "total_invites"
-- em vez de "total_groups". Blocos completos de indicadores (Convites/
-- Pessoas/RSVP) chegam na Fase 7 — esta view só precisa continuar válida.
create view wedding_rsvp_summary as
select
  w.id as wedding_id,
  (select count(*) from guests g where g.wedding_id = w.id and g.deleted_at is null) as total_guests,
  (select count(*) from invites i where i.wedding_id = w.id and i.deleted_at is null) as total_invites,
  (select count(*) from rsvp_responses r where r.wedding_id = w.id and r.status = 'confirmed') as responses_confirmed,
  (select count(*) from rsvp_responses r where r.wedding_id = w.id and r.status = 'declined') as responses_declined,
  (select count(*) from companions c where c.wedding_id = w.id and c.deleted_at is null) as total_companions_confirmed
from weddings w;

comment on view wedding_rsvp_summary is
  'Agregação de contadores de RSVP por wedding, reaproveitada pelo dashboard administrativo (CLAUDE.md, seção 13/19.2).';
