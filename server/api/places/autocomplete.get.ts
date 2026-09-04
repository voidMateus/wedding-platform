import { z } from 'zod'

/**
 * Autocomplete de lugares para o cadastro de local do cronograma.
 *
 * Caminho administrativo (CLAUDE.md, seção 4.2): exige sessão autenticada.
 * Não toca em nenhuma tabela — o `requireWeddingContext` aqui não é sobre
 * isolamento de dados, é o portão que impede um visitante anônimo de usar a
 * cota paga do provedor como se fosse uma API pública nossa.
 */

const MIN_QUERY_LENGTH = 3

const querySchema = z.object({
  // Abaixo de 3 caracteres o provedor devolve ruído (toda rua do país) e a
  // requisição é cobrada igual — o corte acontece aqui e também no client.
  q: z.string().trim().min(MIN_QUERY_LENGTH, 'Digite ao menos 3 caracteres.').max(200),
  /** Emitido pelo client e repetido em toda a sessão de digitação até a escolha (ver places-provider.ts). */
  sessionToken: z.string().trim().uuid('Sessão de busca inválida.'),
})

export default defineEventHandler(async (event) => {
  const { memberId } = await requireWeddingContext(event)

  const provider = resolvePlacesProvider()
  if (!provider) {
    throw createError({
      statusCode: 503,
      message: 'A busca de locais não está configurada. Cadastre o endereço manualmente.',
    })
  }

  const { q, sessionToken } = validateQuery(event, querySchema)

  const rateLimit = await checkPlacesRateLimit(memberId)
  if (!rateLimit.success) {
    throw createError({
      statusCode: 429,
      message: 'Muitas buscas seguidas. Aguarde alguns segundos e tente novamente.',
    })
  }

  const result = await provider.autocomplete({ query: q, sessionToken })
  if (!result.ok) {
    // Falha do provedor não é erro do casal: a UI trata como "nenhum
    // resultado" e oferece o cadastro manual, que é o caminho que não depende
    // de terceiro nenhum (CLAUDE.md, seção 12).
    throw createError({
      statusCode: 502,
      message: 'Não foi possível buscar locais agora. Tente de novo ou cadastre manualmente.',
    })
  }

  return { data: result.data, provider: provider.id }
})
