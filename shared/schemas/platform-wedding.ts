import { z } from 'zod'
import { PAPEIS_DE_MEMBRO } from '../papeis-de-membro'

/**
 * Criação de casamento pelo painel interno (docs/fase5-multievento.md seção
 * 6) — compartilhado entre o formulário de `/plataforma` e a revalidação no
 * servidor (CLAUDE.md, seção 8).
 *
 * Não é cadastro self-service: quem preenche isto é a equipe interna, e o
 * e-mail informado vira o DONO do casamento. Criação pelo próprio casal é
 * Fase 6, e depende de billing.
 */

/** Espelha o CHECK `casamentos_slug_formato_check`. */
const SLUG_FORMATO = /^[a-z0-9]+(-[a-z0-9]+)*$/

export const platformWeddingCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'O endereço precisa de pelo menos 3 caracteres.')
    .max(60, 'O endereço é longo demais.')
    .regex(SLUG_FORMATO, 'Use apenas letras minúsculas, números e hífen (ex.: ana-e-bruno).'),
  nomesNoivos: z
    .string()
    .trim()
    .min(3, 'Informe o nome do casal.')
    .max(120, 'O nome do casal é longo demais.'),
  dataEvento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data do evento.'),
  emailDono: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
})

export type PlatformWeddingCreateInput = z.infer<typeof platformWeddingCreateSchema>

/**
 * Edição pela ficha do casamento (docs/fase5-multievento.md 6.6). Todo campo é
 * opcional: a ficha salva um bloco de cada vez.
 *
 * `statusCicloVida` aceita só `arquivado` e `rascunho`, nunca `publicado` — pôr
 * um site no ar é decisão do casal, e desarquivar devolve para rascunho
 * justamente para não republicar por conta própria.
 */
export const platformWeddingPatchSchema = z
  .object({
    slug: platformWeddingCreateSchema.shape.slug.optional(),
    nomesNoivos: platformWeddingCreateSchema.shape.nomesNoivos.optional(),
    dataEvento: platformWeddingCreateSchema.shape.dataEvento.optional(),
    statusCicloVida: z.enum(['rascunho', 'arquivado']).optional(),
  })
  .refine((valores) => Object.values(valores).some((v) => v !== undefined), {
    message: 'Informe ao menos um campo para alterar.',
  })

export type PlatformWeddingPatchInput = z.infer<typeof platformWeddingPatchSchema>

/**
 * Vincular alguém a um casamento pela ficha.
 *
 * O operador está FORA da escada de papéis (`shared/papeis-de-membro.ts`): ela
 * descreve quem, dentro de um casamento, alcança quem — e a equipe interna não
 * é membro de casamento nenhum. Por isso qualquer papel é concedível aqui, e o
 * que continua valendo é a regra que impede o casamento de ficar órfão.
 */
export const platformMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.'),
  papel: z.enum(PAPEIS_DE_MEMBRO).default('colaborador'),
})

export type PlatformMemberInput = z.infer<typeof platformMemberSchema>
