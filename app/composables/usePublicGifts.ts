import type { PublicGift } from '~/types/gift-public'

interface PublicGiftListResponse {
  data: PublicGift[]
}

/**
 * Vitrine pública de presentes (CLAUDE.md, seção 18.2). Sem autenticação —
 * `code`, quando informado, personaliza a resposta com o que o próprio
 * convidado já reservou/contribuiu. Resolvido pelo slug da rota atual
 * (`/{slug}`) — mutações (reserve/contribute/cancel) resolvem o casamento
 * pelo próprio `code` (token), não precisam do slug.
 */
export function usePublicGifts(code?: string) {
  function getPublicGifts() {
    const slug = useWeddingSlug()
    return useFetch<PublicGiftListResponse>(`/api/public/${slug}/gifts`, {
      key: `public-gifts-${slug}-${code ?? 'anon'}`,
      query: code ? { code } : undefined,
    })
  }

  async function reserveGift(giftId: string): Promise<unknown> {
    if (!code) throw new Error('Código de acesso não informado.')
    return $fetch(`/api/public/gifts/${giftId}/reserve`, { method: 'POST', body: { code } })
  }

  async function contributeToGift(giftId: string, amountCents: number): Promise<unknown> {
    if (!code) throw new Error('Código de acesso não informado.')
    return $fetch(`/api/public/gifts/${giftId}/contribute`, {
      method: 'POST',
      body: { code, amountCents },
    })
  }

  async function cancelGift(giftId: string): Promise<unknown> {
    if (!code) throw new Error('Código de acesso não informado.')
    return $fetch(`/api/public/gifts/${giftId}/cancel`, { method: 'POST', body: { code } })
  }

  return { getPublicGifts, reserveGift, contributeToGift, cancelGift }
}
