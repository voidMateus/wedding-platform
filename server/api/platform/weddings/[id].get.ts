import type { PlatformWeddingDetail } from '~/types/platform'

/**
 * A ficha de um casamento no painel interno
 * (docs/fase5-multievento.md 6.6).
 *
 * Rota própria, e não mais campos na linha da tabela, pelo mesmo motivo que a
 * ficha do gasto é uma página no Financeiro: o que a equipe precisa saber
 * sobre um evento — quem tem acesso, que porte tem, o que já foi feito nele —
 * não cabe numa célula, e espremer isso na listagem transformaria a mesa de
 * trabalho num formulário.
 *
 * Leitura pura. `requirePlatformOperator()` é o portão real; depois dele tudo
 * é `service_role`, porque nenhuma policy consegue expressar "qualquer tenant"
 * (CLAUDE.md 4.2).
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)

  const weddingId = getRouterParam(event, 'id')
  if (!weddingId) {
    throw badRequestError('id do casamento não informado.')
  }

  const admin = supabaseAdmin(event)

  const [casamento, membros, convidados, enviados, credenciais, trilha, storage] =
    await Promise.all([
      admin.from('casamentos').select('*').eq('id', weddingId).maybeSingle(),
      admin
        .from('membros_casamento')
        .select('id, usuario_id, papel, created_at')
        .eq('casamento_id', weddingId),
      admin
        .from('convidados')
        .select('id', { count: 'exact', head: true })
        .eq('casamento_id', weddingId)
        .is('excluido_em', null)
        .eq('em_consideracao', false),
      // Quantos convites JÁ SAÍRAM — é o número que decide se trocar o slug
      // quebra alguma coisa (6.6.1), e por isso vem para a tela.
      admin
        .from('comunicacoes')
        .select('id', { count: 'exact', head: true })
        .eq('casamento_id', weddingId)
        .eq('tipo', 'convite'),
      admin
        .from('credenciais_acesso_convite')
        .select('id', { count: 'exact', head: true })
        .eq('casamento_id', weddingId)
        .is('revogado_em', null),
      admin
        .from('trilha_auditoria')
        .select('id, acao, tipo_autor, tipo_entidade, created_at')
        .eq('casamento_id', weddingId)
        .order('created_at', { ascending: false })
        .limit(20),
      admin.rpc('uso_de_storage_por_casamento'),
    ])

  if (casamento.error) throw badRequestError(casamento.error.message)
  if (!casamento.data) throw notFoundError('Casamento não encontrado.')
  if (membros.error) throw badRequestError(membros.error.message)

  const usuarios = await listarTodosUsuarios(admin)
  const emailPorUsuario = new Map(usuarios.map((u) => [u.id, u.email ?? '']))

  const bytes =
    ((storage.data ?? []) as { casamento_id: string; bytes: number }[]).find(
      (linha) => linha.casamento_id === weddingId,
    )?.bytes ?? 0

  const detalhe: PlatformWeddingDetail = {
    id: casamento.data.id,
    slug: casamento.data.slug,
    nomesNoivos: casamento.data.nomes_noivos,
    dataEvento: casamento.data.data_evento,
    statusCicloVida: casamento.data.status_ciclo_vida as PlatformWeddingDetail['statusCicloVida'],
    createdAt: casamento.data.created_at,
    contagemConvidados: convidados.count ?? 0,
    storageBytes: Number(bytes),
    convitesEnviados: enviados.count ?? 0,
    credenciaisAtivas: credenciais.count ?? 0,
    membros: (membros.data ?? []).map((membro) => ({
      id: membro.id,
      email: emailPorUsuario.get(membro.usuario_id) ?? membro.usuario_id,
      papel: membro.papel as PlatformWeddingDetail['membros'][number]['papel'],
      desde: membro.created_at,
    })),
    trilha: (trilha.data ?? []).map((linha) => ({
      id: linha.id,
      acao: linha.acao,
      tipoAutor: linha.tipo_autor as PlatformWeddingDetail['trilha'][number]['tipoAutor'],
      tipoEntidade: linha.tipo_entidade,
      createdAt: linha.created_at,
    })),
  }

  return { data: detalhe }
})
