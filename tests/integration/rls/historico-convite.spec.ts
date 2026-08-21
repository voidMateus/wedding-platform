import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestInviteEvent } from '../../factories/invite-event'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2).
 * `historico_convite` é log append-only (supabase/migrations/
 * 20260803120011_invite_events.sql / supabase/policies/README.md): só
 * existem policies de SELECT e INSERT para membros — não há policy de
 * UPDATE nem DELETE para ninguém (nem para o próprio dono do casamento),
 * então RLS nega as duas operações por padrão (deny-by-default), mesmo para
 * quem só quer editar o próprio log. Só `service_role` (Nitro) contorna
 * isso, e nenhum código de aplicação deveria fazê-lo. Nunca usa o client
 * `service_role` para as asserções em si (ele ignora RLS) — só para
 * criar/limpar a massa de dados.
 */
describe('RLS: historico_convite', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let eventA: Awaited<ReturnType<typeof createTestInviteEvent>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)
    eventA = await createTestInviteEvent(admin, weddingA.id, inviteA.id, {
      tipo_evento: 'invite.created',
      metadados: { origem: 'teste-integracao' },
    })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o evento normalmente', async () => {
    const { data, error } = await memberA.client
      .from('historico_convite')
      .select('*')
      .eq('id', eventA.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data?.id).toBe(eventA.id)
  })

  it('membro do próprio casamento consegue inserir um novo evento', async () => {
    const { data, error } = await memberA.client
      .from('historico_convite')
      .insert({ casamento_id: weddingA.id, convite_id: inviteA.id, tipo_evento: 'rsvp.first_access' })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.convite_id).toBe(inviteA.id)

    const { data: persisted } = await admin.from('historico_convite').select('id').eq('id', data!.id).maybeSingle()
    expect(persisted?.id).toBe(data!.id)
  })

  it('membro de outro casamento não lê o evento (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('historico_convite')
      .select('*')
      .eq('id', eventA.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue inserir evento no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('historico_convite')
      .insert({ casamento_id: weddingA.id, convite_id: inviteA.id, tipo_evento: 'evento.intruso' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('nem o próprio membro do casamento dono consegue atualizar um evento (log imutável, sem policy de update)', async () => {
    const { data, error } = await memberA.client
      .from('historico_convite')
      .update({ tipo_evento: 'evento.alterado_indevidamente' })
      .eq('id', eventA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('historico_convite')
      .select('tipo_evento')
      .eq('id', eventA.id)
      .single()
    expect(unchanged?.tipo_evento).toBe('invite.created')
  })

  it('nem o próprio membro do casamento dono consegue excluir um evento (log imutável, sem policy de delete)', async () => {
    await memberA.client.from('historico_convite').delete().eq('id', eventA.id)

    const { data: stillThere } = await admin.from('historico_convite').select('id').eq('id', eventA.id).maybeSingle()
    expect(stillThere?.id).toBe(eventA.id)
  })

  it('membro de outro casamento não consegue atualizar nem excluir o evento', async () => {
    const { data: updateData, error: updateError } = await memberB.client
      .from('historico_convite')
      .update({ tipo_evento: 'evento.alterado_indevidamente' })
      .eq('id', eventA.id)
      .select()
    expect(updateError).toBeNull()
    expect(updateData).toEqual([])

    await memberB.client.from('historico_convite').delete().eq('id', eventA.id)

    const { data: stillThere } = await admin.from('historico_convite').select('id').eq('id', eventA.id).maybeSingle()
    expect(stillThere?.id).toBe(eventA.id)
  })
})
