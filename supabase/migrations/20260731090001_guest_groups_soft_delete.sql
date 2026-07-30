-- Adiciona soft delete a guest_groups.
--
-- Descoberto ao implementar o CRUD de grupos: guests.group_id é NOT NULL com
-- ON DELETE RESTRICT (CLAUDE.md, seção 17.3 — nunca exclusão física
-- silenciosa), o que significa que um grupo nunca pode ser fisicamente
-- excluído enquanto QUALQUER convidado — mesmo um já soft-deleted — ainda
-- referenciar seu id. "Confirmar exclusão em cascata (soft delete)" (CLAUDE.md,
-- seção 17.3) só é fisicamente possível se o grupo em si também for soft
-- deleted, não hard deleted; do contrário a referência histórica de um
-- convidado soft-deleted ("este convidado era do grupo X") ficaria quebrada.

alter table guest_groups add column deleted_at timestamptz;

comment on column guest_groups.deleted_at is
  'Soft delete — preserva a referência histórica de guests.group_id quando o grupo é excluído com convidados associados (CLAUDE.md, seção 17.3). Consistente com guests/gifts (seção 11).';
