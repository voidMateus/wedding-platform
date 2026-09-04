import type { EventSegmentInput } from '#shared/schemas/event-segments'
import type { Database } from '~/types/database.types'

type EtapaEventoInsert = Database['public']['Tables']['etapas_evento']['Insert']
type VenueColumns = Pick<
  EtapaEventoInsert,
  | 'nome_local'
  | 'endereco_local'
  | 'latitude_local'
  | 'longitude_local'
  | 'origem_local'
  | 'place_id_local'
  | 'provedor_local'
  | 'url_mapa_local'
  | 'logradouro_local'
  | 'numero_local'
  | 'complemento_local'
  | 'cidade_local'
  | 'estado_local'
>

const COLUNAS_VAZIAS: VenueColumns = {
  nome_local: null,
  endereco_local: null,
  latitude_local: null,
  longitude_local: null,
  origem_local: null,
  place_id_local: null,
  provedor_local: null,
  url_mapa_local: null,
  logradouro_local: null,
  numero_local: null,
  complemento_local: null,
  cidade_local: null,
  estado_local: null,
}

function textoOuNulo(valor: string | undefined): string | null {
  const limpo = valor?.trim()
  return limpo ? limpo : null
}

/**
 * Traduz a entrada validada do formulário para as colunas de local de
 * `etapas_evento` — a mesma tradução em POST e PATCH, num só lugar.
 *
 * Duas garantias que os dois handlers precisam ter idênticas:
 *
 *  - `mesmo_local_que` definido zera **todas** as colunas de local, incluindo
 *    as que esta fase adicionou. Duas fontes de verdade para o mesmo endereço
 *    é exatamente o que a referência entre segmentos existe para evitar
 *    (CLAUDE.md, seção 12) — e um place_id sobrevivente aqui seria pior que
 *    um endereço duplicado, porque "Ver no mapa" o preferiria ao local certo
 *    do segmento referenciado.
 *
 *  - Campo em branco vira `null`, nunca string vazia. As colunas de partes do
 *    endereço são nulas no caminho Maps e no caminho legado; `''` gravado ali
 *    faria o formulário reabrir em modo manual num local que veio do Maps.
 */
export function buildVenueColumns(
  input: EventSegmentInput,
  sameVenueAs: string | null,
): VenueColumns {
  if (sameVenueAs) return { ...COLUNAS_VAZIAS }

  const placeId = textoOuNulo(input.placeIdLocal)

  return {
    nome_local: textoOuNulo(input.nomeLocal),
    endereco_local: textoOuNulo(input.enderecoLocal),
    latitude_local: input.latitudeLocal ?? null,
    longitude_local: input.longitudeLocal ?? null,
    origem_local: textoOuNulo(input.origemLocal),
    place_id_local: placeId,
    // Pareado com o place_id pelo CHECK da tabela: registrar de quem é o id
    // é o que permite trocar de provedor sem herdar ponteiros inválidos.
    provedor_local: placeId ? textoOuNulo(input.provedorLocal) : null,
    url_mapa_local: textoOuNulo(input.urlMapaLocal),
    logradouro_local: textoOuNulo(input.logradouroLocal),
    numero_local: textoOuNulo(input.numeroLocal),
    complemento_local: textoOuNulo(input.complementoLocal),
    cidade_local: textoOuNulo(input.cidadeLocal),
    estado_local: textoOuNulo(input.estadoLocal),
  }
}
