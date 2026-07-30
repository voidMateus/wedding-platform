import { z } from 'zod'

// Compartilhado entre client (formulário do cronograma) e server
// (revalidação — CLAUDE.md, seção 8/20.1).

function isValidOptionalDateTime(value: string | undefined): boolean {
  if (!value) return true
  return !Number.isNaN(Date.parse(value))
}

export const eventSegmentInputSchema = z.object({
  title: z.string().trim().min(1, 'Informe um título (ex.: Cerimônia).').max(120),
  venueName: z.string().trim().max(200).optional().or(z.literal('')),
  venueAddress: z.string().trim().max(300).optional().or(z.literal('')),
  startsAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(isValidOptionalDateTime, 'Data/hora de início inválida.'),
  endsAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(isValidOptionalDateTime, 'Data/hora de término inválida.'),
  displayOrder: z.coerce.number().int('A ordem deve ser um número inteiro.').min(0).default(0),
})

export type EventSegmentInput = z.infer<typeof eventSegmentInputSchema>
