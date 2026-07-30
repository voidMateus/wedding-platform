import type { GiftCategoryInput } from '#shared/schemas/gift-categories'
import type { GiftCategory } from '~/types/gift-category'

interface GiftCategoryListResponse {
  data: GiftCategory[]
}

/**
 * CRUD de categorias de presentes (CLAUDE.md, seção 19.2). Toda chamada de
 * rede do client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useGiftCategories() {
  function listGiftCategories() {
    return useFetch<GiftCategoryListResponse>('/api/gift-categories', { key: 'gift-categories' })
  }

  async function createGiftCategory(input: GiftCategoryInput): Promise<GiftCategory> {
    return $fetch<GiftCategory>('/api/gift-categories', { method: 'POST', body: input })
  }

  async function updateGiftCategory(
    id: string,
    input: GiftCategoryInput,
  ): Promise<GiftCategory> {
    return $fetch<GiftCategory>(`/api/gift-categories/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGiftCategory(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/gift-categories/${id}`, { method: 'DELETE' })
  }

  return { listGiftCategories, createGiftCategory, updateGiftCategory, deleteGiftCategory }
}
