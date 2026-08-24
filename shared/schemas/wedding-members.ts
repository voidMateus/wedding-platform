import { z } from 'zod'

// Convite de colaborador para o casamento ativo (docs/PLANO-SAAS.md, Passo
// 3) — compartilhado entre client (formulário de "Convidar colaborador") e
// server (revalidação, CLAUDE.md seção 8/20.1). Não existe signup
// self-service nesta fase: o convite usa o fluxo nativo de e-mail do
// Supabase Auth (admin.inviteUserByEmail), não um sistema de comunicação
// próprio (esse é Fase 2, docs/ARCHITECTURE.md §3.4).

export const weddingMemberInviteSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  papel: z.enum(['dono', 'colaborador']).default('colaborador'),
})

export type WeddingMemberInviteInput = z.infer<typeof weddingMemberInviteSchema>
