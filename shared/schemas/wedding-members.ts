import { z } from 'zod'
import { PAPEIS_DE_MEMBRO } from '../papeis-de-membro'

// Convite de colaborador para o casamento ativo (docs/PLANO-SAAS.md, Passo
// 3) — compartilhado entre client (formulário de "Convidar colaborador") e
// server (revalidação, CLAUDE.md seção 8/20.1). Não existe signup
// self-service nesta fase: o convite usa o fluxo nativo de e-mail do
// Supabase Auth (admin.inviteUserByEmail), não um sistema de comunicação
// próprio (esse é Fase 2, docs/ARCHITECTURE.md §3.4).

export const weddingMemberInviteSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  // Os três papéis da escada (docs/fase5-multievento.md 4.2). Quais deles o
  // convidante pode de fato conceder é decisão de `podeGerenciarPapel()`, no
  // endpoint — o schema só valida que o valor existe.
  papel: z.enum(PAPEIS_DE_MEMBRO).default('colaborador'),
})

export type WeddingMemberInviteInput = z.infer<typeof weddingMemberInviteSchema>
