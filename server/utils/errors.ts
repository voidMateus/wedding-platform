/**
 * Vocabulário mínimo de erros de domínio, mapeado para status HTTP de forma
 * consistente (docs/ARCHITECTURE.md, seção 3.3/3.5). Funções fábrica em vez
 * de uma hierarquia de classes — mais simples e suficiente para o que os
 * handlers precisam hoje; cresce quando um caso de uso genuíno pedir mais.
 */

export function unauthorizedError(message = 'Sessão inválida ou expirada.') {
  return createError({ statusCode: 401, message })
}

export function forbiddenError(message = 'Você não tem permissão para esta ação.') {
  return createError({ statusCode: 403, message })
}

export function notFoundError(message = 'Recurso não encontrado.') {
  return createError({ statusCode: 404, message })
}

export function badRequestError(message: string) {
  return createError({ statusCode: 400, message })
}

export function conflictError(message: string, data?: Record<string, unknown>) {
  return createError({ statusCode: 409, message, data })
}
