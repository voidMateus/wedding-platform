export interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

export function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

/** Mensagem de erro de uma chamada de API, com fallback quando o servidor não devolve `data.message`. */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  return isApiError(err) ? (err.data?.message ?? fallback) : fallback
}
