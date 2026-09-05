import type { GuestPartyReorderInput, GuestPartySyncInput } from '#shared/schemas/guests'
import type { FaixaEtariaFiltro } from '#shared/utils/faixa-etaria'
import type { Guest } from '~/types/guest'

export interface GuestListResponse {
  data: Guest[]
  meta: { page: number; pageSize: number; total: number }
  /** Agregado do recorte inteiro, não só da página — ver /api/guests. */
  summary: { confirmed: number }
}

interface GuestListParams {
  page?: number
  pageSize?: number
  search?: string
  groupId?: string
  unassigned?: boolean
  withoutParty?: boolean
  /** Recorte por faixa etária calculada na data do evento — resolvido no banco. */
  ageGroup?: FaixaEtariaFiltro
}

export interface GuestDetail extends Guest {
  partyMembers: Guest[]
  invite: { id: string; nome: string } | null
}

interface GuestPartySyncResult {
  primaryGuestId: string
  partyId: string | null
  inviteId: string | null
}

/**
 * CRUD de guests (CLAUDE.md, seção 15). Toda chamada de rede do client
 * passa por aqui, nunca direto em página/componente (CLAUDE.md, seção 5.1).
 */
export function useGuests() {
  function listGuests(params?: MaybeRefOrGetter<GuestListParams | undefined>) {
    return useFetch<GuestListResponse>('/api/guests', { query: params, key: 'guests' })
  }

  function getGuest(id: MaybeRefOrGetter<string>) {
    return useFetch<GuestDetail>(() => `/api/guests/${toValue(id)}`, {
      key: () => `guest-${toValue(id)}`,
    })
  }

  /** Versão imperativa de listGuests, pra busca/autocomplete que dispara sob demanda em vez de reativo. */
  async function fetchGuests(params: GuestListParams): Promise<GuestListResponse> {
    return $fetch<GuestListResponse>('/api/guests', { query: params })
  }

  /** Versão imperativa de getGuest, pra buscar o detalhe de um candidato selecionado num autocomplete. */
  async function fetchGuestDetail(id: string): Promise<GuestDetail> {
    return $fetch<GuestDetail>(`/api/guests/${id}`)
  }

  async function syncGuestParty(input: GuestPartySyncInput): Promise<GuestPartySyncResult> {
    return $fetch<GuestPartySyncResult>('/api/guests/party', { method: 'PUT', body: input })
  }

  async function reorderGuestParty(input: GuestPartyReorderInput) {
    return $fetch('/api/guests/party/reorder', { method: 'PATCH', body: input })
  }

  async function deleteGuest(id: string): Promise<{ id: string }> {
    return $fetch<{ id: string }>(`/api/guests/${id}`, { method: 'DELETE' })
  }

  return {
    listGuests,
    getGuest,
    fetchGuests,
    fetchGuestDetail,
    syncGuestParty,
    reorderGuestParty,
    deleteGuest,
  }
}
