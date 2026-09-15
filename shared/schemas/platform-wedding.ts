import { z } from 'zod'

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
