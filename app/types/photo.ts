import type { Database } from './database.types'

export type Photo = Database['public']['Tables']['photos']['Row']

/**
 * Shape retornado pela API — a Row do banco + a URL da imagem servida direto do
 * Google (thumbnail do Drive), resolvida por server/utils/photo-url.ts a partir
 * de source_thumbnail_url/source_file_id (Fase Galeria via Google Drive).
 */
export interface PhotoWithUrl extends Photo {
  url: string
}
