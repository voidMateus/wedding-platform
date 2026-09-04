import type { EventSegment } from '~/types/event-segment'
import type { EventSegmentLocation } from '~/types/event-segment-location'
import type { PlaceDetails } from '~/types/place'
import { ORIGENS_LOCAL } from '#shared/schemas/event-segments'
import { formatarEnderecoLocal } from '#shared/utils/endereco-local'
import type { LocalParaMapa } from '#shared/utils/mapa-local'

/**
 * Conversões entre a linha de `etapas_evento` e o objeto que o campo de
 * localização do painel manipula (AdminLocationField).
 */

export function emptyEventSegmentLocation(): EventSegmentLocation {
  return {
    nomeLocal: '',
    enderecoLocal: '',
    latitudeLocal: '',
    longitudeLocal: '',
    origemLocal: '',
    placeIdLocal: '',
    provedorLocal: '',
    urlMapaLocal: '',
    logradouroLocal: '',
    numeroLocal: '',
    complementoLocal: '',
    cidadeLocal: '',
    estadoLocal: '',
  }
}

/** Um local "existe" quando há algo que dê para mostrar ao convidado — nome ou endereço. */
export function hasEventSegmentLocation(location: EventSegmentLocation): boolean {
  return Boolean(location.nomeLocal.trim() || location.enderecoLocal.trim())
}

/**
 * `origem_local` é `text` no banco (espelhando o CHECK) e chega aqui como
 * string. Um valor fora da união vira `''` em vez de ser propagado: é assim
 * que uma linha legada — cadastrada antes desta fase, sem origem nenhuma —
 * abre no formulário como um local comum, sem nada quebrar (CLAUDE.md,
 * seção 12).
 */
function toOrigemLocal(value: string | null): EventSegmentLocation['origemLocal'] {
  return ORIGENS_LOCAL.find((origem) => origem === value) ?? ''
}

export function eventSegmentLocationFromSegment(segment: EventSegment): EventSegmentLocation {
  return {
    nomeLocal: segment.nome_local ?? '',
    enderecoLocal: segment.endereco_local ?? '',
    latitudeLocal: segment.latitude_local === null ? '' : String(segment.latitude_local),
    longitudeLocal: segment.longitude_local === null ? '' : String(segment.longitude_local),
    origemLocal: toOrigemLocal(segment.origem_local),
    placeIdLocal: segment.place_id_local ?? '',
    provedorLocal: segment.provedor_local ?? '',
    urlMapaLocal: segment.url_mapa_local ?? '',
    logradouroLocal: segment.logradouro_local ?? '',
    numeroLocal: segment.numero_local ?? '',
    complementoLocal: segment.complemento_local ?? '',
    cidadeLocal: segment.cidade_local ?? '',
    estadoLocal: segment.estado_local ?? '',
  }
}

/**
 * Localização a partir de uma escolha no provedor de lugares.
 *
 * Parte de um objeto vazio, nunca do valor anterior: trocar um local por
 * outro precisa apagar tudo do antigo. Um `logradouro_local` sobrevivente de
 * um cadastro manual anterior faria o formulário reabrir em modo manual num
 * local que veio do Maps, e as partes ficariam descrevendo outro endereço.
 */
export function locationFromPlace(place: PlaceDetails, provider: string): EventSegmentLocation {
  return {
    ...emptyEventSegmentLocation(),
    nomeLocal: place.name,
    enderecoLocal: place.formattedAddress,
    latitudeLocal: String(place.latitude),
    longitudeLocal: String(place.longitude),
    origemLocal: 'maps_place',
    placeIdLocal: place.placeId,
    provedorLocal: provider,
    urlMapaLocal: place.mapsUrl ?? '',
    // Cidade e UF vêm preenchidas para o caso de o casal converter esta
    // escolha em cadastro manual depois. Logradouro e número ficam vazios: o
    // provedor não os separa de forma confiável para todo tipo de endereço.
    cidadeLocal: place.city ?? '',
    estadoLocal: place.state ?? '',
  }
}

/**
 * Rascunho inicial do cadastro manual. Aproveita o que der (nome, cidade),
 * mas larga a identificação do lugar — a partir daqui o local é manual, e um
 * place_id herdado faria "Ver no mapa" abrir o lugar antigo por cima do
 * endereço novo (além de violar o CHECK da tabela).
 */
export function manualDraftFrom(location: EventSegmentLocation): EventSegmentLocation {
  return {
    ...location,
    origemLocal: 'manual',
    placeIdLocal: '',
    provedorLocal: '',
    urlMapaLocal: '',
  }
}

/**
 * Rascunho manual concluído. `enderecoLocal` é sempre recomposto das partes:
 * é ele que todas as telas exibem, e deixá-lo com o texto de uma escolha
 * anterior é o jeito mais fácil de o site mostrar um endereço que o casal já
 * trocou.
 */
export function commitManualLocation(draft: EventSegmentLocation): EventSegmentLocation {
  return {
    ...draft,
    origemLocal: 'manual',
    enderecoLocal: formatarEnderecoLocal({
      logradouro: draft.logradouroLocal,
      numero: draft.numeroLocal,
      complemento: draft.complementoLocal,
      cidade: draft.cidadeLocal,
      estado: draft.estadoLocal,
    }),
    placeIdLocal: '',
    provedorLocal: '',
    urlMapaLocal: '',
  }
}

/** Adapta para o shape que shared/utils/mapa-local.ts consome (colunas, não campos de formulário). */
export function locationToMapaLocal(location: EventSegmentLocation): LocalParaMapa {
  return {
    nome_local: location.nomeLocal || null,
    endereco_local: location.enderecoLocal || null,
    latitude_local: location.latitudeLocal ? Number(location.latitudeLocal) : null,
    longitude_local: location.longitudeLocal ? Number(location.longitudeLocal) : null,
    place_id_local: location.placeIdLocal || null,
    url_mapa_local: location.urlMapaLocal || null,
  }
}
