import { z } from 'zod'

/**
 * Detalhes de um lugar escolhido no autocomplete — nome, endereço formatado,
 * coordenadas e URL oficial. É aqui que a latitude/longitude entra no sistema
 * sem ninguém digitar nada (CLAUDE.md, seção 12).
 *
 * Mesmo portão do autocomplete: caminho administrativo, chave do provedor
 * nunca sai do servidor.
 */

const querySchema = z.object({
  /** O mesmo token usado nas chamadas de autocomplete que levaram a esta escolha — fecha a sessão de cobrança. */
  sessionToken: z.string().trim().uuid('Sessão de busca inválida.'),
})

export default defineEventHandler(async (event) => {
  const { memberId } = await requireWeddingContext(event)

  const placeId = getRouterParam(event, 'placeId')
  if (!placeId) {
    throw badRequestError('Identificação do lugar não informada.')
  }

  const provider = resolvePlacesProvider()
  if (!provider) {
    throw createError({
      statusCode: 503,
      message: 'A busca de locais não está configurada. Cadastre o endereço manualmente.',
    })
  }

  const { sessionToken } = validateQuery(event, querySchema)

  const rateLimit = await checkPlacesRateLimit(memberId)
  if (!rateLimit.success) {
    throw createError({
      statusCode: 429,
      message: 'Muitas buscas seguidas. Aguarde alguns segundos e tente novamente.',
    })
  }

  const result = await provider.details({ placeId, sessionToken })
  if (!result.ok) {
    throw createError({
      statusCode: 502,
      message: 'Não foi possível carregar o local agora. Tente de novo ou cadastre manualmente.',
    })
  }
  if (!result.data) {
    throw notFoundError('Local não encontrado. Escolha outro ou cadastre manualmente.')
  }

  return { data: result.data, provider: provider.id }
})
