import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestGuest } from '../../factories/guest'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 *
 * `respostas_rsvp` referencia `convidado_id`/`convite_id`, com `casamento_id`
 * denormalizado na própria linha (CLAUDE.md, seção 10) — o trigger
 * `rsvp_responses_check_wedding_id` garante consistência entre os três, mas
 * quem decide se um membro de outro casamento pode ler/escrever a linha é
 * só a policy de RLS (`is_wedding_member(casamento_id)`), que é o alvo desta
 * suíte.
 */
describe('RLS: respostas_rsvp', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let guestA: Awaited<ReturnType<typeof createTestGuest>>
  let responseA: { id: string; status_rsvp: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)
    guestA = await createTestGuest(admin, weddingA.id, { convite_id: inviteA.id })

    const { data, error } = await admin
      .from('respostas_rsvp')
      .insert({
        casamento_id: weddingA.id,
        convidado_id: guestA.id,
        convite_id: inviteA.id,
      })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar resposta de RSVP de teste: ${error?.message}`)
    }
    responseA = data
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a resposta normalmente', async () => {
    const { data, error } = await memberA.client
      .from('respostas_rsvp')
      .select('*')
      .eq('id', responseA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(responseA.id)
  })

  it('membro de outro casamento não lê a resposta (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('respostas_rsvp')
      .select('*')
      .eq('id', responseA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a resposta', async () => {
    const { data, error } = await memberB.client
      .from('respostas_rsvp')
      .update({ status_rsvp: 'confirmed' })
      .eq('id', responseA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('respostas_rsvp')
      .select('status_rsvp')
      .eq('id', responseA.id)
      .single()
    expect(unchanged?.status_rsvp).toBe(responseA.status_rsvp)
  })

  it('membro de outro casamento não consegue excluir a resposta', async () => {
    await memberB.client.from('respostas_rsvp').delete().eq('id', responseA.id)

    const { data: stillThere } = await admin
      .from('respostas_rsvp')
      .select('id')
      .eq('id', responseA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(responseA.id)
  })

  it('membro de outro casamento não consegue inserir resposta no casamento A', async () => {
    // Convidado novo, sem resposta prévia: garante que o bloqueio vem da
    // policy de RLS, não de rsvp_responses_guest_id_key (unique em
    // convidado_id) — guestA já tem responseA.
    const guestA2 = await createTestGuest(admin, weddingA.id, { convite_id: inviteA.id })

    const { data, error } = await memberB.client
      .from('respostas_rsvp')
      .insert({
        casamento_id: weddingA.id,
        convidado_id: guestA2.id,
        convite_id: inviteA.id,
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
