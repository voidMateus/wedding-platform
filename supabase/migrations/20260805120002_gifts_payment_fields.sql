-- Campos novos de "Presentes 2.0" (CLAUDE.md, seção 18): cota fixa
-- (quota_amount_cents) e presente emocional como variação de exibição de um
-- presente de cota comum (display_style/emotional_icon) — não são entidades
-- novas, só apresentação/parcelamento de gifts.is_group_gift=true.

alter table gifts add column quota_amount_cents integer;
alter table gifts add column display_style text not null default 'standard';
alter table gifts add column emotional_icon text;

alter table gifts add constraint gifts_quota_amount_only_group_gift check (
  quota_amount_cents is null or (is_group_gift and quota_amount_cents > 0)
);

alter table gifts add constraint gifts_display_style_values check (
  display_style in ('standard', 'emotional')
);

alter table gifts add constraint gifts_display_style_only_group_gift check (
  display_style = 'standard' or is_group_gift
);

alter table gifts add constraint gifts_emotional_icon_only_emotional check (
  emotional_icon is null or display_style = 'emotional'
);

comment on column gifts.quota_amount_cents is
  'Valor de uma cota fixa (só em presentes de cota) — quando preenchido, o convidado escolhe quantidade de cotas em vez de digitar um valor livre. Não precisa dividir exatamente target_amount_cents.';
comment on column gifts.display_style is
  '''standard'' (foto de produto) ou ''emotional'' (ícone + frase evocativa, ex. "Nos ajude na primeira compra") — só se aplica a presentes de cota.';
comment on column gifts.emotional_icon is
  'Nome do ícone lucide usado quando display_style=''emotional'' — validado contra um catálogo fixo no Zod (shared/schemas/gifts.ts).';
