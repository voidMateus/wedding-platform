export interface AdminSearchResult {
  type: 'guest' | 'invite' | 'group'
  id: string
  label: string
  sublabel: string | null
  href: string
}

/** Busca global do admin (convidados/convites/grupos) — GlobalSearch.vue. */
export function useAdminSearch() {
  async function search(query: string): Promise<AdminSearchResult[]> {
    const response = await $fetch<{ data: AdminSearchResult[] }>('/api/admin/search', {
      query: { q: query },
    })
    return response.data
  }

  return { search }
}
