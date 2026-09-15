import type { PlatformStorageTotals, PlatformWeddingOverview } from '~/types/platform'

/** Uma linha de `uso_de_storage_por_casamento()` — bytes, nunca megabytes. */
interface UsoDeStorage {
  casamento_id: string
  bytes: number
}

/**
 * Visão mínima entre tenants para a equipe da plataforma (docs/PLANO-SAAS.md,
 * Passo 8) -- contas/casamentos/uso/status num único payload. Só leitura:
 * nenhuma mutação nasce aqui, por isso não há nada para registrar em
 * trilha_auditoria (que hoje nem consegue representar um ator operador de
 * plataforma -- casamento_id é obrigatório e autor_id aponta pra
 * membros_casamento, ver comentário da migration).
 *
 * requirePlatformOperator() é o portão real -- depois dele, tudo usa
 * supabaseAdmin() (service_role) porque nenhuma policy de RLS hoje pode
 * expressar "qualquer tenant" (todas são por casamento_id/conta_id), mesmo
 * racional já usado em server/api/wedding/members/*.ts pro papel = dono.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)

  const admin = supabaseAdmin(event)

  const [weddingsResult, ownersResult, usersResult, guestsResult, storageResult] =
    await Promise.all([
      admin
        .from('casamentos')
        .select('id, slug, nomes_noivos, data_evento, status_ciclo_vida, created_at')
        .order('created_at', { ascending: false }),
      admin.from('membros_casamento').select('casamento_id, usuario_id').eq('papel', 'dono'),
      listarTodosUsuarios(admin),
      admin
        .from('convidados')
        .select('id, casamento_id')
        .is('excluido_em', null)
        // Rascunho da lista não é convidado — o porte do casamento visto pela
        // plataforma tem que casar com o que o casal vê no próprio painel.
        .eq('em_consideracao', false),
      // Storage MEDIDO, nunca contado por gatilho (docs/fase5-multievento.md
      // 8.2): uma ida ao banco por leitura do painel interno, que é interna, de
      // baixa frequência, e quer o número de agora.
      admin.rpc('uso_de_storage_por_casamento'),
    ])

  if (weddingsResult.error) throw badRequestError(weddingsResult.error.message)
  if (storageResult.error) throw badRequestError(storageResult.error.message)
  if (ownersResult.error) throw badRequestError(ownersResult.error.message)
  if (guestsResult.error) throw badRequestError(guestsResult.error.message)

  const weddings = weddingsResult.data ?? []
  const owners = ownersResult.data ?? []
  const guests = guestsResult.data ?? []

  const emailByUserId = new Map(usersResult.map((u) => [u.id, u.email ?? '']))

  const donoEmailsByWedding = new Map<string, string[]>()
  for (const owner of owners) {
    const list = donoEmailsByWedding.get(owner.casamento_id) ?? []
    list.push(emailByUserId.get(owner.usuario_id) ?? owner.usuario_id)
    donoEmailsByWedding.set(owner.casamento_id, list)
  }

  const storageByWedding = new Map<string, number>(
    ((storageResult.data ?? []) as UsoDeStorage[]).map((linha) => [
      linha.casamento_id,
      Number(linha.bytes),
    ]),
  )

  const guestCountByWedding = new Map<string, number>()
  for (const guest of guests) {
    guestCountByWedding.set(
      guest.casamento_id,
      (guestCountByWedding.get(guest.casamento_id) ?? 0) + 1,
    )
  }

  const data: PlatformWeddingOverview[] = weddings.map((wedding) => ({
    id: wedding.id,
    slug: wedding.slug,
    nomesNoivos: wedding.nomes_noivos,
    dataEvento: wedding.data_evento,
    statusCicloVida: wedding.status_ciclo_vida as PlatformWeddingOverview['statusCicloVida'],
    createdAt: wedding.created_at,
    donoEmails: donoEmailsByWedding.get(wedding.id) ?? [],
    contagemConvidados: guestCountByWedding.get(wedding.id) ?? 0,
    storageBytes: storageByWedding.get(wedding.id) ?? 0,
  }))

  // O total da plataforma soma TODOS os objetos contabilizados, inclusive os de
  // casamentos já excluídos cujos arquivos ainda não foram varridos — é a conta
  // do que ocupa disco, não a soma das linhas exibidas.
  const totais: PlatformStorageTotals = {
    storageBytes: ((storageResult.data ?? []) as UsoDeStorage[]).reduce(
      (soma, linha) => soma + Number(linha.bytes),
      0,
    ),
  }

  return { data, totais }
})
