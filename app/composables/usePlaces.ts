import type { PlaceDetails, PlaceSuggestion } from '~/types/place'

interface PlacesAutocompleteResponse {
  data: PlaceSuggestion[]
  provider: string
}

interface PlacesDetailsResponse {
  data: PlaceDetails
  provider: string
}

/** Abaixo disso o provedor devolve ruído e a chamada é cobrada igual — mesmo corte do server. */
export const MIN_PLACES_QUERY_LENGTH = 3

/**
 * Busca de lugares do cadastro de local (CLAUDE.md, seção 12). Toda chamada
 * de rede do client passa por um composable (CLAUDE.md, seção 4.1) — aqui
 * isso também esconde do componente a existência de um `sessionToken`.
 *
 * O token de sessão agrupa, no provedor, as chamadas de digitação e a
 * consulta de detalhes que a encerra: uma escolha inteira é cobrada como uma
 * sessão, não como N requisições avulsas. Ele é criado por instância do
 * composable e renovado assim que uma escolha é concluída — reaproveitar o
 * mesmo token depois disso reabriria uma sessão já fechada e voltaria a
 * cobrar por chamada.
 */
export function usePlaces() {
  let sessionToken = crypto.randomUUID()

  async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
    const trimmed = query.trim()
    if (trimmed.length < MIN_PLACES_QUERY_LENGTH) return []

    const response = await $fetch<PlacesAutocompleteResponse>('/api/places/autocomplete', {
      query: { q: trimmed, sessionToken },
    })
    return response.data
  }

  async function getPlaceDetails(placeId: string): Promise<{
    place: PlaceDetails
    provider: string
  }> {
    const response = await $fetch<PlacesDetailsResponse>(
      `/api/places/${encodeURIComponent(placeId)}`,
      { query: { sessionToken } },
    )
    // A sessão de cobrança termina na consulta de detalhes: a próxima busca
    // (um "Alterar local", por exemplo) precisa começar uma nova.
    sessionToken = crypto.randomUUID()
    return { place: response.data, provider: response.provider }
  }

  return { searchPlaces, getPlaceDetails }
}
