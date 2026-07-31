import type { PhotoMetadataInput } from '#shared/schemas/photos'
import type { PhotoWithUrl } from '~/types/photo'

interface PhotoListResponse {
  data: PhotoWithUrl[]
}

/**
 * CRUD da galeria de fotos (Fase Editorial — CLAUDE.md, seção 19.2/28). Toda
 * chamada de rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useWeddingPhotos() {
  function listPhotos() {
    return useFetch<PhotoListResponse>('/api/photos', { key: 'wedding-photos' })
  }

  async function uploadPhoto(file: File, caption?: string): Promise<PhotoWithUrl> {
    const formData = new FormData()
    formData.append('file', file)
    if (caption) {
      formData.append('caption', caption)
    }
    return $fetch<PhotoWithUrl>('/api/photos', { method: 'POST', body: formData })
  }

  async function updatePhoto(id: string, input: PhotoMetadataInput): Promise<PhotoWithUrl> {
    return $fetch<PhotoWithUrl>(`/api/photos/${id}`, { method: 'PATCH', body: input })
  }

  async function deletePhoto(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/photos/${id}`, { method: 'DELETE' })
  }

  return { listPhotos, uploadPhoto, updatePhoto, deletePhoto }
}
