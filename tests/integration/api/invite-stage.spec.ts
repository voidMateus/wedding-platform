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
 * O funil de estágios do convite — a regra vive em SQL
 * (`convites_com_resumo.status_operacional`), então a asserção é sempre o que a
 * API devolve depois de mexer nos FATOS, nunca um cálculo em TypeScript.
 *
 * O defeito que isso substitui: a coluna Status respondia só "responderam?", e
 * por isso escrevia "Pendente" em quatro situações com providências opostas.
 *
 * E o ponto mais importante: **o funil não é só digital**. A avó que confirma
 * por telefone tem a resposta registrada pelo casal e o convite vai direto a
 * `responded`, sem nunca ter passado por `opened`. Sem isso o acompanhamento
 * só funcionaria para quem responde online.
 */
describe('api: funil de estágios do convite', () => {
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

  /** O estágio como a API o devolve, que é o que a tela lê. */
  async function stageOf(inviteId: string): Promise<string> {
    const client = createTestApiClient({ cookie })
    const res = await client.get(`/api/invites/${inviteId}`)
    expect(res.status).toBe(200)
    return (await res.json()).stage
  }

  async function novoConvite(nome: string, quantosMembros: number) {
    const invite = await createTestInvite(admin, wedding.id, { nome })
    const membros = []
    for (let i = 0; i < quantosMembros; i += 1) {
      membros.push(
        await createTestGuest(admin, wedding.id, {
          nome_completo: `${nome} membro ${i}`,
          convite_id: invite.id,
        }),
      )
    }
    return { invite, membros }
  }

  it('nasce em not_sent: nenhum fato aconteceu ainda', async () => {
    const { invite } = await novoConvite('Estagio Zero', 2)
    expect(await stageOf(invite.id)).toBe('not_sent')
  })

  it('vira sent quando o casal marca como enviado', async () => {
    const { invite } = await novoConvite('Estagio Enviado', 2)
    const client = createTestApiClient({ cookie })

    const res = await client.post(`/api/invites/${invite.id}/send`)
    expect(res.status).toBe(200)

    expect(await stageOf(invite.id)).toBe('sent')
  })

  it('vira opened no primeiro acesso, mesmo sem ninguém ter marcado envio', async () => {
    // "Aberto" é o único estágio comprovado pelo sistema, e por isso passa na
    // frente de "enviado": se alguém abriu, o convite chegou — o que corrige o
    // flag manual quando o casal esquece de marcar.
    const { invite } = await novoConvite('Estagio Aberto', 2)

    await admin.from('historico_convite').insert({
      casamento_id: wedding.id,
      convite_id: invite.id,
      tipo_evento: 'rsvp.first_access',
    })

    expect(await stageOf(invite.id)).toBe('opened')
  })

  it('acesso de UM membro não é resposta parcial', async () => {
    // João abriu, Maria não, ninguém respondeu: é `opened`, nunca `partial`.
    // Acesso parcial e resposta parcial são coisas diferentes.
    const { invite } = await novoConvite('Acesso Parcial', 2)
    await admin.from('historico_convite').insert({
      casamento_id: wedding.id,
      convite_id: invite.id,
      tipo_evento: 'rsvp.first_access',
    })

    expect(await stageOf(invite.id)).toBe('opened')
  })

  it('vira partial com parte respondida, e responded quando fecha', async () => {
    const { invite, membros } = await novoConvite('Estagio Resposta', 2)
    const client = createTestApiClient({ cookie })

    const primeira = await client.put(`/api/guests/${membros[0]!.id}/rsvp`, {
      status: 'confirmado',
    })
    expect(primeira.status).toBe(200)
    expect(await stageOf(invite.id)).toBe('partial')

    const segunda = await client.put(`/api/guests/${membros[1]!.id}/rsvp`, { status: 'recusado' })
    expect(segunda.status).toBe(200)
    expect(await stageOf(invite.id)).toBe('responded')
  })

  it('resposta registrada pelo casal leva direto a responded, sem acesso nenhum', async () => {
    // A avó: recebeu o convite em papel, confirmou por telefone, nunca abriu o
    // site. Não deve existir jornada digital obrigatória para ela chegar ao
    // fim do funil.
    const { invite, membros } = await novoConvite('Convite da Avo', 1)

    const client = createTestApiClient({ cookie })
    const res = await client.put(`/api/guests/${membros[0]!.id}/rsvp`, { status: 'confirmado' })
    expect(res.status).toBe(200)

    expect(await stageOf(invite.id)).toBe('responded')

    // E o sistema não inventa um acesso que não houve.
    const { count } = await admin
      .from('historico_convite')
      .select('*', { count: 'exact', head: true })
      .eq('convite_id', invite.id)
      .eq('tipo_evento', 'rsvp.first_access')
    expect(count).toBe(0)
  })

  it('registra a origem admin_panel, para não fingir que a pessoa respondeu pelo site', async () => {
    const { invite, membros } = await novoConvite('Origem da Resposta', 1)

    const client = createTestApiClient({ cookie })
    await client.put(`/api/guests/${membros[0]!.id}/rsvp`, { status: 'confirmado' })

    const { data: eventos } = await admin
      .from('historico_convite')
      .select('tipo_evento, metadados')
      .eq('convite_id', invite.id)
      .eq('tipo_evento', 'rsvp.guest_status_changed')

    expect(eventos?.length).toBeGreaterThan(0)
    expect((eventos![0]!.metadados as { source?: string }).source).toBe('admin_panel')
  })

  it('resposta registrada por engano tem volta: pendente devolve o convite ao estágio anterior', async () => {
    const { invite, membros } = await novoConvite('Desfazer Resposta', 2)
    const client = createTestApiClient({ cookie })

    await client.put(`/api/guests/${membros[0]!.id}/rsvp`, { status: 'confirmado' })
    expect(await stageOf(invite.id)).toBe('partial')

    await client.put(`/api/guests/${membros[0]!.id}/rsvp`, { status: 'pendente' })
    expect(await stageOf(invite.id)).toBe('not_sent')
  })

  it('convite sem ninguém dentro não é responded', async () => {
    // 0 >= 0 é verdade: sem a guarda de `total_membros > 0`, um convite vazio
    // apareceria como respondido sem existir uma só resposta.
    const invite = await createTestInvite(admin, wedding.id, { nome: 'Convite Vazio' })
    expect(await stageOf(invite.id)).toBe('not_sent')
  })

  it('recusa `removido` como resposta registrável', async () => {
    // Valor morto do enum: nada no produto o grava, e aceitá-lo aqui o faria
    // contar como resposta — um convite sem ninguém confirmado passaria a
    // dizer "respondido".
    const { membros } = await novoConvite('Sem Removido', 1)
    const client = createTestApiClient({ cookie })
    const res = await client.put(`/api/guests/${membros[0]!.id}/rsvp`, { status: 'removido' })
    expect(res.status).toBe(400)
  })

  it('recusa registrar resposta de convidado sem convite', async () => {
    const solto = await createTestGuest(admin, wedding.id, { nome_completo: 'Sem Convite Ainda' })
    const client = createTestApiClient({ cookie })
    const res = await client.put(`/api/guests/${solto.id}/rsvp`, { status: 'confirmado' })
    expect(res.status).toBe(409)
  })

  it('isolamento: sem sessão, registrar resposta é 401', async () => {
    const client = createTestApiClient()
    const res = await client.put('/api/guests/00000000-0000-0000-0000-000000000001/rsvp', {
      status: 'confirmado',
    })
    expect(res.status).toBe(401)
  })

  it('desmarcar o envio devolve o convite ao estágio anterior', async () => {
    // "Enviado" é informação manual do casal, não entrega comprovada: um
    // clique errado ficava permanente e empurrava o convite para um estágio
    // falso, sem caminho de volta pela interface.
    const { invite } = await novoConvite('Desmarcar Envio', 2)
    const client = createTestApiClient({ cookie })

    await client.post(`/api/invites/${invite.id}/send`, { sent: true })
    expect(await stageOf(invite.id)).toBe('sent')

    const res = await client.post(`/api/invites/${invite.id}/send`, { sent: false })
    expect(res.status).toBe(200)
    expect((await res.json()).enviado_em).toBeNull()
    expect(await stageOf(invite.id)).toBe('not_sent')
  })

  it('desmarcar o envio não apaga o acesso: quem abriu continua em opened', async () => {
    // Envio é informação do casal; acesso é fato comprovado pelo sistema.
    // Desmarcar corrige o registro, nunca reescreve o que aconteceu.
    const { invite } = await novoConvite('Desmarcar Com Acesso', 2)
    const client = createTestApiClient({ cookie })

    await client.post(`/api/invites/${invite.id}/send`, { sent: true })
    await admin.from('historico_convite').insert({
      casamento_id: wedding.id,
      convite_id: invite.id,
      tipo_evento: 'rsvp.first_access',
    })
    expect(await stageOf(invite.id)).toBe('opened')

    await client.post(`/api/invites/${invite.id}/send`, { sent: false })
    expect(await stageOf(invite.id)).toBe('opened')
  })

  it('os dois sentidos entram na Linha do Tempo', async () => {
    const { invite } = await novoConvite('Historico do Envio', 1)
    const client = createTestApiClient({ cookie })

    await client.post(`/api/invites/${invite.id}/send`, { sent: true })
    await client.post(`/api/invites/${invite.id}/send`, { sent: false })

    const { data: eventos } = await admin
      .from('historico_convite')
      .select('tipo_evento')
      .eq('convite_id', invite.id)
      .in('tipo_evento', ['token.sent', 'token.unsent'])

    const tipos = (eventos ?? []).map((e) => e.tipo_evento)
    expect(tipos).toContain('token.sent')
    expect(tipos).toContain('token.unsent')
  })

  it('a listagem de convidados devolve o estágio do convite de cada pessoa', async () => {
    // É o que a coluna "Convite" do Modo Lista exibe: o estágio de fato, em vez
    // de só "Vinculado" — que não dizia nada que o casal já não soubesse.
    const { invite, membros } = await novoConvite('Estagio na Lista', 1)
    const solto = await createTestGuest(admin, wedding.id, { nome_completo: 'Pessoa Sem Convite' })
    const client = createTestApiClient({ cookie })

    await client.post(`/api/invites/${invite.id}/send`, { sent: true })

    const res = await client.get('/api/guests?pageSize=200')
    expect(res.status).toBe(200)
    const linhas = (await res.json()).data as Array<{ id: string; inviteStage: string | null }>

    expect(linhas.find((l) => l.id === membros[0]!.id)?.inviteStage).toBe('sent')
    // Sem convite é null, e a tela o traduz para "Sem convite".
    expect(linhas.find((l) => l.id === solto.id)?.inviteStage).toBeNull()
  })

  it('o filtro por estágio recorta no servidor, antes de paginar', async () => {
    const client = createTestApiClient({ cookie })
    const res = await client.get('/api/invites?stage=responded&pageSize=100')
    expect(res.status).toBe(200)

    const body = await res.json()
    // Todo item devolvido está no estágio pedido — o recorte não é do client.
    for (const invite of body.data) {
      expect(invite.stage).toBe('responded')
    }
    expect(body.data.length).toBeGreaterThan(0)
  })
})
