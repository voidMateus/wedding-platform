import { z } from 'zod'

// Compartilhado entre client (formulário de convidado) e server (revalidação
// — CLAUDE.md, seção 8/20.1).

export const guestInputSchema = z.object({
  groupId: z.string().uuid('Selecione um grupo.'),
  fullName: z.string().trim().min(1, 'Informe o nome do convidado.').max(200),
  // E-mail/telefone não são obrigatórios (CLAUDE.md, seção 15.3) — a UI avisa
  // quando nenhum canal de contato foi informado, mas não bloqueia o envio.
  email: z.string().trim().email('Informe um e-mail válido.').max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional().or(z.literal('')),
  isChild: z.boolean().default(false),
  dietaryRestrictions: z.string().trim().max(500).optional().or(z.literal('')),
})

export type GuestInput = z.infer<typeof guestInputSchema>
