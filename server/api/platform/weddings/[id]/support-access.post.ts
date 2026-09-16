import { HORAS_DE_ACESSO_DE_SUPORTE, validadeDoAcessoDeSuporte } from '#shared/acesso-de-suporte'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Abre um acesso de suporte ao painel de um casamento
 * (docs/fase5-multievento.md 6.7).
 *
 * O operador ganha um vínculo REAL em `membros_casamento`, com papel `dono` e
 * validade. A partir daí ele usa `/admin/{slug}` como qualquer membro — e é
 * esse "como qualquer membro" que torna o desenho confiável: nenhuma das 123
 * rotas que autorizam por RLS precisa saber que existe operador, e nenhuma
 * policy cross-tenant precisa existir (o que o CLAUDE.md seção 4.2 proíbe).
 *
 * O vínculo é **silencioso na tela do casal** por decisão de produto
 * (2026-09-15): `GET /api/wedding/members` o filtra, e ele não entra na
 * contagem de donos. Nunca é silencioso na trilha: conceder e encerrar ficam
 * registrados como `operador`, e o casal lê a própria trilha. Ocultar isso
 * também seria remover a accountability que torna a expiração verificável.
 *
 * Idempotente: pedir de novo renova a validade em vez de falhar por vínculo
 * duplicado — reabrir um atendimento é o caso normal.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const admin = supabaseAdmin(event)

  const { data: casamento, error: casamentoError } = await admin
    .from('casamentos')
    .select('id, slug')
    .eq('id', weddingId)
    .maybeSingle()

  if (casamentoError) throw badRequestError(casamentoError.message)
  if (!casamento) throw notFoundError('Casamento não encontrado.')

  // Higiene oportunista: linhas vencidas já não concedem nada (a expiração vale
  // na leitura, dentro de `is_membro_casamento`), mas não há motivo para
  // deixá-las acumulando. Sem cron próprio — o plano da hospedagem limita
  // quantos existem, e uma linha inerte não justifica um.
  await admin
    .from('membros_casamento')
    .delete()
    .not('acesso_suporte_expira_em', 'is', null)
    .lt('acesso_suporte_expira_em', new Date().toISOString())

  const expiraEm = validadeDoAcessoDeSuporte()

  const { data: existente } = await admin
    .from('membros_casamento')
    .select('id, acesso_suporte_expira_em')
    .eq('casamento_id', weddingId)
    .eq('usuario_id', operador!.sub)
    .maybeSingle()

  // Já é membro de verdade deste casamento (o operador também pode ser dono do
  // próprio casamento): não transforma o vínculo dele em acesso de suporte, e
  // não precisa de um — ele já entra.
  if (existente && existente.acesso_suporte_expira_em === null) {
    return { data: { slug: casamento.slug, expiraEm: null, jaEraMembro: true } }
  }

  if (existente) {
    const { error } = await admin
      .from('membros_casamento')
      .update({ acesso_suporte_expira_em: expiraEm, papel: 'dono' })
      .eq('id', existente.id)
    if (error) throw badRequestError(error.message)
  } else {
    const { error } = await admin.from('membros_casamento').insert({
      casamento_id: weddingId,
      usuario_id: operador!.sub,
      papel: 'dono',
      acesso_suporte_expira_em: expiraEm,
    })
    if (error) throw badRequestError(error.message)
  }

  await recordPlatformAuditLog(admin, weddingId, operador!.sub, {
    action: 'suporte.acesso_concedido',
    entityType: 'casamento',
    entityId: weddingId,
    metadata: { expira_em: expiraEm, horas: HORAS_DE_ACESSO_DE_SUPORTE },
  })

  return { data: { slug: casamento.slug, expiraEm, jaEraMembro: false } }
})
