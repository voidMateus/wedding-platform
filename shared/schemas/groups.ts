import { z } from 'zod'
import { optionalHexColorSchema } from './theme'

// Compartilhado entre client (formulário de grupo) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Etiqueta organizacional livre — não confundir
// com invites (CLAUDE.md, seção 12.1).

export const groupInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe um nome para o grupo.').max(120),
  color: optionalHexColorSchema,
})

export type GroupInput = z.infer<typeof groupInputSchema>
