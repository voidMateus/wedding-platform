import { serverSupabaseClient } from '#supabase/server'

// Sem autenticação e sem token de convidado — o site público é acessível a
// qualquer pessoa com o link (CLAUDE.md, seções 1/20/26). O client aqui usa
// a anon key (não service_role); o isolamento de leitura é garantido pela
// policy `weddings_select_public` (supabase/migrations/20260731100001).
export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const { data, error } = await client.from('weddings').select('*').limit(1).single()

  if (error) {
    throw notFoundError('Casamento não encontrado.')
  }

  return data
})
