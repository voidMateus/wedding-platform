import { z } from 'zod'

// Compartilhado entre client (formulário de categoria) e server (revalidação
// — CLAUDE.md, seção 8/20.1).

export const giftCategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para a categoria.').max(120),
  displayOrder: z.coerce
    .number({ message: 'Informe um número válido.' })
    .int('A ordem de exibição deve ser um número inteiro.')
    .min(0, 'A ordem de exibição não pode ser negativa.')
    .default(0),
})

export type GiftCategoryInput = z.infer<typeof giftCategoryInputSchema>
