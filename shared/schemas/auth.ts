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

/**
 * Definir a senha — no convite, na recuperação e na troca pelo painel.
 *
 * Um schema só para os três, porque a regra é a mesma; o que muda é de onde
 * vem a sessão que autoriza a troca. A confirmação existe porque o campo é
 * mascarado: sem ela, um erro de digitação vira uma senha que ninguém conhece,
 * e o caminho de volta é justamente o e-mail que a pessoa acabou de usar.
 */
export const definirSenhaSchema = z
  .object({
    senha: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmacao: z.string(),
  })
  .refine((valores) => valores.senha === valores.confirmacao, {
    message: 'As duas senhas precisam ser iguais.',
    path: ['confirmacao'],
  })

export type DefinirSenhaInput = z.infer<typeof definirSenhaSchema>
