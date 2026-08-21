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
      title: 'Cerimônia',
      displayOrder: 1,
      sameVenueAs: '',
    })
    const ceremonyResult = input.ceremony
      ? await updateEventSegment(input.ceremony.id, ceremonyValues)
      : await createEventSegment(ceremonyValues)

    const receptionValues = eventSegmentInputSchema.parse({
      ...input.receptionValues,
      title: 'Recepção',
      displayOrder: 2,
      sameVenueAs: input.sameAddress ? ceremonyResult.id : '',
      venueName: input.sameAddress ? '' : input.receptionValues.venueName,
      venueAddress: input.sameAddress ? '' : input.receptionValues.venueAddress,
      venueLatitude: input.sameAddress ? '' : input.receptionValues.venueLatitude,
      venueLongitude: input.sameAddress ? '' : input.receptionValues.venueLongitude,
    })
    const receptionResult = input.reception
      ? await updateEventSegment(input.reception.id, receptionValues)
      : await createEventSegment(receptionValues)

    return { ceremony: ceremonyResult, reception: receptionResult }
  }

  return { saveCronograma }
}
