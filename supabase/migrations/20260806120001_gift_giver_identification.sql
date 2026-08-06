-- Identificação de quem está presenteando (CLAUDE.md, seção 18) — o token de
-- acesso identifica só o convite (ex.: "Família Silva"), não a pessoa
-- específica dentro dele. Antes de escolher a forma de presentear, o
-- convidado agora se identifica (nome obrigatório + telefone opcional).
-- Reaproveita a coluna contributor_name já existente (antes só usada pelo
-- cenário "presenteador avulso") — os CHECKs existentes já permitem
-- contributor_name preenchido junto de group_id, então não há conflito.

alter table gift_reservations add column giver_phone text;
alter table gift_contributions add column giver_phone text;

comment on column gift_reservations.contributor_name is
  'Nome de quem presenteou — sempre preenchido no caminho do convidado (identificação obrigatória antes de escolher a forma de presentear), preenchido manualmente só no cenário legado de presenteador avulso sem convite.';
comment on column gift_reservations.giver_phone is
  'Telefone de quem presenteou (opcional) — coletado junto com contributor_name.';
comment on column gift_contributions.giver_phone is
  'Telefone de quem contribuiu (opcional) — coletado junto com contributor_name.';

alter table gift_payments add column giver_name text not null default '';
alter table gift_payments add column giver_phone text;
alter table gift_payments alter column giver_name drop default;

comment on column gift_payments.giver_name is
  'Nome de quem está pagando, coletado antes do checkout — repassado para gift_reservations.contributor_name/gift_contributions.contributor_name por confirm_gift_payment().';
comment on column gift_payments.giver_phone is
  'Telefone de quem está pagando (opcional) — mesma semântica de giver_name.';
