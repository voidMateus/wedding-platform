import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import { createTestGuest } from '../../factories/guest'
import { createTestInvite } from '../../factories/invite'

/**
 * Integração — API administrativa (docs/ARCHITECTURE.md, seção 9.1/9.7):
 * caminho feliz + erro de domínio por endpoint de mutação. Bate via HTTP
 * real no servidor de build (tests/integration/global-setup.ts), com uma
 * sessão administrativa real (tests/integration/helpers/admin-session.ts).
 *
 * Cobre PUT /api/guests/party, POST /api/guests/party/group e
 * DELETE /api/guests/[id].
 */
describe('api: PUT /api/guests/party', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  it('caminho feliz: cria o convidado principal escopado ao próprio casamento do usuário autenticado', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Fulano da Silva' },
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.primaryGuestId).toBeTruthy()

    const { data: stored } = await admin
      .from('convidados')
      .select('*')
      .eq('id', body.primaryGuestId)
      .single()
    expect(stored?.casamento_id).toBe(wedding.id)
    expect(stored?.nome_completo).toBe('Fulano da Silva')
  })

  it('erro de domínio: nomeCompleto vazio é rejeitado com 400, nenhuma linha é criada', async () => {
    const client = createTestApiClient({ cookie })
    const { count: before } = await admin
      .from('convidados')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)

    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: '' },
    })
    expect(res.status).toBe(400)

    const { count: after } = await admin
      .from('convidados')
      .select('*', { count: 'exact', head: true })
      .eq('casamento_id', wedding.id)
    expect(after).toBe(before)
  })

  it('erro de domínio: valor inválido de sexo é rejeitado com 400', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Fulano Inválido', sexo: 'invalido' },
    })
    expect(res.status).toBe(400)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.put('/api/guests/party', { primary: { nomeCompleto: 'Sem Sessão' } })
    expect(res.status).toBe(401)
  })
})

/**
 * Substitui a suíte de `PATCH /api/guests/party/reorder`, endpoint removido:
 * ele nunca teve chamador, porque a ordem do núcleo sempre foi gravada pelo
 * próprio cadastro (`PUT /api/guests/party`, com `primaryPosition`).
 *
 * O que estes testes guardam é PL/pgSQL — `agrupar_acompanhantes()` e a
 * dissolução em `normalizar_nucleo_acompanhantes()` —, então a asserção é
 * sempre o estado do banco depois da requisição, nunca só o código HTTP.
 */
