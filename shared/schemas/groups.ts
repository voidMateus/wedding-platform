import { z } from 'zod'
import { optionalHexColorSchema } from './theme'

// Compartilhado entre client (formulário de grupo) e server (revalidação —
// CLAUDE.md, seção 8/20.1). Etiqueta organizacional livre — não confundir
// com convites (CLAUDE.md, seção 12.1).

export const groupInputSchema = z.object({
  nome: z.string().trim().min(1, 'Informe um nome para o grupo.').max(120),
  cor: optionalHexColorSchema,
  // Subdivisão do grupo ("Tios paternos" dentro de "Família do Mateus").
  // Nullable e não só optional porque as duas ausências significam coisas
  // diferentes: campo ausente é "não mexer no pai", `null` explícito é
  // "promover a grupo raiz".
  //
  // A hierarquia tem no máximo dois níveis e quem garante isso é o Postgres
  // (validar_grupo_pai(), migration 20260908090001): toda regra ali compara
  // esta linha com OUTRA linha de `grupos`, que Zod não tem como ver.
  grupoPaiId: z.string().uuid().nullish(),
})

export type GroupInput = z.infer<typeof groupInputSchema>
