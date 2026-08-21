// Conexão da galeria com a fonte externa (Fase Galeria via Google Drive —
// CLAUDE.md). Shape seguro exposto ao client — nunca inclui os tokens cifrados.

export type GalleryConnectionMode = 'oauth' | 'public_link'
export type GalleryConnectionStatus = 'ativo' | 'erro' | 'reautenticacao_necessaria'

export interface GallerySourceConnection {
  id: string
  provider: string
  mode: GalleryConnectionMode
  folder_id: string
  folder_name: string | null
  status: GalleryConnectionStatus
  last_synced_at: string | null
  last_sync_error: string | null
  last_sync_photo_count: number | null
  created_at: string
  updated_at: string
}

export interface GallerySyncResult {
  ok: boolean
  photoCount?: number
  reason?: string
  reauthRequired?: boolean
}
