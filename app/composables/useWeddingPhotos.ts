import type { PhotoMetadataInput } from '#shared/schemas/photos'
import type { PhotoWithUrl } from '~/types/photo'

interface PhotoListResponse {
  data: PhotoWithUrl[]
}

/**
 * Galeria de fotos (Fase Galeria via Google Drive — CLAUDE.md). As fotos são
 * espelhadas de uma fonte externa (Google Drive), não mais enviadas manualmente
 * — o upload/exclusão por foto foi removido. Só resta a listagem e a edição do
 * metadado nosso (legenda/ordem/ponto de foco), preservado entre syncs.
 */
export function useWeddingPhotos() {
  function listPhotos() {
    return useFetch<PhotoListResponse>('/api/photos', { key: 'wedding-photos' })
  }

  async function updatePhoto(id: string, input: PhotoMetadataInput): Promise<PhotoWithUrl> {
    return $fetch<PhotoWithUrl>(`/api/photos/${id}`, { method: 'PATCH', body: input })
  }

  // Reordenação por drag-and-drop — grava ordem_exibicao = posição na lista.
  async function reorderPhotos(ids: string[]): Promise<{ ok: boolean }> {
    return $fetch<{ ok: boolean }>('/api/photos/reorder', { method: 'PATCH', body: { ids } })
  }

  return { listPhotos, updatePhoto, reorderPhotos }
}
