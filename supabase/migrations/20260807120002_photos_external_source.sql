-- `photos` deixa de ser um objeto no nosso Storage e passa a referenciar um
-- arquivo de uma fonte externa espelhada (gallery_source_connections) — Fase
-- Galeria via Google Drive (CLAUDE.md roadmap). A imagem é servida direto do
-- Google (thumbnail), nunca copiada pra cá.

alter table photos
  add column source_connection_id uuid references gallery_source_connections (id) on delete cascade,
  add column source_file_id text,
  add column source_thumbnail_url text,
  add column source_mime_type text;

-- storage_path vira legado (soft-deprecation, mesmo padrão de colunas mortas
-- já documentado — CLAUDE.md, Fase Presentes 2.0). Deixa de ser escrito; as
-- linhas legadas baseadas em Storage são removidas no 1º sync (espelhamento).
alter table photos alter column storage_path drop not null;

comment on column photos.source_connection_id is
  'Conexão (gallery_source_connections) que espelha esta foto. on delete cascade: desconectar a fonte remove as fotos espelhadas.';
comment on column photos.source_file_id is
  'Id do arquivo na fonte externa (ex.: fileId do Google Drive) — chave estável do espelhamento. Reupload do mesmo arquivo na origem gera um id novo e perde legenda/ordem/foco salvos (limitação conhecida, CLAUDE.md).';
comment on column photos.source_thumbnail_url is
  'URL de miniatura servida direto da fonte (thumbnailLink do Drive), renovada a cada sync — usada no modo OAuth (pasta privada), onde o endpoint estável drive.google.com/thumbnail não renderiza pra visitante anônimo. null no modo público (o client monta a URL estável a partir de source_file_id).';
comment on column photos.storage_path is
  'LEGADO (soft-deprecated) — bucket wedding-photos, upload manual removido na Fase Galeria via Google Drive. Nullable; não é mais escrito.';

create index photos_source_connection_id_idx on photos (source_connection_id);

-- Chave do espelhamento: um arquivo da fonte aparece uma única vez por
-- conexão. NULLs são distintos no Postgres, então as linhas legadas
-- (source_file_id null) não colidem entre si. Não-parcial de propósito —
-- permite o upsert onConflict do gallery-sync.ts.
create unique index photos_source_file_unique_idx
  on photos (source_connection_id, source_file_id);
