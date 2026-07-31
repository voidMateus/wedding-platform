import type { PhotoWithUrl } from '~/types/photo'

interface PhotoListResponse {
  data: PhotoWithUrl[]
}

/**
 * Galeria pública (seção Galeria da home, Fase Editorial). Sem autenticação
 * — mesma tabela do painel administrativo, exposta em somente leitura.
 */
export function usePublicPhotos() {
  function getPublicPhotos() {
    return useFetch<PhotoListResponse>('/api/public/photos', { key: 'public-photos' })
  }

  return { getPublicPhotos }
}
