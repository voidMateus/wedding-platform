import { serverSupabaseClient } from '#supabase/server'
import { guestAccessTokenGenerateSchema } from '#shared/schemas/guest-access-tokens'

/**
 * Gera um novo código de acesso para um convite (CLAUDE.md, seção
 * 14.5/19.2 — "Convites e Comunicações"). Se já existir um token ativo para
 * o mesmo convite, ele é revogado antes — só um token ativo por convite por
 * vez (índice único parcial em credenciais_acesso_convite).
 *
 * Por isso esta rota é ação deliberada de rotação ("o link vazou"), não o
 * caminho para reenviar um convite: reenviar usa o GET, que reexibe o mesmo
 * link. Gerar aqui invalida o link e o QR já compartilhados.
 *
 * O código é gravado duas vezes, nunca em texto plano (CLAUDE.md, seção 11):
 * `codigo_hash` (SHA-256) é o que autentica o convidado, e `codigo_cifrado`
 * (AES-256-GCM) existe só para o painel reexibir o link/QR depois.
 */
export default defineEventHandler(async (event) => {
  const { weddingId, memberId } = await requireWeddingContext(event)
  const input = await validateBody(event, guestAccessTokenGenerateSchema)

  const client = await serverSupabaseClient(event)

  const { data: invite, error: inviteError } = await client
    .from('convites')
    .select('id')
    .eq('id', input.conviteId)
    .eq('casamento_id', weddingId)
    .is('excluido_em', null)
    .maybeSingle()

  if (inviteError) {
    throw badRequestError(inviteError.message)
  }
  if (!invite) {
    throw notFoundError('Convite não encontrado.')
  }

  const { error: revokeError } = await client
    .from('credenciais_acesso_convite')
    .update({ revogado_em: new Date().toISOString() })
    .eq('casamento_id', weddingId)
    .eq('convite_id', input.conviteId)
    .is('revogado_em', null)

  if (revokeError) {
    throw badRequestError(revokeError.message)
  }

  const code = generateAccessCode()
  const codigoCifrado = encryptOrFailLoudly(code)

  const { data, error } = await client
    .from('credenciais_acesso_convite')
    .insert({
      casamento_id: weddingId,
      convite_id: input.conviteId,
      codigo_hash: hashAccessCode(code),
      codigo_cifrado: codigoCifrado,
    })
    .select()
    .single()

  if (error) {
    throw badRequestError(error.message)
  }

  await client.from('historico_convite').insert({
    casamento_id: weddingId,
    convite_id: input.conviteId,
    tipo_evento: 'token.generated',
    metadados: { source: 'admin_panel' },
  })

  await recordAuditLog(event, weddingId, memberId, {
    action: 'guest_access_token.generate',
    entityType: 'guest_access_token',
    entityId: data.id,
    metadata: { inviteId: input.conviteId },
  })

  setResponseStatus(event, 201)
  return {
    id: data.id,
    code,
    inviteId: data.convite_id,
    createdAt: data.created_at,
  }
})

/**
 * Falha dura, deliberada: sem `ACCESS_CODE_ENCRYPTION_KEY` a rota recusa gerar
 * o código em vez de gravar `codigo_cifrado` nulo e seguir. Um fallback
 * silencioso produziria credenciais que nunca poderão ser reexibidas — o
 * casal só descobriria na hora de reenviar o convite, e a rotação da chave
 * deixaria de ser uma operação controlada (o sistema rodaria meio cifrado,
 * meio não). Mesmo contrato de DRIVE_TOKEN_ENCRYPTION_KEY.
 *
 * O log distingue as duas causas porque a correção é diferente: env ausente é
 * provisionamento (adicionar a variável no ambiente), env malformada é a chave
 * errada (32 bytes em hex de 64 chars ou base64). Nunca inclui o código nem a
 * chave.
 */
function encryptOrFailLoudly(code: string): string {
  try {
    return encryptAccessCode(code)
  } catch (cause) {
    console.error(
      '[guest-access-tokens] ACCESS_CODE_ENCRYPTION_KEY ausente ou malformada — geração de link recusada. Configure a variável no ambiente do servidor (32 bytes, hex de 64 chars ou base64).',
      cause instanceof Error ? cause.message : cause,
    )
    throw createError({
      statusCode: 500,
      statusMessage: 'Configuração de cifra ausente no servidor.',
      message: 'Não foi possível gerar o link agora. A equipe já foi notificada.',
    })
  }
}
