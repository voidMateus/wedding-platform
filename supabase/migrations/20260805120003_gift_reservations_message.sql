-- Cartão/mensagem do convidado ao presentear (CLAUDE.md, seção 18) —
-- disponível nos dois caminhos de reserva física (grátis e via Pix).

alter table gift_reservations add column message text;

comment on column gift_reservations.message is
  'Mensagem opcional do convidado ao casal, escrita no momento de presentear.';
