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
 * Integração — Comunicações (Fase 2 do Hub).
 *
 * O que este bloco protege não é o insert: é a **derivação**. `enviado_em`
 * deixou de ser coluna marcada à mão e virou leitura do primeiro registro de
 * envio, e o estágio do funil passou a depender disso. Um teste que só
 * verificasse a linha inserida não notaria a view deixando de derivar.
 */
describe('api: comunicações', () => {
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

  it('caminho feliz: registra o envio e o convite passa a "enviado" no funil', async () => {
    const invite = await createTestInvite(admin, wedding.id)

    const { data: antes } = await admin
      .from('convites_com_resumo')
      .select('enviado_em, status_operacional')
      .eq('id', invite.id)
      .single()
    expect(antes?.enviado_em).toBeNull()
    expect(antes?.status_operacional).toBe('nao_enviado')

    const res = await createTestApiClient({ cookie }).post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'whatsapp',
    })
    expect(res.status).toBe(200)

    const { data: depois } = await admin
      .from('convites_com_resumo')
      .select('enviado_em, ultimo_contato, status_operacional')
      .eq('id', invite.id)
      .single()
    expect(depois?.enviado_em).not.toBeNull()
    expect(depois?.ultimo_contato).not.toBeNull()
    expect(depois?.status_operacional).toBe('enviado')
  })

  // Só o tipo `convite` define o estágio "Enviado": um save the date avisa que
  // a data existe, não convida ninguém — e o funil ficaria mentindo que o
  // convite saiu.
  it('save the date não coloca o convite no estágio "enviado"', async () => {
    const invite = await createTestInvite(admin, wedding.id)

    await createTestApiClient({ cookie }).post('/api/communications', {
      conviteId: invite.id,
      tipo: 'save_the_date',
      canal: 'whatsapp',
    })

    const { data } = await admin
      .from('convites_com_resumo')
      .select('enviado_em, ultimo_contato, status_operacional')
      .eq('id', invite.id)
      .single()

    expect(data?.enviado_em).toBeNull()
    expect(data?.status_operacional).toBe('nao_enviado')
    // Mas o contato aconteceu, e a tela de Comunicações precisa saber.
    expect(data?.ultimo_contato).not.toBeNull()
  })

  // "Enviado" é o PRIMEIRO envio de convite: o lembrete não reinicia a conta de
  // "há quanto tempo mandamos".
  it('o segundo envio de convite não muda o enviado_em', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    await client.post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'outro',
    })
    const { data: primeiro } = await admin
      .from('convites_com_resumo')
      .select('enviado_em')
      .eq('id', invite.id)
      .single()

    await client.post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'whatsapp',
    })
    const { data: segundo } = await admin
      .from('convites_com_resumo')
      .select('enviado_em')
      .eq('id', invite.id)
      .single()

    expect(segundo?.enviado_em).toBe(primeiro?.enviado_em)
  })

  it('registra o envio na Linha do Tempo do convite', async () => {
    const invite = await createTestInvite(admin, wedding.id)

    await createTestApiClient({ cookie }).post('/api/communications', {
      conviteId: invite.id,
      tipo: 'lembrete',
      canal: 'whatsapp',
    })

    const { data } = await admin
      .from('historico_convite')
      .select('tipo_evento, metadados')
      .eq('convite_id', invite.id)
      .eq('tipo_evento', 'comunicacao.enviada')

    expect(data).toHaveLength(1)
    expect((data?.[0]?.metadados as Record<string, unknown>)?.tipo).toBe('lembrete')
  })

  it('erro de domínio: convite de outro casamento responde 404', async () => {
    const outro = await createTestWedding(admin)
    try {
      const invite = await createTestInvite(admin, outro.id)
      const res = await createTestApiClient({ cookie }).post('/api/communications', {
        conviteId: invite.id,
        tipo: 'convite',
        canal: 'outro',
      })
      expect(res.status).toBe(404)
    } finally {
      await deleteTestWedding(admin, outro.id)
    }
  })

  it('erro de domínio: tipo fora do catálogo é rejeitado com 400', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const res = await createTestApiClient({ cookie }).post('/api/communications', {
      conviteId: invite.id,
      tipo: 'agradecimento',
      canal: 'outro',
    })
    expect(res.status).toBe(400)
  })

  // A assimetria central: declaração do casal tem volta, fato do sistema não.
  it('apaga registro de canal "outro"', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const criado = await client.post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'outro',
    })
    const { id } = await criado.json()

    const res = await client.del(`/api/communications/${id}`)
    expect(res.status).toBe(200)

    const { data } = await admin.from('comunicacoes').select('id').eq('id', id).maybeSingle()
    expect(data).toBeNull()
  })

  it('recusa apagar envio feito pelo sistema, com 409 e motivo', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const criado = await client.post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'whatsapp',
    })
    const { id } = await criado.json()

    const res = await client.del(`/api/communications/${id}`)
    expect(res.status).toBe(409)

    const { data } = await admin.from('comunicacoes').select('id').eq('id', id).maybeSingle()
    expect(data?.id).toBe(id)
  })

  it('sem sessão nenhuma, registrar é rejeitado com 401', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const res = await createTestApiClient().post('/api/communications', {
      conviteId: invite.id,
      tipo: 'convite',
      canal: 'outro',
    })
    expect(res.status).toBe(401)
  })
})

