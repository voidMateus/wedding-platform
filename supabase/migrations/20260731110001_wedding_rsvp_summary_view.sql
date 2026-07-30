-- View de agregação reaproveitada pelo dashboard administrativo (CLAUDE.md,
-- seção 13) — evita repetir a mesma lógica de contagem em múltiplos
-- endpoints. RLS não é definida aqui: uma view herda as policies das
-- tabelas subjacentes quando consultada pelo client da própria requisição
-- (não service_role), então weddings/guests/guest_groups/rsvp_responses
-- continuam protegidas normalmente.
--
-- "pending" não é uma contagem direta (confirm_rsvp() nunca grava
-- status = 'pending' — só existe como default de schema): é calculado pela
-- aplicação como total_de_unidades_convidadas - confirmed - declined, onde
-- a unidade (grupo ou convidado) depende de weddings.rsvp_mode.

create view wedding_rsvp_summary as
select
  w.id as wedding_id,
  (select count(*) from guests g where g.wedding_id = w.id and g.deleted_at is null) as total_guests,
  (select count(*) from guest_groups gg where gg.wedding_id = w.id and gg.deleted_at is null) as total_groups,
  (select count(*) from rsvp_responses r where r.wedding_id = w.id and r.status = 'confirmed') as responses_confirmed,
  (select count(*) from rsvp_responses r where r.wedding_id = w.id and r.status = 'declined') as responses_declined,
  (
    select count(*)
    from companions c
    join rsvp_responses r2 on r2.id = c.rsvp_response_id
    where r2.wedding_id = w.id
  ) as total_companions_confirmed
from weddings w;

comment on view wedding_rsvp_summary is
  'Agregação de contadores de RSVP por wedding, reaproveitada pelo dashboard administrativo (CLAUDE.md, seção 13/19.2).';
