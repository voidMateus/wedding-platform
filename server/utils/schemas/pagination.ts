import { z } from 'zod'

const MAX_PAGE_SIZE = 100

/**
 * Campos page/pageSize compartilhados pelas rotas de listagem paginada
 * (guests, invites, groups). O default de pageSize varia por rota — grupos
 * usa 100 (lista curta tipo "tag", telas hoje sempre pedem a lista inteira),
 * guests/invites usam 25 (listagem de verdade, paginada).
 */
export function paginationQuerySchema(defaultPageSize: number) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(defaultPageSize),
  })
}
