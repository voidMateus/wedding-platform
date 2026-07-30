import { z } from 'zod'

// Compartilhado entre client (formulário de presente) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Espelha o CHECK gifts_mode_fields
// (supabase/migrations, 20260730120010): presente de cota (isGroupGift=true)
// exige targetAmountCents; presente simples exige quantityAvailable — nunca
// os dois ao mesmo tempo (CLAUDE.md, seção 12.2/18.2).

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
