-- Etapas do evento (cerimônia, recepção, festa), cada uma com local e
-- horário próprios (CLAUDE.md, seções 11-12).

create table event_segments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references weddings (id) on delete cascade,
  title text not null,
  venue_name text,
  venue_address text,
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table event_segments is
  'Etapas do evento (cerimônia, recepção, festa...), cada uma podendo ter local e horário próprios.';

create index event_segments_wedding_id_idx on event_segments (wedding_id, display_order);

create trigger event_segments_set_updated_at
  before update on event_segments
  for each row
  execute function set_updated_at();

alter table event_segments enable row level security;

create policy event_segments_select_wedding_members
  on event_segments for select
  using (is_wedding_member(wedding_id));

create policy event_segments_insert_wedding_members
  on event_segments for insert
  with check (is_wedding_member(wedding_id));

create policy event_segments_update_wedding_members
  on event_segments for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy event_segments_delete_wedding_members
  on event_segments for delete
  using (is_wedding_member(wedding_id));
