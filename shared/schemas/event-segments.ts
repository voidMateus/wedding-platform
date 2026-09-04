import { z } from 'zod'
import { ehUrlDeMapaSegura } from '#shared/utils/mapa-local'

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
//
// Desde a Fase Localização estas coordenadas nunca são digitadas: vêm da
// seleção no provedor de lugares ou do marcador arrastado no mapa (CLAUDE.md,
// seção 12 — coordenada é dado interno, nunca campo de formulário). A
// validação de intervalo continua aqui mesmo assim: o server revalida tudo
// que chega pela rede, independentemente de qual UI montou o corpo.
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

function optionalText(max: number) {
  return z.string().trim().max(max).optional().or(z.literal(''))
}

/**
 * Como a localização foi definida — espelha o CHECK de
 * `etapas_evento.origem_local`. String literal union, nunca enum do
 * TypeScript (CLAUDE.md, seção 8).
 */
export const ORIGENS_LOCAL = ['maps_place', 'manual'] as const
export type OrigemLocal = (typeof ORIGENS_LOCAL)[number]

const baseEventSegmentInputSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe um título (ex.: Cerimônia).').max(120),
  nomeLocal: optionalText(200),
  /** Endereço pronto para exibição — composto no caminho manual, vindo do provedor no caminho Maps. */
  enderecoLocal: optionalText(300),
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
  latitudeLocal: optionalCoordinateSchema(-90, 90),
  longitudeLocal: optionalCoordinateSchema(-180, 180),
  origemLocal: z.enum(ORIGENS_LOCAL).optional().or(z.literal('')),
  placeIdLocal: optionalText(512),
  provedorLocal: optionalText(40),
  urlMapaLocal: optionalText(2048).refine(
    (value) => !value || ehUrlDeMapaSegura(value),
    'URL de mapa não reconhecida.',
  ),
  // Partes do endereço manual — só para reabrir o formulário com cada campo
  // no lugar; exibição sempre usa enderecoLocal (shared/utils/endereco-local.ts).
  logradouroLocal: optionalText(200),
  numeroLocal: optionalText(20),
  complementoLocal: optionalText(120),
  cidadeLocal: optionalText(120),
  estadoLocal: optionalText(40),
  // Cerimônia e recepção no mesmo local (Fase Editorial): quando definido,
  // reaproveita o local de outro segmento em vez de duplicar o cadastro —
  // validação de "não é o próprio id" / "não é uma corrente" acontece no
  // server (precisa consultar o banco, ver server/utils/validate-same-venue.ts).
  mesmoLocalQue: z.string().trim().uuid().optional().or(z.literal('')),
})

/**
 * Espelha, na entrada, os dois CHECKs de coerência de
 * `etapas_evento` (migration 20260904140001): um identificador de lugar só
 * existe junto da origem que o produziu e do provedor que o emitiu. Validar
 * aqui — e não só no banco — troca um 500 opaco de constraint violada por uma
 * mensagem de campo no formulário.
 */
export const eventSegmentInputSchema = baseEventSegmentInputSchema
  .refine((input) => input.origemLocal !== 'maps_place' || Boolean(input.placeIdLocal), {
    message: 'Local selecionado no mapa sem identificação do lugar.',
    path: ['placeIdLocal'],
  })
  .refine((input) => input.origemLocal === 'maps_place' || !input.placeIdLocal, {
    message: 'Identificação de lugar só é válida para um local escolhido no mapa.',
    path: ['placeIdLocal'],
  })
  .refine((input) => Boolean(input.placeIdLocal) === Boolean(input.provedorLocal), {
    message: 'Identificação de lugar exige registrar de qual provedor ela veio.',
    path: ['provedorLocal'],
  })

export type EventSegmentInput = z.infer<typeof eventSegmentInputSchema>
