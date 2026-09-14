import { z } from 'zod'

// Validação do módulo Planejamento, compartilhada entre client e server
// (CLAUDE.md, seção 8).

/** `date` do Postgres — sempre YYYY-MM-DD, nunca ISO com hora. */
const dataSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe uma data válida.')

const textoOpcional = z
  .string()
  .trim()
  .max(2000)
  .nullish()
  .transform((valor) => (valor ? valor : null))

const responsavelSchema = z
  .string()
  .trim()
  .max(120)
  .nullish()
  .transform((valor) => (valor ? valor : null))

/**
 * Criar uma tarefa. Duas origens, um endpoint.
 *
 * `chaveCatalogo` sozinha basta: título e prazo de uma sugestão são resolvidos
 * NO SERVIDOR a partir do catálogo e da data do evento, nunca aceitos do client
 * — mesmo princípio de "valor e quantidade são sempre recalculados no servidor"
 * dos presentes. O que o client manda é a intenção, não o conteúdo.
 */
export const taskInputSchema = z
  .object({
    titulo: z.string().trim().min(1, 'Informe o que precisa ser feito.').max(200).optional(),
    prazo: dataSchema.nullish(),
    responsavel: responsavelSchema,
    observacao: textoOpcional,
    chaveCatalogo: z.string().trim().min(1).max(80).nullish(),
  })
  .refine((valor) => Boolean(valor.titulo) || Boolean(valor.chaveCatalogo), {
    message: 'Informe o que precisa ser feito.',
    path: ['titulo'],
  })
/**
 * `z.input`, não `z.infer`: os campos de texto passam por `.transform()`, que
 * torna a SAÍDA obrigatória (`string | null`) mesmo quando a entrada é
 * opcional. Tipar o composable pela saída obrigaria quem cria uma tarefa a
 * mandar `observacao: null` e `responsavel: null` explicitamente — cerimônia
 * para dizer "não tenho nada a dizer aqui".
 */
export type TaskInput = z.input<typeof taskInputSchema>

/**
 * Editar. `concluida` é booleano, e não um timestamp vindo do client: quando a
 * tarefa foi concluída é fato do servidor — aceitar a hora de fora deixaria o
 * relógio do navegador definir se a tarefa venceu ou não.
 */
export const taskPatchSchema = z.object({
  titulo: z.string().trim().min(1, 'Informe o que precisa ser feito.').max(200).optional(),
  prazo: dataSchema.nullish(),
  responsavel: responsavelSchema,
  observacao: textoOpcional,
  concluida: z.boolean().optional(),
})
export type TaskPatch = z.input<typeof taskPatchSchema>
