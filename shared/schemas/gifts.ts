import { z } from 'zod'

// Compartilhado entre client (formulário de presente) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Espelha o CHECK gifts_mode_fields
// (supabase/migrations, 20260730120010): presente de cota (isGroupGift=true)
// exige targetAmountCents; presente simples exige quantityAvailable — nunca
// os dois ao mesmo tempo (CLAUDE.md, seção 12.2/18.2).

// Catálogo fixo de ícones para "presente emocional" (display_style, CLAUDE.md
// seção 18) — reaproveitado pelo UiSelect do admin, mesmo padrão de
// shared/hero-buttons.ts.
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
    title: z.string().trim().min(1, 'Informe o título do presente.').max(200),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    priceCents: z.coerce.number().int().min(0).optional(),
    imageUrl: z.string().trim().max(2000).optional().or(z.literal('')),
    categoryId: z.string().uuid().optional().or(z.literal('')),
    isGroupGift: z.boolean(),
    quantityAvailable: z.coerce.number().int().min(0).optional(),
    targetAmountCents: z.coerce.number().int().min(1).optional(),
    quotaAmountCents: z.coerce.number().int().min(1).optional(),
    displayStyle: z.enum(['standard', 'emotional']).default('standard'),
    emotionalIcon: z.enum(EMOTIONAL_GIFT_ICON_VALUES).optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  })
  .refine(
    (value) => !value.isGroupGift || (value.targetAmountCents ?? 0) > 0,
    {
      message: 'Informe o valor-alvo da cota.',
      path: ['targetAmountCents'],
    },
  )
  .refine((value) => value.isGroupGift || value.quantityAvailable !== undefined, {
    message: 'Informe a quantidade disponível.',
    path: ['quantityAvailable'],
  })

export type GiftInput = z.infer<typeof giftInputSchema>
