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
  titulo: z.string().trim().min(1, 'Informe um título (ex.: Cerimônia).').max(120),
  nomeLocal: z.string().trim().max(200).optional().or(z.literal('')),
  enderecoLocal: z.string().trim().max(300).optional().or(z.literal('')),
  iniciaEm: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(isValidOptionalDateTime, 'Data/hora de início inválida.'),
  terminaEm: z
    .string()
    .trim()
    .optional()
    .or(z.literal(''))
    .refine(isValidOptionalDateTime, 'Data/hora de término inválida.'),
  ordemExibicao: z.coerce.number().int('A ordem deve ser um número inteiro.').min(0).default(0),
  // Coordenadas do local (Fase Editorial — mapa interativo), opcionais: sem
  // elas, o mapa/botão usam o endereço em texto.
  latitudeLocal: optionalCoordinateSchema(-90, 90),
  longitudeLocal: optionalCoordinateSchema(-180, 180),
  // Cerimônia e recepção no mesmo local (Fase Editorial): quando definido,
  // reaproveita o local de outro segmento em vez de duplicar o cadastro —
  // validação de "não é o próprio id" / "não é uma corrente" acontece no
  // server (precisa consultar o banco, ver server/utils/validate-same-venue.ts).
  mesmoLocalQue: z.string().trim().uuid().optional().or(z.literal('')),
})

export type EventSegmentInput = z.infer<typeof eventSegmentInputSchema>
