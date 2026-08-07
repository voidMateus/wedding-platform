-- Fim do upload manual da galeria (Fase Galeria via Google Drive). Passo 1 de
-- 2, não-destrutivo (docs/ARCHITECTURE.md, seção 4.2): remove só as policies
-- de ESCRITA do bucket wedding-photos — nenhum upload/alteração/remoção novo é
-- possível a partir de agora. A policy de leitura fica por ora (linhas legadas
-- de `photos` ainda podem apontar pra objetos antigos até o 1º sync espelhar
-- o Drive e removê-las).
--
-- Passo 2 (migration de limpeza posterior, depois de confirmar o prod
-- migrado): esvaziar e dar DROP no bucket, já que ele deixa de existir no
-- produto — CLAUDE.md, decisão "B" desta fase.

drop policy if exists wedding_photos_insert_wedding_members on storage.objects;
drop policy if exists wedding_photos_update_wedding_members on storage.objects;
drop policy if exists wedding_photos_delete_wedding_members on storage.objects;
