import type {
  PlaceDetails,
  PlaceSuggestion,
  PlacesAutocompleteInput,
  PlacesDetailsInput,
  PlacesProvider,
  PlacesResult,
} from './places-provider'

/**
 * Implementação do contrato de places-provider.ts sobre a Places API (New) do
 * Google. Sem SDK — `$fetch` direto, como google-drive.ts e infinitepay.ts.
 *
 * A chave nunca sai do servidor: o client fala com /api/places/**, nunca com
 * o Google (CLAUDE.md, seção 11 — client nunca carrega credencial de
 * integração). É o mesmo motivo de este arquivo viver em server/utils/.
 */

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete'
const DETAILS_BASE_URL = 'https://places.googleapis.com/v1/places'
const REQUEST_TIMEOUT_MS = 8000

// Público-alvo do produto é brasileiro (CLAUDE.md, seção 1): restringir região
// e idioma melhora muito a ordem das sugestões para nomes como "Igreja Batista
// Central", que existem em dezenas de países.
const LANGUAGE_CODE = 'pt-BR'
const REGION_CODE = 'BR'
const INCLUDED_REGION_CODES = ['br']

// Campos cobrados por SKU na Places API (New) — pedir só o necessário para o
// card de confirmação e para "Ver no mapa" mantém a chamada no tier mais
// barato. Ampliar esta lista tem custo por requisição, não é gratuito.
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'googleMapsUri',
  'addressComponents',
].join(',')

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string
      text?: { text?: string }
      structuredFormat?: {
        mainText?: { text?: string }
        secondaryText?: { text?: string }
      }
    }
  }>
}

interface GoogleAddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

interface GooglePlaceDetailsResponse {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  googleMapsUri?: string
  addressComponents?: GoogleAddressComponent[]
}

function findComponent(
  components: GoogleAddressComponent[] | undefined,
  type: string,
): GoogleAddressComponent | undefined {
  return components?.find((component) => component.types?.includes(type))
}

/**
 * Município e UF a partir dos componentes de endereço. `locality` é o caso
 * comum; `administrative_area_level_2` cobre os endereços rurais e distritos
 * em que o Google não devolve locality — justamente os locais (sítio, chácara)
 * que motivaram o caminho manual desta fase.
 */
function extractCity(components: GoogleAddressComponent[] | undefined): string | null {
  const component =
    findComponent(components, 'locality') ??
    findComponent(components, 'administrative_area_level_2')
  return component?.longText ?? null
}

function extractState(components: GoogleAddressComponent[] | undefined): string | null {
  const component = findComponent(components, 'administrative_area_level_1')
  // shortText é a sigla ("MT"), que é como uma UF é escrita num endereço.
  return component?.shortText ?? component?.longText ?? null
}

export function createGooglePlacesProvider(apiKey: string): PlacesProvider {
  return {
    id: 'google',

    async autocomplete({
      query,
      sessionToken,
    }: PlacesAutocompleteInput): Promise<PlacesResult<PlaceSuggestion[]>> {
      try {
        const response = await $fetch<GoogleAutocompleteResponse>(AUTOCOMPLETE_URL, {
          method: 'POST',
          timeout: REQUEST_TIMEOUT_MS,
          headers: { 'X-Goog-Api-Key': apiKey },
          body: {
            input: query,
            languageCode: LANGUAGE_CODE,
            regionCode: REGION_CODE,
            includedRegionCodes: INCLUDED_REGION_CODES,
            sessionToken,
          },
        })

        const suggestions: PlaceSuggestion[] = []
        for (const suggestion of response.suggestions ?? []) {
          const prediction = suggestion.placePrediction
          const placeId = prediction?.placeId
          if (!placeId) continue

          // structuredFormat é o que permite a sugestão de duas linhas
          // ("Buffet Exemplo" / "Av. Miguel Sutil, 1234 · Cuiabá - MT") —
          // sem ela, dois lugares homônimos ficariam indistinguíveis na
          // lista. `text` é o fallback de linha única.
          const mainText = prediction?.structuredFormat?.mainText?.text ?? prediction?.text?.text
          if (!mainText) continue

          suggestions.push({
            placeId,
            mainText,
            secondaryText: prediction?.structuredFormat?.secondaryText?.text ?? null,
          })
        }

        return { ok: true, data: suggestions }
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof Error ? err.message : 'Falha ao consultar o Google Places.',
        }
      }
    },

    async details({
      placeId,
      sessionToken,
    }: PlacesDetailsInput): Promise<PlacesResult<PlaceDetails | null>> {
      try {
        const response = await $fetch<GooglePlaceDetailsResponse>(
          `${DETAILS_BASE_URL}/${encodeURIComponent(placeId)}`,
          {
            timeout: REQUEST_TIMEOUT_MS,
            headers: {
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': DETAILS_FIELD_MASK,
            },
            query: { languageCode: LANGUAGE_CODE, regionCode: REGION_CODE, sessionToken },
          },
        )

        const latitude = response.location?.latitude
        const longitude = response.location?.longitude
        // Sem coordenadas o resultado não serve para o preview nem para o
        // mapa do site — é preferível tratar como "não encontrado" e deixar o
        // casal cadastrar manualmente a gravar um local sem ponto no mapa.
        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return { ok: true, data: null }
        }

        const name = response.displayName?.text ?? ''
        const formattedAddress = response.formattedAddress ?? ''

        return {
          ok: true,
          data: {
            placeId: response.id ?? placeId,
            name,
            formattedAddress,
            latitude,
            longitude,
            mapsUrl: response.googleMapsUri ?? null,
            city: extractCity(response.addressComponents),
            state: extractState(response.addressComponents),
          },
        }
      } catch (err) {
        // 404 do Google = place_id inexistente/expirado, não instabilidade:
        // o formulário deve pedir uma nova escolha, não exibir "tente de novo".
        if (typeof err === 'object' && err !== null && 'statusCode' in err) {
          const statusCode = (err as { statusCode?: number }).statusCode
          if (statusCode === 404) return { ok: true, data: null }
        }
        return {
          ok: false,
          reason: err instanceof Error ? err.message : 'Falha ao consultar o Google Places.',
        }
      }
    },
  }
}
