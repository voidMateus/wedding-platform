-- Presentes deixa de exigir o token de acesso por convite (CLAUDE.md, seção
-- 18) — a página pública fica acessível a qualquer momento, sem link
-- personalizado; a identificação de quem presenteia passa a ser só o passo
-- de nome/telefone do modal (gift_reservations.contributor_name/giver_phone,
-- já suportados). invite_id nunca mais é preenchido pelo fluxo público.

alter table gift_payments alter column invite_id drop not null;

comment on column gift_payments.invite_id is
  'Legado — preenchido só quando presentes ainda exigiam token de convite. O fluxo público atual nunca popula esta coluna; identificação é via giver_name/giver_phone.';
