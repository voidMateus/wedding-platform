import { platformWeddingPatchSchema } from '#shared/schemas/platform-wedding'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Edita um casamento pela ficha do painel interno
 * (docs/fase5-multievento.md 6.6).
 *
 * ## O que NÃO dá para fazer daqui, e por quê
 *
 * **Publicar.** `statusCicloVida` aceita `arquivado` e `rascunho`, nunca
 * `publicado`: pôr o site de um casal no ar é decisão dele, e a plataforma que
 * cria o evento é a mesma que não o divulga (CLAUDE.md, seção 12). Pelo mesmo
 * motivo **desarquivar devolve para rascunho** — restaurar direto para
 * `publicado` seria a equipe interna republicando um site por conta própria.
 * O casal republica com um clique no próprio painel.
 *
 * ## Trocar o slug quebra link já compartilhado
 *
 * O link do convidado é `/{slug}/rsvp/{código}`, então trocar o endereço
 * invalida todo convite enviado e todo QR impresso — o mesmo motivo pelo qual
 * o envio nunca rotaciona a credencial que já existe. A decisão (2026-09-15)
 * é **permitir com aviso**, não bloquear: quem opera aqui é equipe treinada, e
 * às vezes o endereço está errado mesmo depois do envio. O aviso é da tela; o
 * que o servidor garante é que o estrago fica registrado — a metadata do
 * registro carrega o slug velho, o novo e quantos convites já tinham saído.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const input = await validateBody(event, platformWeddingPatchSchema)
  const admin = supabaseAdmin(event)

  const { data: atual, error: atualError } = await admin
    .from('casamentos')
    .select('slug, nomes_noivos, data_evento, status_ciclo_vida')
    .eq('id', weddingId)
    .maybeSingle()

  if (atualError) throw badRequestError(atualError.message)
  if (!atual) throw notFoundError('Casamento não encontrado.')

  const patch: Record<string, string | null> = {}
  if (input.nomesNoivos !== undefined) patch.nomes_noivos = input.nomesNoivos
  if (input.dataEvento !== undefined) patch.data_evento = input.dataEvento

  if (input.slug !== undefined && input.slug !== atual.slug) {
    const { data: reservado, error: reservadoError } = await admin.rpc('is_slug_reservado', {
      p_slug: input.slug,
    })
    if (reservadoError) throw badRequestError(reservadoError.message)
    if (reservado) throw conflictError('Este endereço é reservado pela plataforma.')

    patch.slug = input.slug
  }

  if (input.statusCicloVida !== undefined) {
    patch.status_ciclo_vida = input.statusCicloVida
    // `arquivado_em` é o par da coluna de status desde a migration que a criou:
    // arquivar carimba, desarquivar limpa.
    patch.arquivado_em = input.statusCicloVida === 'arquivado' ? new Date().toISOString() : null
  }

  const { data: atualizado, error } = await admin
    .from('casamentos')
    .update(patch)
    .eq('id', weddingId)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw conflictError('Já existe um casamento com este endereço.')
    }
    throw badRequestError(error.message)
  }

  // Quantos convites já tinham saído: sem esse número, "o slug mudou" não diz
  // se alguma coisa quebrou junto.
  let convitesEnviados: number | undefined
  if (patch.slug) {
    const { count } = await admin
      .from('comunicacoes')
      .select('id', { count: 'exact', head: true })
      .eq('casamento_id', weddingId)
      .eq('tipo', 'convite')
    convitesEnviados = count ?? 0
  }

  await recordPlatformAuditLog(admin, weddingId, operador!.sub, {
    action: 'casamento.editar',
    entityType: 'casamento',
    entityId: weddingId,
    metadata: {
      campos: Object.keys(patch),
      ...(patch.slug ? { slug_anterior: atual.slug, slug_novo: patch.slug, convitesEnviados } : {}),
      ...(patch.status_ciclo_vida
        ? { status_anterior: atual.status_ciclo_vida, status_novo: patch.status_ciclo_vida }
        : {}),
    },
  })

  return { data: atualizado }
})