describe('api: POST /api/guests/party/group', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  async function createTestParty(casamentoId: string, nomes: string[]) {
    const { data: party, error } = await admin
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: casamentoId })
      .select()
      .single()
    if (error || !party) throw new Error(`Falha ao criar núcleo de teste: ${error?.message}`)

    const members = []
    for (const [index, nome_completo] of nomes.entries()) {
      members.push(
        await createTestGuest(admin, casamentoId, {
          nome_completo,
          nucleo_id: party.id,
          ordem_nucleo: index,
        }),
      )
    }
    return { party, members }
  }

  async function lerNucleo(guestId: string) {
    const { data } = await admin
      .from('convidados')
      .select('nucleo_id, ordem_nucleo, convite_id')
      .eq('id', guestId)
      .single()
    return data
  }

  it('caminho feliz: dois convidados soltos passam a compartilhar um núcleo, em posições distintas', async () => {
    const ana = await createTestGuest(admin, wedding.id, { nome_completo: 'Ana Solta' })
    const bruno = await createTestGuest(admin, wedding.id, { nome_completo: 'Bruno Solto' })

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', { ids: [ana.id, bruno.id] })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.partyId).toBeTruthy()
    expect(body.guestIds).toHaveLength(2)

    const [depoisAna, depoisBruno] = await Promise.all([lerNucleo(ana.id), lerNucleo(bruno.id)])
    expect(depoisAna?.nucleo_id).toBe(body.partyId)
    expect(depoisBruno?.nucleo_id).toBe(body.partyId)
    // Posições densas e distintas: é o índice único (nucleo_id, ordem_nucleo).
    expect([depoisAna?.ordem_nucleo, depoisBruno?.ordem_nucleo].sort()).toEqual([0, 1])
  })

  it('quem já está num núcleo entra trazendo o núcleo inteiro', async () => {
    // Agrupar o João (que já vem com a Maria) com o Pedro resulta no trio: o
    // agrupamento não pode afastar a Maria do João.
    const { party, members } = await createTestParty(wedding.id, ['Joao Par', 'Maria Par'])
    const [joao, maria] = members
    const pedro = await createTestGuest(admin, wedding.id, { nome_completo: 'Pedro Terceiro' })

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', { ids: [joao!.id, pedro.id] })
    expect(res.status).toBe(200)

    const body = await res.json()
    // O núcleo que já existia é o que sobrevive — o maior entre os envolvidos.
    expect(body.partyId).toBe(party.id)
    expect(body.guestIds).toHaveLength(3)

    const depoisMaria = await lerNucleo(maria!.id)
    expect(depoisMaria?.nucleo_id).toBe(party.id)
    const depoisPedro = await lerNucleo(pedro.id)
    expect(depoisPedro?.nucleo_id).toBe(party.id)
  })

  it('funde dois núcleos num só e apaga o núcleo que sobrou vazio', async () => {
    const grande = await createTestParty(wedding.id, ['Fusao A1', 'Fusao A2', 'Fusao A3'])
    const pequeno = await createTestParty(wedding.id, ['Fusao B1', 'Fusao B2'])

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', {
      ids: [grande.members[0]!.id, pequeno.members[0]!.id],
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.partyId).toBe(grande.party.id)
    expect(body.guestIds).toHaveLength(5)

    // A linha do núcleo esvaziado é apagada, não deixada para trás: nada no
    // código antes disto nunca apagou uma linha de `nucleos_acompanhantes`.
    const { data: orfao } = await admin
      .from('nucleos_acompanhantes')
      .select('id')
      .eq('id', pequeno.party.id)
      .maybeSingle()
    expect(orfao).toBeNull()

    const { data: doNucleo } = await admin
      .from('convidados')
      .select('id, ordem_nucleo')
      .eq('nucleo_id', grande.party.id)
      .order('ordem_nucleo', { ascending: true })
    expect(doNucleo?.map((g) => g.ordem_nucleo)).toEqual([0, 1, 2, 3, 4])
  })

  it('quem não tem convite entra no convite de quem tem — núcleo vive num convite só', async () => {
    const invite = await createTestInvite(admin, wedding.id, { nome: 'Convite do Agrupamento' })
    const comConvite = await createTestGuest(admin, wedding.id, {
      nome_completo: 'Com Convite',
      convite_id: invite.id,
    })
    const semConvite = await createTestGuest(admin, wedding.id, { nome_completo: 'Sem Convite' })

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', {
      ids: [comConvite.id, semConvite.id],
    })
    expect(res.status).toBe(200)

    const depois = await lerNucleo(semConvite.id)
    expect(depois?.convite_id).toBe(invite.id)
  })

  it('erro de domínio: recusa seleção com convites diferentes, sem mover ninguém', async () => {
    // A regra de produto: se vão em convites diferentes, deixaram de ser
    // "convidados juntos". Mover alguém de convite trocaria o link/QR já
    // compartilhado, então a operação é recusada em vez de resolvida.
    const conviteA = await createTestInvite(admin, wedding.id, { nome: 'Convite A' })
    const conviteB = await createTestInvite(admin, wedding.id, { nome: 'Convite B' })
    const daA = await createTestGuest(admin, wedding.id, {
      nome_completo: 'Convidado da A',
      convite_id: conviteA.id,
    })
    const daB = await createTestGuest(admin, wedding.id, {
      nome_completo: 'Convidado da B',
      convite_id: conviteB.id,
    })

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', { ids: [daA.id, daB.id] })
    expect(res.status).toBe(409)

    const [depoisA, depoisB] = await Promise.all([lerNucleo(daA.id), lerNucleo(daB.id)])
    expect(depoisA?.nucleo_id).toBeNull()
    expect(depoisB?.nucleo_id).toBeNull()
    expect(depoisA?.convite_id).toBe(conviteA.id)
    expect(depoisB?.convite_id).toBe(conviteB.id)
  })

  it('erro de domínio: recusa rascunho da lista, que nunca recebe convite', async () => {
    const convidado = await createTestGuest(admin, wedding.id, { nome_completo: 'Convidado Real' })
    const rascunho = await createTestGuest(admin, wedding.id, {
      nome_completo: 'Talvez Convidado',
      em_consideracao: true,
    })

    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', { ids: [convidado.id, rascunho.id] })
    expect(res.status).toBe(409)

    const depois = await lerNucleo(rascunho.id)
    expect(depois?.nucleo_id).toBeNull()
  })

  it('erro de validação: um id só não forma agrupamento', async () => {
    const solo = await createTestGuest(admin, wedding.id, { nome_completo: 'Sozinho' })
    const client = createTestApiClient({ cookie })
    const res = await client.post('/api/guests/party/group', { ids: [solo.id] })
    expect(res.status).toBe(400)
  })

  it('isolamento: convidado de outro casamento não é agrupado nem visto', async () => {
    const otherWedding = await createTestWedding(admin)
    try {
      const meu = await createTestGuest(admin, wedding.id, { nome_completo: 'Meu Convidado' })
      const alheio = await createTestGuest(admin, otherWedding.id, {
        nome_completo: 'Convidado Alheio',
      })

      const client = createTestApiClient({ cookie })
      const res = await client.post('/api/guests/party/group', { ids: [meu.id, alheio.id] })

      // A função escopa por casamento_id, então sobra um só id válido — e um
      // não agrupa nada. O ponto é que o convidado do outro casamento não é
      // tocado, não o código HTTP.
      expect(res.status).toBe(400)
      const depoisAlheio = await lerNucleo(alheio.id)
      expect(depoisAlheio?.nucleo_id).toBeNull()
    } finally {
      await deleteTestWedding(admin, otherWedding.id)
    }
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const client = createTestApiClient()
    const res = await client.post('/api/guests/party/group', {
      ids: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
    })
    expect(res.status).toBe(401)
  })
})

