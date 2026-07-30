import { z } from 'zod'

// Compartilhado entre client (formulário de grupo) e server (revalidação —
// CLAUDE.md, seção 8/20.1).

export const guestGroupInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para o grupo.').max(120),
  // coerce: o form envia o valor do <input type="number"> como string; o
  // server aceita number diretamente — um schema único cobre os dois.
  maxMembers: z.coerce
    .number({ message: 'Informe um número válido.' })
    .int('O limite de acompanhantes deve ser um número inteiro.')
    .min(0, 'O limite de acompanhantes não pode ser negativo.'),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
})

export type GuestGroupInput = z.infer<typeof guestGroupInputSchema>
