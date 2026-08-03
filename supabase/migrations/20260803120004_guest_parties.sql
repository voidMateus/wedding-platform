-- Acompanhantes (CLAUDE.md, seção 12.1) — conceito interno, nunca exposto na
-- UI como "família". guest_parties é uma linha puramente estrutural: todo
-- guest que compartilha o mesmo party_id é "acompanhante" de todos os
-- outros do mesmo party_id — associação simétrica por natureza da
-- modelagem (não é hub/spoke), sem presumir parentesco.

create table guest_parties (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table guest_parties is
  'Agrupamento simétrico de convidados que costumam ser convidados juntos (casal, pais e filhos, mesma residência...). Chamado sempre de "Acompanhantes" na UI — nunca "família". Sem name/tipo: guests.party_id é o único vínculo.';

create index guest_parties_wedding_id_idx on guest_parties (wedding_id);

create trigger guest_parties_set_updated_at
  before update on guest_parties
  for each row
  execute function set_updated_at();

alter table guest_parties enable row level security;

create policy guest_parties_select_wedding_members
  on guest_parties for select
  using (is_wedding_member(wedding_id));

create policy guest_parties_insert_wedding_members
  on guest_parties for insert
  with check (is_wedding_member(wedding_id));

create policy guest_parties_update_wedding_members
  on guest_parties for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy guest_parties_delete_wedding_members
  on guest_parties for delete
  using (is_wedding_member(wedding_id));