describe('api: PUT /api/guests/party — ordem e dissolução do núcleo', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  it('primaryPosition coloca o convidado do cadastro na posição pedida, não sempre em 0', async () => {
    // O defeito que isto guarda: `ordem_nucleo = 0` era atribuído a quem
    // estava sendo editado, então salvar o cadastro da Maria reescrevia o
    // rótulo derivado de "João e Maria" para "Maria e João" na lista inteira.
    const client = createTestApiClient({ cookie })
    const res = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Maria Segunda' },
      companions: [{ nomeCompleto: 'Joao Primeiro' }],
      primaryPosition: 1,
    })
    expect(res.status).toBe(200)
    const body = await res.json()

    const { data: doNucleo } = await admin
      .from('convidados')
      .select('nome_completo, ordem_nucleo')
      .eq('nucleo_id', body.partyId)
      .order('ordem_nucleo', { ascending: true })

    expect(doNucleo?.map((g) => g.nome_completo)).toEqual(['Joao Primeiro', 'Maria Segunda'])
  })

  it('remover o único acompanhante dissolve o núcleo — um agrupamento de um não agrupa nada', async () => {
    const client = createTestApiClient({ cookie })

    const criado = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Sobrevivente' },
      companions: [{ nomeCompleto: 'Que Sai' }],
    })
    expect(criado.status).toBe(200)
    const { primaryGuestId, partyId } = await criado.json()
    expect(partyId).toBeTruthy()

    const { data: acompanhante } = await admin
      .from('convidados')
      .select('id')
      .eq('nucleo_id', partyId)
      .neq('id', primaryGuestId)
      .single()

    const res = await client.put('/api/guests/party', {
      primary: { id: primaryGuestId, nomeCompleto: 'Sobrevivente' },
      companions: [],
      removedGuestIds: [acompanhante!.id],
    })
    expect(res.status).toBe(200)
    // A resposta já anuncia que não há mais núcleo, e não um núcleo de um.
    expect((await res.json()).partyId).toBeNull()

    const { data: depois } = await admin
      .from('convidados')
      .select('nucleo_id, ordem_nucleo')
      .eq('id', primaryGuestId)
      .single()
    expect(depois?.nucleo_id).toBeNull()
    expect(depois?.ordem_nucleo).toBe(0)

    const { data: orfao } = await admin
      .from('nucleos_acompanhantes')
      .select('id')
      .eq('id', partyId)
      .maybeSingle()
    expect(orfao).toBeNull()
  })

  it('mover alguém para outro núcleo dissolve o núcleo de origem que ficou com um', async () => {
    const client = createTestApiClient({ cookie })

    const primeiro = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Origem Fica' },
      companions: [{ nomeCompleto: 'Origem Sai' }],
    })
    const origem = await primeiro.json()

    const { data: queSai } = await admin
      .from('convidados')
      .select('id, nome_completo')
      .eq('nucleo_id', origem.partyId)
      .neq('id', origem.primaryGuestId)
      .single()

    // Um cadastro novo puxa a pessoa do núcleo antigo para o dele.
    const segundo = await client.put('/api/guests/party', {
      primary: { nomeCompleto: 'Destino' },
      companions: [{ id: queSai!.id, nomeCompleto: queSai!.nome_completo }],
    })
    expect(segundo.status).toBe(200)
    const destino = await segundo.json()

    const { data: depoisQueSai } = await admin
      .from('convidados')
      .select('nucleo_id')
      .eq('id', queSai!.id)
      .single()
    expect(depoisQueSai?.nucleo_id).toBe(destino.partyId)

    // O núcleo de ORIGEM era o esquecido: ficava com uma pessoa só.
    const { data: sobrou } = await admin
      .from('convidados')
      .select('nucleo_id')
      .eq('id', origem.primaryGuestId)
      .single()
    expect(sobrou?.nucleo_id).toBeNull()

    const { data: orfao } = await admin
      .from('nucleos_acompanhantes')
      .select('id')
      .eq('id', origem.partyId)
      .maybeSingle()
    expect(orfao).toBeNull()
  })
})

