-- Itens da galeria de fotos do casal (Fase 3) — reservada desde a v1 para
-- evitar migration disruptiva depois (CLAUDE.md, seção 11.1).

create table photos (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  storage_path text not null,
  caption text,
  display_order integer not null default 0,
  uploaded_by uuid references wedding_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table photos is
  'Galeria de fotos do casal (Fase 3, CLAUDE.md seção 32). storage_path referencia um objeto no bucket do Supabase Storage particionado por wedding_id (docs/ARCHITECTURE.md, seção 4.5).';

create index photos_wedding_id_idx on photos (wedding_id, display_order);

create trigger photos_set_updated_at
  before update on photos
  for each row
  execute function set_updated_at();

alter table photos enable row level security;

create policy photos_select_wedding_members
  on photos for select
  using (is_wedding_member(wedding_id));

create policy photos_insert_wedding_members
  on photos for insert
  with check (is_wedding_member(wedding_id));

create policy photos_update_wedding_members
  on photos for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy photos_delete_wedding_members
  on photos for delete
  using (is_wedding_member(wedding_id));
