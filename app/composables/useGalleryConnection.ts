import type { GallerySourceConnection, GallerySyncResult } from '~/types/gallery'

interface ConnectionResponse {
  connection: GallerySourceConnection | null
}
interface ConnectResponse {
  connection: GallerySourceConnection | null
  sync: GallerySyncResult
}

/**
 * Conexão da galeria com a fonte externa (Fase Galeria via Google Drive —
 * CLAUDE.md). Toda chamada de rede do client passa por aqui (CLAUDE.md, 5.1).
 */
export function useGalleryConnection() {
  function getConnection() {
    return useFetch<ConnectionResponse>('/api/wedding/gallery/connection', {
      key: 'gallery-connection',
    })
  }

  async function connectGoogle(input: {
    code: string
    folderId: string
    folderName?: string
  }): Promise<ConnectResponse> {
    return $fetch<ConnectResponse>('/api/wedding/gallery/google/connect', {
      method: 'POST',
      body: input,
    })
  }

  async function connectPublicLink(folderUrl: string): Promise<ConnectResponse> {
    return $fetch<ConnectResponse>('/api/wedding/gallery/public-link', {
      method: 'POST',
      body: { folderUrl },
    })
  }

  async function syncNow(): Promise<{ sync: GallerySyncResult }> {
    return $fetch<{ sync: GallerySyncResult }>('/api/wedding/gallery/sync', { method: 'POST' })
  }

  async function disconnect(): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>('/api/wedding/gallery/connection', { method: 'DELETE' })
  }

  // Quantas fotos aparecem na prévia da Galeria na home (theme_config.galleryPreviewCount).
  async function updatePreview(count: number): Promise<void> {
    await $fetch('/api/wedding/gallery/preview', { method: 'PATCH', body: { count } })
  }

  return { getConnection, connectGoogle, connectPublicLink, syncNow, disconnect, updatePreview }
}
