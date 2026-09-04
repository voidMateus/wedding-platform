import type { OrigemLocal } from '#shared/schemas/event-segments'

/**
 * A localização de um segmento do cronograma como o formulário a carrega —
 * um objeto só, em vez de treze campos soltos de vee-validate.
 *
 * Tudo string (inclusive as coordenadas) porque é isso que um formulário HTML
 * produz e é o que `eventSegmentInputSchema` já sabe coagir. String vazia
 * significa "não definido" — nunca `undefined`, para que trocar de local
 * sempre sobrescreva o valor anterior em vez de deixar restos de uma escolha
 * antiga (um `place_id` órfão junto de um endereço novo seria aceito pelo
 * formulário e rejeitado só no CHECK do banco).
 *
 * As chaves espelham as do schema Zod, que por sua vez espelham as colunas —
 * a página monta o corpo da requisição espalhando este objeto.
 */
export interface EventSegmentLocation {
  nomeLocal: string
  /** Endereço pronto para exibição — do provedor, ou composto das partes manuais. */
  enderecoLocal: string
  /** Nunca digitadas: vêm da seleção no provedor ou do marcador no mapa (CLAUDE.md, seção 12). */
  latitudeLocal: string
  longitudeLocal: string
  origemLocal: OrigemLocal | ''
  placeIdLocal: string
  provedorLocal: string
  urlMapaLocal: string
  logradouroLocal: string
  numeroLocal: string
  complementoLocal: string
  cidadeLocal: string
  estadoLocal: string
}
