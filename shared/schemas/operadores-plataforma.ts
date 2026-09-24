import { z } from 'zod'

/**
 * Entrada das rotas de operador da plataforma (docs/fase6-contas-e-acessos.md).
 *
 * Só e-mail: o vínculo de operador não tem papel, validade nem escopo — a
 * decisão 4.1 fechou o modelo como **plano**. Um campo a mais aqui seria a
 * primeira parede de uma escada que ninguém pediu.
 */
export const concederOperadorSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail.')
    .email('E-mail inválido.')
    .transform((valor) => valor.toLowerCase()),
})

export type ConcederOperadorInput = z.infer<typeof concederOperadorSchema>

/** Consulta transversal: "este e-mail alcança o quê?" */
export const consultaDeAcessosSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
})
