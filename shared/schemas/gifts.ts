import { z } from 'zod'

// Compartilhado entre client (formulário de presente) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Espelha o CHECK presentes_mode_fields
// (supabase/migrations, 20260730120010/20260821090001): presente de cota
// (ePresenteCota=true) exige valorMetaCentavos; presente simples exige
// quantidadeDisponivel — nunca os dois ao mesmo tempo (CLAUDE.md, seção
// 12.2/18.2).

// Catálogo fixo de ícones para "presente emocional" (estilo_exibicao,
// CLAUDE.md seção 18) — reaproveitado pelo UiSelect do admin, mesmo padrão
// de shared/hero-buttons.ts.
export const EMOTIONAL_GIFT_ICONS = [
  { value: 'home', label: 'Casa' },
  { value: 'plane', label: 'Viagem' },
  { value: 'heart-handshake', label: 'Ajuda mútua' },
  { value: 'sofa', label: 'Móveis' },
  { value: 'car', label: 'Carro' },
  { value: 'palette', label: 'Decoração' },
  { value: 'music', label: 'Festa' },
  { value: 'sprout', label: 'Novo começo' },
] as const

const EMOTIONAL_GIFT_ICON_VALUES = EMOTIONAL_GIFT_ICONS.map((icon) => icon.value) as [
  string,
  ...string[],
]

export const giftInputSchema = z
  .object({
    titulo: z.string().trim().min(1, 'Informe o título do presente.').max(200),
    descricao: z.string().trim().max(2000).optional().or(z.literal('')),
    precoCentavos: z.coerce.number().int().min(0).optional(),
    urlImagem: z.string().trim().max(2000).optional().or(z.literal('')),
    categoriaId: z.string().uuid().optional().or(z.literal('')),
    ePresenteCota: z.boolean(),
    quantidadeDisponivel: z.coerce.number().int().min(0).optional(),
    valorMetaCentavos: z.coerce.number().int().min(1).optional(),
    valorCotaCentavos: z.coerce.number().int().min(1).optional(),
    estiloExibicao: z.enum(['padrao', 'emocional']).default('padrao'),
    iconeEmocional: z.enum(EMOTIONAL_GIFT_ICON_VALUES).optional().or(z.literal('')),
    estaAtivo: z.boolean().default(true),
  })
  .refine(
    (value) => !value.ePresenteCota || (value.valorMetaCentavos ?? 0) > 0,
    {
      message: 'Informe o valor-alvo da cota.',
      path: ['valorMetaCentavos'],
    },
  )
  .refine((value) => value.ePresenteCota || value.quantidadeDisponivel !== undefined, {
    message: 'Informe a quantidade disponível.',
    path: ['quantidadeDisponivel'],
  })

export type GiftInput = z.infer<typeof giftInputSchema>
