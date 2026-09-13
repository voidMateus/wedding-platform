import { z } from 'zod'

/**
 * Mesas e planta do salão. Compartilhado entre client e server (CLAUDE.md,
 * seção 8) — o servidor revalida com o mesmo schema.
 *
 * Medidas e posições são sempre CENTÍMETROS inteiros, nunca pixels: o salão
 * tem dimensões reais, e é a comparação entre elas e o tamanho da mesa que
 * responde "cabe?". Pixel é centímetro × zoom, resolvido só na renderização.
 */

const centimetros = z.number().int()

export const FORMATOS_DE_MESA = ['redonda', 'retangular'] as const
export type FormatoDeMesa = (typeof FORMATOS_DE_MESA)[number]

export const TIPOS_DE_ELEMENTO = [
  'pista',
  'palco',
  'buffet',
  'bolo',
  'entrada',
  'bar',
  'outro',
] as const
export type TipoDeElemento = (typeof TIPOS_DE_ELEMENTO)[number]

export const mesaInputSchema = z
  .object({
    nome: z.string().trim().min(1, 'Dê um nome ou número à mesa.').max(80),
    capacidade: z.number().int().min(1, 'Uma mesa tem ao menos um lugar.').max(60),
    formato: z.enum(FORMATOS_DE_MESA).default('redonda'),
    larguraCm: centimetros.min(30).max(2000).default(180),
    profundidadeCm: centimetros.min(30).max(2000).default(180),
    observacao: z.string().trim().max(500).nullish(),
  })
  // Na redonda as duas medidas SÃO o diâmetro, e a tela mostra um campo só. O
  // CHECK do banco garante o mesmo — aqui é para o erro chegar em português.
  .refine(
    (input) => input.formato !== 'redonda' || input.larguraCm === input.profundidadeCm,
    'Mesa redonda tem um diâmetro só.',
  )

export type MesaInput = z.infer<typeof mesaInputSchema>

/**
 * Posição e rotação, num schema separado do resto.
 *
 * Arrastar gera muitos salvamentos, e um PATCH gordo carregaria junto nome e
 * capacidade lidos quando a tela montou — é assim que um campo alheio acaba
 * sobrescrito por um valor velho. Mesma lição do teto global do Financeiro não
 * entrar em `PATCH /api/wedding`.
 */
export const mesaPosicaoSchema = z.object({
  posicaoXCm: centimetros.min(0).max(100000),
  posicaoYCm: centimetros.min(0).max(100000),
  rotacaoGraus: z.number().int().min(0).max(359).optional(),
})

export type MesaPosicaoInput = z.infer<typeof mesaPosicaoSchema>

/**
 * Sentar e tirar, em lote.
 *
 * `mesaId: null` é o "tirar da mesa" — mesma rota, porque é a mesma mutação.
 * Em lote e não um PATCH por pessoa: sentar uma família é um gesto só, e N
 * requisições fariam a ocupação piscar por estados intermediários que nunca
 * foram uma intenção do casal.
 */
export const assentoInputSchema = z
  .object({
    mesaId: z.string().uuid().nullable(),
    convidadoIds: z.array(z.string().uuid()).max(200).default([]),
    avulsoIds: z.array(z.string().uuid()).max(200).default([]),
  })
  .refine(
    (input) => input.convidadoIds.length + input.avulsoIds.length > 0,
    'Escolha ao menos uma pessoa.',
  )

export type AssentoInput = z.infer<typeof assentoInputSchema>

export const elementoInputSchema = z.object({
  tipo: z.enum(TIPOS_DE_ELEMENTO),
  nome: z.string().trim().max(80).nullish(),
  larguraCm: centimetros.min(30).max(5000).default(200),
  profundidadeCm: centimetros.min(30).max(5000).default(200),
  posicaoXCm: centimetros.min(0).max(100000).default(0),
  posicaoYCm: centimetros.min(0).max(100000).default(0),
  rotacaoGraus: z.number().int().min(0).max(359).default(0),
})

export type ElementoInput = z.infer<typeof elementoInputSchema>

/**
 * As medidas do salão. Nulo é estado válido — "ainda não sei quanto mede" —, e
 * é ele que faz a planta se ajustar ao conteúdo em vez de desenhar uma parede
 * inventada.
 */
export const plantaSalaoSchema = z.object({
  larguraCm: centimetros.min(100).max(100000).nullable(),
  profundidadeCm: centimetros.min(100).max(100000).nullable(),
})

export type PlantaSalaoInput = z.infer<typeof plantaSalaoSchema>
