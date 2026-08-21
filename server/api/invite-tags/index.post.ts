import { serverSupabaseClient } from '#supabase/server'
import { inviteTagInputSchema } from '#shared/schemas/invites'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)
  const input = await validateBody(event, inviteTagInputSchema)

  const client = await serverSupabaseClient(event)

  const { data, error } = await client
    .from('etiquetas_convite')
    .insert({ casamento_id: weddingId, nome: input.nome })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Já existe uma etiqueta com este nome.')
    }
    throw badRequestError(error.message)
  }

  setResponseStatus(event, 201)
  return data
})
