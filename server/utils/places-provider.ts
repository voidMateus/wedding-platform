/**
 * Contrato do provedor de lugares — a fronteira que mantém "buscar um local"
 * independente de quem responde a busca (CLAUDE.md, seção 12 — Localização do
 * Cronograma). Hoje só existe uma implementação (places-google.ts); a
 * interface existe porque o provedor é a peça mais provável de trocar (custo
 * por requisição, cobertura de POI no Brasil), e porque `place_id` gravado no
 * banco é opaco: sem `provedor_local` registrado junto, uma troca silenciosa
 * transformaria todo id salvo em ponteiro para o lugar errado.
 *
 * DTOs em inglês, de propósito: não espelham linha de tabela nenhuma, são
 * shapes que o endpoint monta para a tela (mesma exceção deliberada de
 * `PublicGift`, CLAUDE.md seção 6).
 *
 * Toda operação devolve `{ ok }` em vez de lançar — instabilidade do provedor
 * externo não pode virar exceção não tratada no meio de um formulário (mesmo
 * padrão de server/utils/google-drive.ts e infinitepay.ts).
 */

export interface PlaceSuggestion {
  placeId: string
  /** Nome do lugar, ou a primeira linha do endereço quando não é um POI. */
  mainText: string
  /** Endereço/cidade que diferencia dois lugares de nome parecido — o motivo de a sugestão ter duas linhas. */
  secondaryText: string | null
}

export interface PlaceDetails {
  placeId: string
  name: string
  formattedAddress: string
  latitude: number
  longitude: number
  /** URL oficial do lugar no provedor, quando ele devolve uma. */
  mapsUrl: string | null
  city: string | null
  state: string | null
}

export type PlacesResult<T> = { ok: true; data: T } | { ok: false; reason: string }

export interface PlacesAutocompleteInput {
  query: string
  /**
   * Agrupa as chamadas de digitação e a consulta de detalhes que a encerra
   * numa única sessão de cobrança no provedor. Sem ele, cada tecla digitada
   * vira uma requisição faturada à parte.
   */
  sessionToken: string
}

export interface PlacesDetailsInput {
  placeId: string
  sessionToken: string
}

export interface PlacesProvider {
  /** Vai para `etapas_evento.provedor_local` junto do place_id. */
  readonly id: string
  autocomplete(input: PlacesAutocompleteInput): Promise<PlacesResult<PlaceSuggestion[]>>
  details(input: PlacesDetailsInput): Promise<PlacesResult<PlaceDetails | null>>
}

/**
 * O provedor configurado, ou null quando não há credencial no ambiente.
 *
 * Null não é erro de programação: o autocomplete é um recurso opcional que
 * depende de uma chave com faturamento. Sem ela o cadastro de local continua
 * inteiro pelo caminho manual (CLAUDE.md, seção 12 — o Maps é o caminho
 * principal, nunca uma dependência que impeça cadastrar um local). Os
 * endpoints traduzem esse null num 503 explícito e a UI esconde a busca.
 */
export function resolvePlacesProvider(): PlacesProvider | null {
  const config = useRuntimeConfig()
  if (!config.googleMapsApiKey) return null
  return createGooglePlacesProvider(config.googleMapsApiKey)
}
