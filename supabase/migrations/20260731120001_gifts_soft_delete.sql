-- Adiciona soft delete a gifts.
--
-- CLAUDE.md, seção 11, já lista "presentes" ao lado de "convidados" como
-- entidade com valor histórico que usa deleted_at — mas a tabela gifts
-- nasceu sem essa coluna. Isso importa na prática: gift_reservations e
-- gift_contributions referenciam gift_id com ON DELETE CASCADE, então uma
-- exclusão física de um presente já reservado apagaria silenciosamente o
-- histórico de quem reservou/contribuiu, usado para agradecimento
-- pós-evento (CLAUDE.md, seção 18.3). Com soft delete, o presente some da
-- vitrine/CRUD ativo, mas o histórico de reservas permanece intacto.

alter table gifts add column deleted_at timestamptz;

comment on column gifts.deleted_at is
  'Soft delete — preserva o histórico em gift_reservations/gift_contributions mesmo após o presente ser removido (CLAUDE.md, seção 11/18.3).';
