-- Controla quais formas de presentear um item físico o casal disponibiliza
-- (CLAUDE.md, seção 18) — pode ser que não queiram as duas opções (ex.: só
-- aceitar pagamento online, ou nunca cobrar e só aceitar entrega física).
-- Não se aplica a Contribuições/Presentes Emocionais, que sempre exigem
-- pagamento online por natureza (não têm alternativa de "entregar por fora").

alter table weddings add column physical_gift_delivery_mode text not null default 'both';

alter table weddings add constraint weddings_physical_gift_delivery_mode_values check (
  physical_gift_delivery_mode in ('both', 'self_purchase_only', 'payment_only')
);

comment on column weddings.physical_gift_delivery_mode is
  '''both'' (default) mostra as duas opções ao convidado; ''self_purchase_only'' esconde o pagamento online mesmo com infinitepay_handle configurado; ''payment_only'' esconde "vou comprar e entregar". Se ''payment_only'' e infinitepay_handle vazio, nenhuma opção fica disponível — tratado na UI como presente indisponível pra presentear.';
