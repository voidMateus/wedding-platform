-- Renomeia guest_groups -> invites. É a mesma linha física (mesmo id, mesmos
-- dados), só o nome/semântica principal muda: de "agrupamento de convidados"
-- para "quem recebeu o mesmo convite" (CLAUDE.md, seção 12.1 — Convite passa
-- a ser a unidade real de RSVP, com Convidado Responsável). Renomear (em vez
-- de criar uma tabela nova) preserva todas as FKs existentes (guests,
-- rsvp_responses, guest_access_tokens, gift_reservations, gift_contributions)
-- sem precisar recriá-las — o Postgres segue por OID, não por nome.

alter table guest_groups rename to invites;

alter index guest_groups_wedding_id_idx rename to invites_wedding_id_idx;
alter trigger guest_groups_set_updated_at on invites rename to invites_set_updated_at;

drop policy guest_groups_select_wedding_members on invites;
drop policy guest_groups_insert_wedding_members on invites;
drop policy guest_groups_update_wedding_members on invites;
drop policy guest_groups_delete_wedding_members on invites;

create policy invites_select_wedding_members
  on invites for select
  using (is_wedding_member(wedding_id));

create policy invites_insert_wedding_members
  on invites for insert
  with check (is_wedding_member(wedding_id));

create policy invites_update_wedding_members
  on invites for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy invites_delete_wedding_members
  on invites for delete
  using (is_wedding_member(wedding_id));

comment on table invites is
  'Convite — quem recebeu o mesmo convite físico/digital. Unidade real de RSVP, com um Convidado Responsável (responsible_guest_id). Cada guest pertence a no máximo um invite (guests.invite_id).';
