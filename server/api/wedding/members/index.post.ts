import { podeGerenciarPapel, rotuloDoPapel } from '#shared/papeis-de-membro'
import { weddingMemberInviteSchema } from '#shared/schemas/wedding-members'

/**
 * Convida um membro para o casamento ativo (docs/PLANO-SAAS.md, Passo 3).
 *
 * Quem pode convidar quem é a escada de papéis, nunca uma comparação escrita
 * à mão aqui (docs/fase5-multievento.md 4.5): `podeGerenciarPapel()` é a
 * única autoridade, e é ela que garante de graça que ninguém se promova — o
 * papel concedido também precisa ser alcançável por quem concede.
 *
 * Checado aqui em TypeScript, não só via RLS (fecha o achado do PRODUCT.md
 * §7.3): este endpoint precisa do client service_role pra criar/consultar
 * usuários em auth.users, que ignora RLS por completo — sem essa checagem
 * explícita, qualquer colaborador autenticado poderia convidar outros.
 *
 * Usa o convite nativo por e-mail do Supabase Auth (envia e-mail de verdade
 * via o provedor configurado no projeto) — não existe sistema de
 * comunicação próprio ainda (Fase 2, docs/ARCHITECTURE.md §3.4).
 */
export default defineEventHandler(async (event) => {
  const context = await requireWeddingContext(event)
  const input = await validateBody(event, weddingMemberInviteSchema)

  if (!podeGerenciarPapel(context.role, input.papel)) {
    throw forbiddenError(
      `Seu papel neste casamento não permite convidar alguém como ${rotuloDoPapel(input.papel)}.`,
    )
  }

  const admin = supabaseAdmin(event)

  const userId = await resolverOuConvidarUsuario(admin, input.email)

  const { data: membership, error: memberError } = await admin
    .from('membros_casamento')
    .insert({ casamento_id: context.weddingId, usuario_id: userId, papel: input.papel })
    .select()
    .single()

  if (memberError) {
    if (memberError.code === '23505') {
      throw conflictError('Este e-mail já é membro deste casamento.')
    }
    throw badRequestError(memberError.message)
  }

  await recordAuditLog(event, context.weddingId, context.memberId, {
    action: 'wedding_member.invite',
    entityType: 'wedding_member',
    entityId: membership.id,
    metadata: { email: input.email, papel: input.papel },
  })

  setResponseStatus(event, 201)
  return membership
})
