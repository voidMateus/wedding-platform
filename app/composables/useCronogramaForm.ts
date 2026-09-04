import type { z } from 'zod'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'
import type { EventSegment } from '~/types/event-segment'
import type { EventSegmentLocation } from '~/types/event-segment-location'

type EventSegmentFormValues = Partial<z.input<typeof eventSegmentInputSchema>>

interface SaveCronogramaInput {
  ceremonyValues: EventSegmentFormValues
  ceremonyLocation: EventSegmentLocation
  receptionValues: EventSegmentFormValues
  receptionLocation: EventSegmentLocation
  /** Recepção reaproveita o local da cerimônia — nunca duplica o cadastro (CLAUDE.md, seção 12.2). */
  sameAddress: boolean
  ceremony: EventSegment | null
  reception: EventSegment | null
}

/**
 * Decisão de negócio do cronograma (CLAUDE.md, "Cerimônia e Recepção"):
 * criar-vs-atualizar cada segmento e reaproveitamento de endereço entre
 * cerimônia/recepção quando "mesmo endereço" está marcado.
 */
export function useCronogramaForm() {
  const { createEventSegment, updateEventSegment } = useEventSegments()

  async function saveCronograma(
    input: SaveCronogramaInput,
  ): Promise<{ ceremony: EventSegment; reception: EventSegment }> {
    // Cerimônia sempre salva com local próprio. eventSegmentInputSchema faz a
    // mesma validação/coerção que o server aplicaria (string → number nas
    // coordenadas, coerência entre origem e place_id) — os campos do
    // formulário chegam aqui todos como string.
    const ceremonyValues = eventSegmentInputSchema.parse({
      ...input.ceremonyValues,
      ...input.ceremonyLocation,
      titulo: 'Cerimônia',
      ordemExibicao: 1,
      mesmoLocalQue: '',
    })
    const ceremonyResult = input.ceremony
      ? await updateEventSegment(input.ceremony.id, ceremonyValues)
      : await createEventSegment(ceremonyValues)

    // Com "mesmo endereço" marcado, a recepção não guarda local nenhum: uma
    // localização parcial sobrevivente (um place_id antigo, por exemplo) seria
    // uma segunda fonte de verdade competindo com a da cerimônia.
    const receptionValues = eventSegmentInputSchema.parse({
      ...input.receptionValues,
      ...(input.sameAddress ? emptyEventSegmentLocation() : input.receptionLocation),
      titulo: 'Recepção',
      ordemExibicao: 2,
      mesmoLocalQue: input.sameAddress ? ceremonyResult.id : '',
    })
    const receptionResult = input.reception
      ? await updateEventSegment(input.reception.id, receptionValues)
      : await createEventSegment(receptionValues)

    return { ceremony: ceremonyResult, reception: receptionResult }
  }

  return { saveCronograma }
}
