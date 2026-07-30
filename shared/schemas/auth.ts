import { z } from 'zod'

// Compartilhado entre client (validação de formulário) e server (revalidação
// — CLAUDE.md, seção 8/20.1). Vive em shared/ (alias #shared), não em
// server/utils/schemas/ como a árvore original do ARCHITECTURE.md sugeria:
// código sob server/ não é importável pelo bundle do client no Nuxt.

export const loginWithPasswordSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

export type LoginWithPasswordInput = z.infer<typeof loginWithPasswordSchema>

export const loginWithMagicLinkSchema = z.object({
  email: z.string().email('Informe um e-mail válido.'),
})

export type LoginWithMagicLinkInput = z.infer<typeof loginWithMagicLinkSchema>
