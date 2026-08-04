-- Bucket de Storage para a foto de local dos itens do cronograma — mesmo
-- padrão já usado para capa/galeria (20260731140001_wedding_covers_bucket.sql,
-- 20260731160001_wedding_photos_bucket.sql): leitura pública, escrita
-- restrita a membros autenticados do respectivo wedding_id.
--
-- Um único arquivo fixo por item do cronograma (upsert, como a capa), path
-- wedding-event-segments/{wedding_id}/{event_segment_id}.{ext} — diferente
-- da galeria (múltiplas fotos por casamento, um arquivo por foto).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-event-segments',
  'wedding-event-segments',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy wedding_event_segments_select_public
  on storage.objects for select
  using (bucket_id = 'wedding-event-segments');

create policy wedding_event_segments_insert_wedding_members
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-event-segments'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_event_segments_update_wedding_members
  on storage.objects for update
  using (
    bucket_id = 'wedding-event-segments'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_event_segments_delete_wedding_members
  on storage.objects for delete
  using (
    bucket_id = 'wedding-event-segments'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );
