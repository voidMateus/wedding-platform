// Cron de sincronização da galeria (Fase Galeria via Google Drive — CLAUDE.md).
// Vercel Cron (vercel.json, 1x/dia no plano free) chama este endpoint enviando
// `Authorization: Bearer $CRON_SECRET` automaticamente. Sem sessão de usuário:
// autoriza pelo segredo e roda com service_role.
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const authHeader = getRequestHeader(event, 'authorization')
  if (!config.cronSecret || authHeader !== `Bearer ${config.cronSecret}`) {
    throw unauthorizedError('Cron não autorizado.')
  }

  const admin = supabaseAdmin(event)
  // Pula 'reautenticacao_necessaria' — depende de o casal reconectar, não se
  // resolve sozinho num sync automático.
  const { data: connections, error } = await admin
    .from('conexoes_galeria')
    .select('*')
    .neq('status_conexao', 'reautenticacao_necessaria')

  if (error) {
    throw badRequestError(error.message)
  }

  let synced = 0
  let failed = 0
  for (const connection of connections ?? []) {
    try {
      const result = await syncGalleryConnection(admin, connection)
      if (result.ok) {
        synced += 1
      } else {
        failed += 1
      }
    } catch (err) {
      failed += 1
      console.error('[cron:sync-galleries] falha inesperada', connection.id, err)
    }
  }

  return { total: connections?.length ?? 0, synced, failed }
})
