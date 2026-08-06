-- Achado real (validado com um pagamento de R$1 de verdade): payment_check
-- respondia {"success": false} quando chamado só com handle+order_nsu — a
-- InfinitePay exige também transaction_nsu/slug pra confirmar. Esses dois
-- identificadores só chegam via querystring no redirect de volta ao site
-- (o webhook não é alcançável em localhost/dev, mas o redirect é um
-- navegador → navegador, funciona igual em qualquer ambiente) — CLAUDE.md,
-- seção 18.4/28.3.

alter table gift_payments add column provider_invoice_slug text;

comment on column gift_payments.provider_invoice_slug is
  'Identificador "slug" devolvido pela InfinitePay via querystring no redirect_url (também presente no webhook) — junto com provider_transaction_nsu, necessário pro payment_check confirmar de fato (order_nsu sozinho não é suficiente na prática).';
