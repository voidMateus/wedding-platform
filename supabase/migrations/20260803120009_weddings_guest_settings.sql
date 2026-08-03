-- weddings ganha child_max_age (idade limite para contar como criança —
-- CLAUDE.md, seção 15.2/16) e guest_list_mode (lista fechada/aberta —
-- CLAUDE.md, seção 18.2). rsvp_mode deixa de existir: RSVP é sempre por
-- convidado agora, "modo grupo" não é mais um conceito do produto.

alter table weddings
  add column child_max_age integer not null default 11 check (child_max_age >= 0),
  add column guest_list_mode text not null default 'closed' check (guest_list_mode in ('closed', 'open'));

alter table weddings drop constraint weddings_rsvp_mode_check;
alter table weddings drop column rsvp_mode;

comment on column weddings.child_max_age is
  'Idade (em anos, inclusive) até a qual um convidado é contado como criança — calculado a partir de guests.birth_date, nunca um campo manual (CLAUDE.md, seção 15.2). Sem birth_date, o convidado conta como adulto.';
comment on column weddings.guest_list_mode is
  'closed (padrão): só convidados pré-cadastrados podem confirmar presença. open: permite acompanhante avulso (nome livre, sem cadastro prévio) no RSVP, até invites.max_companions.';
