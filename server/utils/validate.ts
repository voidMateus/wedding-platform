import type { H3Event } from 'h3'
import type { z, ZodTypeAny } from 'zod'

/**
 * `z.output<S>` em vez de um `ZodType<T>` genérico: quando entrada e saída do
 * schema divergem — um `.default()`, uma coerção de string para número, um
 * `.refine()` que embrulha o objeto em `ZodEffects` — a inferência a partir de
 * `ZodType<T>` pode fixar T no tipo de *entrada*, e o handler passa a receber
 * um tipo que promete menos do que o `parse` realmente devolveu (campo com
 * default aparecendo como possivelmente `undefined`). Amarrar em `z.output`
 * remove a ambiguidade.
 */

/** Valida o body da requisição contra um schema Zod compartilhado (CLAUDE.md, seção 8/20.1). */
export async function validateBody<S extends ZodTypeAny>(
  event: H3Event,
  schema: S,
): Promise<z.output<S>> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw badRequestError(result.error.issues.map((issue) => issue.message).join('; '))
  }
  return result.data
}

/** Valida a query string da requisição contra um schema Zod. */
export function validateQuery<S extends ZodTypeAny>(event: H3Event, schema: S): z.output<S> {
  const query = getQuery(event)
  const result = schema.safeParse(query)
  if (!result.success) {
    throw badRequestError(result.error.issues.map((issue) => issue.message).join('; '))
  }
  return result.data
}
