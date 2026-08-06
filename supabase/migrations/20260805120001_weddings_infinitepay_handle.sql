-- Handle (InfiniteTag) público da InfinitePay usado para montar o link de
-- checkout hospedado do fluxo de pagamento Pix de presentes (CLAUDE.md,
-- seção 18). null = casal ainda não ativou pagamentos — a UI pública
-- esconde a opção paga de presentear e bloqueia Contribuições/Emocionais.

alter table weddings add column infinitepay_handle text;

comment on column weddings.infinitepay_handle is
  'InfiniteTag pública do casal (sem o símbolo $), usada para criar links de checkout Pix via InfinitePay. Não é um segredo — é só um identificador de recebedor. null desativa o caminho pago de presentes.';
