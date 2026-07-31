import type { Database } from './database.types'

export type Photo = Database['public']['Tables']['photos']['Row']

/** Shape retornado pela API — a Row do banco + a URL pública resolvida a partir de storage_path. */
export interface PhotoWithUrl extends Photo {
  url: string
}