describe('api: DELETE /api/guests/[id]', () => {
  const admin = getServiceRoleClient()

  let wedding: Awaited<ReturnType<typeof createTestWedding>>
  let member: Awaited<ReturnType<typeof createTestMember>>
  let cookie: string

  beforeAll(async () => {
    wedding = await createTestWedding(admin)
    member = await createTestMember(admin, wedding.id)
    cookie = await getAdminSessionCookie(member.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, member.userId),
      () => deleteTestWedding(admin, wedding.id),
    ])
  })

  it('caminho feliz: soft-deleta o convidado (excluido_em preenchido, linha não removida)', async () => {
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const res = await client.del(`/api/guests/${guest.id}`)
    expect(res.status).toBe(200)

    const { data: stored } = await admin.from('convidados').select('*').eq('id', guest.id).single()
    expect(stored?.excluido_em).not.toBeNull()
  })

  it('erro de domínio: excluir um id inexistente retorna 404', async () => {
    const res = await createTestApiClient({ cookie }).del(
      '/api/guests/00000000-0000-0000-0000-000000000000',
    )
    expect(res.status).toBe(404)
  })

  it('sem sessão nenhuma, a requisição é rejeitada com 401', async () => {
    const guest = await createTestGuest(admin, wedding.id)
    const client = createTestApiClient()
    const res = await client.del(`/api/guests/${guest.id}`)
    expect(res.status).toBe(401)
  })
})
