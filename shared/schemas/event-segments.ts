import { z } from 'zod'

// Compartilhado entre client (formulário do cronograma) e server
// (revalidação — CLAUDE.md, seção 8/20.1).

function isValidOptionalDateTime(value: string | undefined): boolean {
  if (!value) return true
  return !Number.isNaN(Date.parse(value))
}

// z.coerce.number() sozinho coerce '' para 0 (não falha) — inadequado para
// um campo opcional onde string vazia precisa virar "não definido", não
// "zero" (0,0 é uma coordenada real, no Golfo da Guiné). Transforma antes
// de coagir, só então valida o intervalo.
function optionalCoordinateSchema(min: number, max: number) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .transform((value) => {
      if (value === undefined || value === '') return undefined
      return typeof value === 'string' ? Number(value) : value
    })
    .refine(
      (value) => value === undefined || (!Number.isNaN(value) && value >= min && value <= max),
      `Valor inválido (entre ${min} e ${max}).`,
    )
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
  // Coordenadas do local (Fase Editorial — mapa interativo), opcionais: sem
  // elas, a seção pública mostra só o botão "Abrir no Google Maps".
  venueLatitude: optionalCoordinateSchema(-90, 90),
  venueLongitude: optionalCoordinateSchema(-180, 180),
})

export type EventSegmentInput = z.infer<typeof eventSegmentInputSchema>
