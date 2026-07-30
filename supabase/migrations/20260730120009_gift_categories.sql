-- Categorias da lista de presentes — opcionais, só para organização visual
-- (CLAUDE.md, seções 11-12, 18).

create table gift_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table gift_categories is
  'Categorias da lista de presentes, opcionais, usadas só para organização visual (CLAUDE.md, seção 11.1).';

create index gift_categories_wedding_id_idx on gift_categories (wedding_id, display_order);

create trigger gift_categories_set_updated_at
  before update on gift_categories
  for each row
  execute function set_updated_at();

alter table gift_categories enable row level security;

create policy gift_categories_select_wedding_members
  on gift_categories for select
  using (is_wedding_member(wedding_id));

create policy gift_categories_insert_wedding_members
  on gift_categories for insert
  with check (is_wedding_member(wedding_id));

create policy gift_categories_update_wedding_members
  on gift_categories for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy gift_categories_delete_wedding_members
  on gift_categories for delete
  using (is_wedding_member(wedding_id));
