import type { EventSegment } from '~/types/event-segment'

/**
 * Resolve o local "efetivo" de um segmento do cronograma (CLAUDE.md, 12.2 —
 * cerimônia e recepção no mesmo local). Quando `mesmo_local_que` aponta para
 * outro segmento já presente na mesma lista buscada, retorna uma cópia com
 * os campos de local substituídos pelos do segmento referenciado — os
 * componentes de exibição (EventSpotlight.vue) continuam lendo
 * nome_local/endereco_local/place_id_local/... normalmente, sem precisar
 * conhecer o mecanismo de referência.
 *
 * A lista abaixo é manual e precisa ser exaustiva: coluna de local nova
 * (migration que acrescente algo em `etapas_evento`) tem que entrar aqui
 * também. Esquecer uma produz o pior bug desta área — o card mostra o
 * endereço certo do segmento referenciado, mas "Ver no mapa" abre o place_id
 * antigo do próprio segmento, e nada na tela denuncia a divergência. É o
 * mesmo tipo de descarte silencioso que já aconteceu duas vezes na lista de
 * campos de `wedding/theme.patch.ts` (CLAUDE.md, seção 13).
 */
export function resolveEventSegmentVenue(
  segment: EventSegment,
  allSegments: EventSegment[],
): EventSegment {
  if (!segment.mesmo_local_que) return segment

  const source = allSegments.find((candidate) => candidate.id === segment.mesmo_local_que)
  if (!source) return segment

  return {
    ...segment,
    nome_local: source.nome_local,
    endereco_local: source.endereco_local,
    latitude_local: source.latitude_local,
    longitude_local: source.longitude_local,
    origem_local: source.origem_local,
    place_id_local: source.place_id_local,
    provedor_local: source.provedor_local,
    url_mapa_local: source.url_mapa_local,
    logradouro_local: source.logradouro_local,
    numero_local: source.numero_local,
    complemento_local: source.complemento_local,
    cidade_local: source.cidade_local,
    estado_local: source.estado_local,
  }
}
