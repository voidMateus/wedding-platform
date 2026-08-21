import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestInvite } from '../../factories/invite'
import { createTestGuest } from '../../factories/guest'
import { createTestAccessToken } from '../../factories/access-token'

/**
 * Caminho do convidado — etapa final de revisão do RSVP
 * (POST /api/rsvp/invites/[inviteId]/finalize, server/api/rsvp/invites/[inviteId]/finalize.post.ts).
 * Mesmo modelo de confiança da suíte rsvp.spec.ts: a rota usa service_role
 * (RLS não protege nada aqui), então quem garante posse é
 * `requireRsvpSessionForInvite` — a sessão emitida por `/api/rsvp/[code]`
 * precisa apontar para o MESMO convite que aparece na URL.
 */
describe('guest-path: finalização do RSVP (/api/rsvp/invites/[inviteId]/finalize)', () => {
  const admin = getServiceRoleClient()

  // modo_lista_convidados='aberta' — acompanhante avulso é aceito.
  let weddingOpen: Awaited<ReturnType<typeof createTestWedding>>
  // modo_lista_convidados padrão ('fechada') — acompanhante avulso é ignorado.
  let weddingClosed: Awaited<ReturnType<typeof createTestWedding>>
  let inviteOpen: Awaited<ReturnType<typeof createTestInvite>>
  let inviteClosed: Awaited<ReturnType<typeof createTestInvite>>
  let codeOpen: string
  let codeClosed: string

  beforeAll(async () => {
    weddingOpen = await createTestWedding(admin, { modo_lista_convidados: 'aberta' })
    weddingClosed = await createTestWedding(admin)
    inviteOpen = await createTestInvite(admin, weddingOpen.id)
    inviteClosed = await createTestInvite(admin, weddingClosed.id)
    await createTestGuest(admin, weddingOpen.id, { convite_id: inviteOpen.id, nome_completo: 'Convidado Open' })
    await createTestGuest(admin, weddingClosed.id, { convite_id: inviteClosed.id, nome_completo: 'Convidado Closed' })

    const tokenOpen = await createTestAccessToken(admin, weddingOpen.id, inviteOpen.id)
    codeOpen = tokenOpen.plainCode
    const tokenClosed = await createTestAccessToken(admin, weddingClosed.id, inviteClosed.id)
    codeClosed = tokenClosed.plainCode
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestWedding(admin, weddingOpen.id),
      () => deleteTestWedding(admin, weddingClosed.id),
    ])
  })

  it('modo_lista_convidados=aberta, sem acompanhante: sessão válida finaliza e grava a mensagem', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeOpen}`)

    const res = await client.post(`/api/rsvp/invites/${inviteOpen.id}/finalize`, {
      companions: [],
      message: 'Mal podemos esperar!',
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.mensagem_rsvp).toBe('Mal podemos esperar!')

    const { data: companions, error } = await admin
      .from('acompanhantes_avulsos')
      .select('*')
      .eq('convite_id', inviteOpen.id)
      .is('excluido_em', null)

    expect(error).toBeNull()
    expect(companions).toHaveLength(0)
  })

  it('modo_lista_convidados=aberta, com acompanhante: cria o acompanhante avulso com os dados enviados', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeOpen}`)

    const res = await client.post(`/api/rsvp/invites/${inviteOpen.id}/finalize`, {
      companions: [{ nomeCompleto: 'Acompanhante Avulso Teste', restricoesAlimentares: 'Vegetariano' }],
      message: 'Mal podemos esperar!',
    })
    expect(res.status).toBe(200)

    const { data: companions, error } = await admin
      .from('acompanhantes_avulsos')
      .select('*')
      .eq('convite_id', inviteOpen.id)
      .is('excluido_em', null)

    expect(error).toBeNull()
    expect(companions).toHaveLength(1)
    expect(companions?.[0]?.nome_completo).toBe('Acompanhante Avulso Teste')
    expect(companions?.[0]?.restricoes_alimentares).toBe('Vegetariano')
  })

  it('finalizar de novo substitui (soft delete) o acompanhante avulso anterior, nunca duplica', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeOpen}`)

    const res = await client.post(`/api/rsvp/invites/${inviteOpen.id}/finalize`, {
      companions: [{ nomeCompleto: 'Acompanhante Substituto' }],
      message: 'Mudei de ideia sobre o acompanhante',
    })
    expect(res.status).toBe(200)

    const { data: active, error } = await admin
      .from('acompanhantes_avulsos')
      .select('nome_completo')
      .eq('convite_id', inviteOpen.id)
      .is('excluido_em', null)

    expect(error).toBeNull()
    expect(active).toHaveLength(1)
    expect(active?.[0]?.nome_completo).toBe('Acompanhante Substituto')

    const { count: softDeletedCount } = await admin
      .from('acompanhantes_avulsos')
      .select('*', { count: 'exact', head: true })
      .eq('convite_id', inviteOpen.id)
      .not('excluido_em', 'is', null)
    expect(softDeletedCount).toBe(1)
  })

  it('sessão emitida para outro convite NUNCA finaliza este (posse comprovada)', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeOpen}`)

    const res = await client.post(`/api/rsvp/invites/${inviteClosed.id}/finalize`, {
      companions: [],
      message: 'Não deveria entrar',
    })
    expect(res.status).toBe(403)

    const { data: unchanged } = await admin
      .from('convites')
      .select('mensagem_rsvp')
      .eq('id', inviteClosed.id)
      .single()
    expect(unchanged?.mensagem_rsvp).toBeNull()
  })

  it('modo_lista_convidados=fechada (padrão): acompanhante avulso enviado no corpo é ignorado, sem erro', async () => {
    const client = createTestApiClient()
    await client.get(`/api/rsvp/${codeClosed}`)

    const res = await client.post(`/api/rsvp/invites/${inviteClosed.id}/finalize`, {
      companions: [{ nomeCompleto: 'Não Deveria Ser Criado' }],
      message: 'Mensagem no modo fechado',
    })
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.mensagem_rsvp).toBe('Mensagem no modo fechado')

    const { data: companions, error } = await admin
      .from('acompanhantes_avulsos')
      .select('*')
      .eq('convite_id', inviteClosed.id)
      .is('excluido_em', null)

    expect(error).toBeNull()
    expect(companions).toHaveLength(0)
  })

  it('sem sessão nenhuma, a finalização é bloqueada mesmo com um inviteId válido', async () => {
    const client = createTestApiClient()
    const res = await client.post(`/api/rsvp/invites/${inviteOpen.id}/finalize`, { companions: [] })
    expect(res.status).toBe(403)
  })
})
