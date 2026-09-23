import type { GiftInput } from '#shared/schemas/gifts'
import type { Gift } from '~/types/gift'

export interface GiftPaymentsSummary {
  confirmedTotalCents: number
  failedCount: number
}

export interface GiftActivityEntry {
  id: string
  type: 'reservation' | 'contribution'
  giftId: string
  giftTitle: string
  name: string
  phone: string | null
  amountCents: number | null
  quotaCount: number | null
  message: string | null
  isPaid: boolean
  at: string
}

interface GiftListResponse {
  data: Gift[]
  paymentsSummary: GiftPaymentsSummary
  /** Os lançamentos mais recentes, para o painel de atividade — sempre um recorte. */
  activity: GiftActivityEntry[]
  /**
   * Quem presenteou cada presente, sobre TODOS os lançamentos. É daqui que
   * saem o status e a coluna "Presenteado por" — de `activity` eles vinham
   * recortados nos 20 mais recentes, e um presente com contribuição antiga
   * aparecia como disponível (achado de 2026-09-13).
   */
  giversByGift: Record<string, string[]>
  /** Quanto já entrou por presente, em centavos. */
  raisedByGift: Record<string, number>
}

/** Uma linha de "quanto este presente rendeu". */
export interface GiftReceivedByGift {
  /** O id do próprio presente. */
  id: string
  title: string
  cents: number
  entries: number
}

/** Uma linha de "quanto esta pessoa deu" — é a lista de quem agradecer. */
export interface GiftReceivedByGiver {
  /** O nome — a agregação é por ele, e não existe cadastro de presenteador. */
  id: string
  name: string
  cents: number
  entries: number
  lastAt: string
}

/**
 * Pagamento que o convidado fez e a plataforma não conseguiu registrar.
 *
 * Era um contador solto no topo da lista, sem destino: o casal lia "2" e não
 * tinha para onde ir. Aqui vem a linha inteira, que é o que permite resolver.
 */
export interface GiftFailedPayment {
  id: string
  giftId: string
  giftTitle: string
  name: string
  phone: string | null
  cents: number
  reason: string | null
  at: string
}

export interface GiftReceivedResponse {
  totalCents: number
  byGift: GiftReceivedByGift[]
  byGiver: GiftReceivedByGiver[]
  failed: GiftFailedPayment[]
}

/**
 * CRUD de presentes (CLAUDE.md, seção 18/19.2). Toda chamada de rede do
 * client passa por aqui (CLAUDE.md, seção 5.1).
 */
export function useGifts() {
  function listGifts() {
    return useFetch<GiftListResponse>('/api/gifts', { key: useWeddingScopedKey('gifts') })
  }

  /** O dinheiro que entrou, nos dois recortes — a tela de Recebidos. */
  function listReceived() {
    return useFetch<GiftReceivedResponse>('/api/gifts/received', {
      key: useWeddingScopedKey('gifts-received'),
    })
  }

  async function createGift(input: GiftInput): Promise<Gift> {
    return $fetch<Gift>('/api/gifts', { method: 'POST', body: input })
  }

  async function updateGift(id: string, input: GiftInput): Promise<Gift> {
    return $fetch<Gift>(`/api/gifts/${id}`, { method: 'PATCH', body: input })
  }

  async function deleteGift(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/gifts/${id}`, { method: 'DELETE' })
  }

  return { listGifts, listReceived, createGift, updateGift, deleteGift }
}
