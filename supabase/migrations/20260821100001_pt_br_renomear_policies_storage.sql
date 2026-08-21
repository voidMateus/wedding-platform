-- Remodelagem para português (Passo 1, docs/PLANO-SAAS.md) — item pendente
-- registrado desde a parte 4 (20260821090004): RLS policies de
-- storage.objects (buckets wedding-covers/wedding-photos/wedding-event-segments)
-- não foram cobertas naquela migration, que só tratou tabelas do schema
-- public. Funcionalmente já corretas (a lógica interna já chama
-- is_membro_casamento) — só o nome do objeto ainda dizia inglês.
--
-- Usa DROP + CREATE em vez de ALTER POLICY ... RENAME TO: storage.objects é
-- de propriedade de supabase_storage_admin, e o role de migration (postgres)
-- não tem privilégio pra ALTER POLICY (RENAME) nessa tabela ("must be owner
-- of table objects"), mesmo tendo privilégio pra CREATE/DROP POLICY nela
-- (concedido à parte pela plataforma Supabase). Definições idênticas às
-- originais (20260731140001/20260731160001/20260804090002/20260807120003),
-- só o nome muda.
--
-- Nome do bucket em si não é renomeado (infraestrutura de storage, não nome
-- de tabela do domínio — mesma decisão já aplicada às pastas de rota de
-- server/api/**). Convenção mantida: <bucket>_<operação>_<regra>.

drop policy wedding_covers_select_public on storage.objects;
create policy wedding_covers_select_publico
  on storage.objects for select
  using (bucket_id = 'wedding-covers');

drop policy wedding_covers_insert_wedding_members on storage.objects;
create policy wedding_covers_insert_membro
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-covers'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

drop policy wedding_covers_update_wedding_members on storage.objects;
create policy wedding_covers_update_membro
  on storage.objects for update
  using (
    bucket_id = 'wedding-covers'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

drop policy wedding_covers_delete_wedding_members on storage.objects;
create policy wedding_covers_delete_membro
  on storage.objects for delete
  using (
    bucket_id = 'wedding-covers'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

-- wedding-photos: só a policy de leitura sobrevive (escrita removida na
-- migration 20260807120003 -- galeria migrou para espelhamento via Google
-- Drive, ver docs/ARCHITECTURE.md §4.5).
drop policy wedding_photos_select_public on storage.objects;
create policy wedding_photos_select_publico
  on storage.objects for select
  using (bucket_id = 'wedding-photos');

drop policy wedding_event_segments_select_public on storage.objects;
create policy wedding_event_segments_select_publico
  on storage.objects for select
  using (bucket_id = 'wedding-event-segments');

drop policy wedding_event_segments_insert_wedding_members on storage.objects;
create policy wedding_event_segments_insert_membro
  on storage.objects for insert
  with check (
    bucket_id = 'wedding-event-segments'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

drop policy wedding_event_segments_update_wedding_members on storage.objects;
create policy wedding_event_segments_update_membro
  on storage.objects for update
  using (
    bucket_id = 'wedding-event-segments'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );

drop policy wedding_event_segments_delete_wedding_members on storage.objects;
create policy wedding_event_segments_delete_membro
  on storage.objects for delete
  using (
    bucket_id = 'wedding-event-segments'
    and is_membro_casamento((storage.foldername(name))[1]::uuid)
  );
