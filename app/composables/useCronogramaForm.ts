import type { z } from 'zod'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'
import type { EventSegment } from '~/types/event-segment'

type EventSegmentFormValues = Partial<z.input<typeof eventSegmentInputSchema>>

interface SaveCronogramaInput {
  ceremonyValues: EventSegmentFormValues
  receptionValues: EventSegmentFormValues
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
    // Cerimônia sempre salva com endereço próprio. eventSegmentInputSchema
    // faz a mesma validação/coerção que o server aplicaria (string → number
    // nas coordenadas) — os campos de vee-validate ficam como string até
    // aqui.
    const ceremonyValues = eventSegmentInputSchema.parse({
      ...input.ceremonyValues,
      titulo: 'Cerimônia',
      ordemExibicao: 1,
      mesmoLocalQue: '',
    })
    const ceremonyResult = input.ceremony
      ? await updateEventSegment(input.ceremony.id, ceremonyValues)
      : await createEventSegment(ceremonyValues)

    const receptionValues = eventSegmentInputSchema.parse({
      ...input.receptionValues,
      titulo: 'Recepção',
      ordemExibicao: 2,
      mesmoLocalQue: input.sameAddress ? ceremonyResult.id : '',
      nomeLocal: input.sameAddress ? '' : input.receptionValues.nomeLocal,
      enderecoLocal: input.sameAddress ? '' : input.receptionValues.enderecoLocal,
      latitudeLocal: input.sameAddress ? '' : input.receptionValues.latitudeLocal,
      longitudeLocal: input.sameAddress ? '' : input.receptionValues.longitudeLocal,
    })
    const receptionResult = input.reception
      ? await updateEventSegment(input.reception.id, receptionValues)
      : await createEventSegment(receptionValues)

    return { ceremony: ceremonyResult, reception: receptionResult }
  }

  return { saveCronograma }
}
