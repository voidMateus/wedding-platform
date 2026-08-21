import { serverSupabaseClient } from '#supabase/server'

// Colunas seguras: NUNCA retorna as de token (access/refresh cifrados) ao
// client — a tabela guarda segredo, mesma disciplina de pagamentos_presentes
// (CLAUDE.md, seção 28).
const SAFE_COLUMNS =
  'id, provedor, modo, id_pasta, nome_pasta, status_conexao, ultima_sincronizacao_em, ultimo_erro_sincronizacao, ultima_contagem_fotos, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const { weddingId } = await requireWeddingContext(event)

  const client = await serverSupabaseClient(event)
  const { data, error } = await client
    .from('conexoes_galeria')
    .select(SAFE_COLUMNS)
    .eq('casamento_id', weddingId)
    .maybeSingle()

  if (error) {
    throw badRequestError(error.message)
  }

  return { connection: data ?? null }
})
