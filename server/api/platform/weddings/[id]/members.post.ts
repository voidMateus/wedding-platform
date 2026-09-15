import { platformMemberSchema } from '#shared/schemas/platform-wedding'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Vincula alguém a um casamento pela ficha do painel interno
 * (docs/fase5-multievento.md 6.6).
 *
 * É o caminho de suporte que não existia: e-mail digitado errado na criação,
 * casal que perdeu o acesso, assessoria a vincular. Antes disso, a única saída
 * era um `INSERT` à mão em `membros_casamento`.
 *
 * **A escada de papéis não se aplica ao operador**, e isso é decisão, não
 * esquecimento: ela descreve quem, DENTRO de um casamento, alcança quem — e a
 * equipe interna não é membro de casamento nenhum, está fora dela. Por isso
 * qualquer papel é concedível daqui. O que continua valendo é a regra que
 * impede o casamento de ficar órfão, no endpoint de remoção.
 *
 * Como em toda criação de acesso, o usuário é resolvido FORA de qualquer
 * transação — `inviteUserByEmail` dispara um e-mail que não volta atrás.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const input = await validateBody(event, platformMemberSchema)
  const admin = supabaseAdmin(event)

  const { data: casamento, error: casamentoError } = await admin
    .from('casamentos')
    .select('id')
    .eq('id', weddingId)
    .maybeSingle()

  if (casamentoError) throw badRequestError(casamentoError.message)
  if (!casamento) throw notFoundError('Casamento não encontrado.')

  const usuarioId = await resolverOuConvidarUsuario(admin, input.email)

  const { data: membro, error } = await admin
    .from('membros_casamento')
    .insert({ casamento_id: weddingId, usuario_id: usuarioId, papel: input.papel })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Esta pessoa já tem acesso a este casamento.')
    }
    throw badRequestError(error.message)
  }

  await recordPlatformAuditLog(admin, weddingId, operador!.sub, {
    action: 'wedding_member.invite',
    entityType: 'wedding_member',
    entityId: membro.id,
    metadata: { email: input.email, papel: input.papel },
  })

  setResponseStatus(event, 201)
  return { data: membro }
})