/**
 * A mensagem pronta. O ponto sensível é a credencial: ela é GERADA quando não
 * existe (o link é o ponto do envio) e **nunca** rotacionada quando existe —
 * rotacionar invalidaria um QR que pode estar impresso.
 */
describe('api: POST /api/communications/message', () => {
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

  it('monta o texto, gera a credencial que faltava e devolve o wa.me', async () => {
    const guest = await createTestGuest(admin, wedding.id, {
      nome_completo: 'Ana Souza',
      telefone: '(31) 99999-8888',
    })
    const invite = await createTestInvite(admin, wedding.id, {
      convidado_responsavel_id: guest.id,
    })

    const res = await createTestApiClient({ cookie }).post('/api/communications/message', {
      conviteId: invite.id,
      tipo: 'convite',
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    // Primeiro nome, nunca o completo: "Oi, Ana Souza!" soa como cobrança.
    expect(body.texto).toContain('Ana')
    expect(body.texto).not.toContain('{{')
    expect(body.link).toContain(`/${wedding.slug}/rsvp/`)
    expect(body.telefoneE164).toBe('5531999998888')
    expect(body.linkWhatsApp).toContain('https://wa.me/5531999998888')

    const { data: credenciais } = await admin
      .from('credenciais_acesso_convite')
      .select('id')
      .eq('convite_id', invite.id)
      .is('revogado_em', null)
    expect(credenciais).toHaveLength(1)
  })

  // A regra que protege o QR impresso.
  it('não rotaciona a credencial existente: o link continua o mesmo', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    const primeira = await (
      await client.post('/api/communications/message', { conviteId: invite.id, tipo: 'convite' })
    ).json()
    const segunda = await (
      await client.post('/api/communications/message', { conviteId: invite.id, tipo: 'lembrete' })
    ).json()

    expect(segunda.link).toBe(primeira.link)

    const { data: credenciais } = await admin
      .from('credenciais_acesso_convite')
      .select('id')
      .eq('convite_id', invite.id)
      .is('revogado_em', null)
    expect(credenciais).toHaveLength(1)
  })

  // Convite sem telefone não é erro: é trabalho a fazer, e a tela oferece
  // registrar o envio por fora.
  it('sem telefone, devolve a mensagem mesmo assim — só sem o wa.me', async () => {
    const invite = await createTestInvite(admin, wedding.id)

    const res = await createTestApiClient({ cookie }).post('/api/communications/message', {
      conviteId: invite.id,
      tipo: 'convite',
    })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.texto.length).toBeGreaterThan(0)
    expect(body.telefoneE164).toBeNull()
    expect(body.linkWhatsApp).toBeNull()
  })

  it('usa o modelo do casal quando ele existe', async () => {
    const invite = await createTestInvite(admin, wedding.id)
    const client = createTestApiClient({ cookie })

    await client.patch('/api/wedding/communication-templates', {
      convite: 'Texto do casal para {{nome}}',
    })

    const body = await (
      await client.post('/api/communications/message', { conviteId: invite.id, tipo: 'convite' })
    ).json()

    expect(body.texto).toContain('Texto do casal para')

    // O lembrete, que o casal não personalizou, continua no padrão.
    const lembrete = await (
      await client.post('/api/communications/message', { conviteId: invite.id, tipo: 'lembrete' })
    ).json()
    expect(lembrete.texto).not.toContain('Texto do casal')
  })
})
