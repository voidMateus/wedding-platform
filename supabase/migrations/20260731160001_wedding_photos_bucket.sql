-- Bucket de Storage para a galeria de fotos (Fase Editorial) — mesmo padrão
-- já usado para a foto de capa (20260731140001_wedding_covers_bucket.sql):
-- bucket particionado por wedding_id no path do objeto, leitura pública,
-- escrita restrita a membros autenticados do respectivo wedding_id.
--
-- Diferente da capa (um único arquivo fixo "cover.{ext}"), a galeria tem
-- múltiplas fotos por casamento — o path é wedding-photos/{wedding_id}/{uuid}.{ext},
-- um arquivo por foto, nunca reaproveitando o nome original enviado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-photos',
  'wedding-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy wedding_photos_select_public
  on storage.objects for select
  using (bucket_id = 'wedding-photos');

create policy wedding_photos_insert_wedding_members
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-photos'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_photos_update_wedding_members
  on storage.objects for update
  using (
    bucket_id = 'wedding-photos'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_photos_delete_wedding_members
  on storage.objects for delete
  using (
    bucket_id = 'wedding-photos'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );
