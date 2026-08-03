import type { PhotoWithUrl } from '~/types/photo'

interface PhotoListResponse {
  data: PhotoWithUrl[]
}

/**
 * Galeria pública (seção Galeria da home, Fase Editorial). Sem autenticação
 * — mesma tabela do painel administrativo, exposta em somente leitura.
 * Resolvido pelo slug da rota atual (`/{slug}`).
 */
export function usePublicPhotos() {
  function getPublicPhotos() {
    const slug = useWeddingSlug()
    return useFetch<PhotoListResponse>(`/api/public/${slug}/photos`, { key: `public-photos-${slug}` })
  }

  return { getPublicPhotos }
}
