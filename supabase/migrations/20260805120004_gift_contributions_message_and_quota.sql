-- Mesmo cartão/mensagem do convidado (ver gift_reservations.message) +
-- registro de quantas cotas fixas uma contribuição representou, quando o
-- presente usa gifts.quota_amount_cents (CLAUDE.md, seção 18).

alter table gift_contributions add column message text;
alter table gift_contributions add column quota_count integer;

alter table gift_contributions add constraint gift_contributions_quota_count_positive check (
  quota_count is null or quota_count > 0
);

comment on column gift_contributions.message is
  'Mensagem opcional do convidado ao casal, escrita no momento de contribuir.';
comment on column gift_contributions.quota_count is
  'Quantidade de cotas fixas que esta contribuição representa, só quando o presente usa gifts.quota_amount_cents — puramente informativo para o admin, amount_cents continua sendo o valor real gravado.';
