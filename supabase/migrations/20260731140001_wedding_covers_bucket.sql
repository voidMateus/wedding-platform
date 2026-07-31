-- Bucket de Storage para a foto de capa do site (Fase Visual) — primeira
-- vez que o projeto usa Supabase Storage de verdade. Segue o padrão já
-- documentado em docs/ARCHITECTURE.md, seção 4.5 (bucket particionado por
-- wedding_id no path do objeto, leitura pública, escrita restrita a
-- membros autenticados do respectivo wedding_id).
--
-- Caminho do objeto: wedding-covers/{wedding_id}/cover.{ext} — o primeiro
-- segmento do path é sempre o wedding_id, checado via is_wedding_member()
-- (mesma função já usada em todas as outras policies do projeto).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wedding-covers',
  'wedding-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy wedding_covers_select_public
  on storage.objects for select
  using (bucket_id = 'wedding-covers');

create policy wedding_covers_insert_wedding_members
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-covers'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_covers_update_wedding_members
  on storage.objects for update
  using (
    bucket_id = 'wedding-covers'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );

create policy wedding_covers_delete_wedding_members
  on storage.objects for delete
  using (
    bucket_id = 'wedding-covers'
    and is_wedding_member((storage.foldername(name))[1]::uuid)
  );
