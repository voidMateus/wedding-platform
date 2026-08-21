import type { Database } from './database.types'

export type Photo = Database['public']['Tables']['fotos']['Row']

/**
 * Shape retornado pela API — a Row do banco + a URL da imagem servida direto do
 * Google (thumbnail do Drive), resolvida por server/utils/photo-url.ts a partir
 * de url_miniatura_origem/id_arquivo_origem (Fase Galeria via Google Drive).
 */
export interface PhotoWithUrl extends Photo {
  url: string
}
