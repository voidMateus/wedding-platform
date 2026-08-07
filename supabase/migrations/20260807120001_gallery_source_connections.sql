-- Conexão do casal com a fonte externa que espelha a galeria de fotos
-- (Fase Galeria via Google Drive, CLAUDE.md roadmap). A galeria deixa de
-- guardar bytes no nosso Storage: `photos` passa a referenciar arquivos de
-- uma pasta que o casal já possui, nunca copiados (redução de custo de
-- storage/banda conforme o número de casamentos cresce — CLAUDE.md seção 33).
--
-- Nomes genéricos de propósito (`provider`, `gallery_source_connections`,
-- `photos.source_*` na migration seguinte): Google Photos/iCloud entram no
-- futuro só adicionando um driver e um valor de `provider`, sem reescrita.
--
-- Segurança: os tokens de OAuth são gravados SEMPRE cifrados (AES-256-GCM,
-- server/utils/token-cipher.ts) — nunca em texto plano. Difere do `code_hash`
-- do convidado (SHA-256, mão única) por um motivo concreto: um refresh token
-- precisa ser DESCIFRADO para chamar o Google, então exige cifra reversível,
-- não hash. A proteção é "nunca em claro + chave só no ambiente do servidor,
-- nunca no banco" (CLAUDE.md, seções 11/28). Nenhuma policy pública nesta
-- tabela: ela tem segredo, e a galeria pública lê só de `photos`.

create table gallery_source_connections (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null unique references weddings (id) on delete cascade,
  provider text not null check (provider in ('google_drive')),
  mode text not null check (mode in ('oauth', 'public_link')),
  folder_id text not null,
  folder_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  token_scope text,
  status text not null default 'active' check (status in ('active', 'error', 'reauth_required')),
  last_synced_at timestamptz,
  last_sync_error text,
  last_sync_photo_count integer,
  created_by uuid references wedding_members (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Modo link público nunca guarda token (acesso é só a API key do projeto);
  -- modo OAuth sempre tem refresh token (necessário pro sync em background).
  constraint gallery_source_connections_public_link_no_tokens check (
    mode <> 'public_link'
    or (access_token_encrypted is null and refresh_token_encrypted is null)
  ),
  constraint gallery_source_connections_oauth_has_refresh check (
    mode <> 'oauth' or refresh_token_encrypted is not null
  )
);

comment on table gallery_source_connections is
  'Conexão de um casamento com a fonte externa da galeria (Google Drive nesta fase). Uma por wedding_id. Tokens OAuth sempre cifrados (AES-256-GCM) — CLAUDE.md, Fase Galeria via Google Drive.';
comment on column gallery_source_connections.provider is
  'Fonte externa. Só ''google_drive'' hoje; ponto de extensão pra google_photos/icloud sem migration estrutural.';
comment on column gallery_source_connections.mode is
  'oauth = conta Google do casal (drive.readonly, pasta privada); public_link = URL de pasta compartilhada como "qualquer pessoa com o link", listada via API key do projeto (cota compartilhada entre todos os casamentos).';
comment on column gallery_source_connections.refresh_token_encrypted is
  'Refresh token OAuth cifrado (AES-256-GCM). Reversível de propósito — precisa ser usado pra chamar o Google; a chave vive só no ambiente do servidor (DRIVE_TOKEN_ENCRYPTION_KEY), nunca no banco.';
comment on column gallery_source_connections.status is
  'active | error (falha transitória de sync) | reauth_required (token revogado/expirado — casal precisa reconectar). Nenhum estado apaga as fotos já espelhadas.';

-- wedding_id já ganha índice pelo UNIQUE; created_by é FK e recebe índice
-- explícito por convenção (CLAUDE.md, seção 13).
create index gallery_source_connections_created_by_idx on gallery_source_connections (created_by);

create trigger gallery_source_connections_set_updated_at
  before update on gallery_source_connections
  for each row
  execute function set_updated_at();

alter table gallery_source_connections enable row level security;

-- Só membros do casamento — sem policy pública (a tabela guarda tokens). Os
-- endpoints nunca fazem select('*') aqui: retornam lista explícita de colunas
-- sem as de token (mesma disciplina de gift_payments, CLAUDE.md seção 28).
create policy gallery_source_connections_select_wedding_members
  on gallery_source_connections for select
  using (is_wedding_member(wedding_id));

create policy gallery_source_connections_insert_wedding_members
  on gallery_source_connections for insert
  with check (is_wedding_member(wedding_id));

create policy gallery_source_connections_update_wedding_members
  on gallery_source_connections for update
  using (is_wedding_member(wedding_id))
  with check (is_wedding_member(wedding_id));

create policy gallery_source_connections_delete_wedding_members
  on gallery_source_connections for delete
  using (is_wedding_member(wedding_id));
