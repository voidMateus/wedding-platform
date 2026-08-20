/**
 * Atalho por link/QR direto (CLAUDE.md, seção 12.1/14.3) — pula a busca por
 * nome e a confirmação leve, indo direto para a lista de convidados do
 * convite. Mesmo payload da confirmação leve da busca pública
 * (buildRsvpInvitePayload) para as duas telas renderizarem exatamente igual.
 */
export default defineEventHandler(async (event) => {
  const code = getRouterParam(event, 'code')
  if (!code) {
    throw badRequestError('Código não informado.')
  }

  const client = supabaseAdmin(event)
  const token = await resolveGuestToken(client, code)
  if (!token) {
    throw notFoundError('Link inválido ou expirado.')
  }

  await recordFirstAccessIfNeeded(client, token.weddingId, token.inviteId)
  issueRsvpSession(event, { weddingId: token.weddingId, inviteId: token.inviteId })

  return buildRsvpInvitePayload(client, token.weddingId, token.inviteId)
})
