import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

/** Valida o body da requisição contra um schema Zod compartilhado (CLAUDE.md, seção 8/20.1). */
export async function validateBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw badRequestError(result.error.issues.map((issue) => issue.message).join('; '))
  }
  return result.data
}

/** Valida a query string da requisição contra um schema Zod. */
export function validateQuery<T>(event: H3Event, schema: ZodType<T>): T {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    throw badRequestError(result.error.issues.map((issue) => issue.message).join('; '))
  }
  return result.data
}
