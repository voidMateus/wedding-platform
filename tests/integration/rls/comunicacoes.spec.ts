import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestCommunication } from '../../factories/communication'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * mesmo padrão de `convidados.spec.ts`.
 *
 * `comunicacoes` foi remodelada na Fase 2 do Hub (migration 20260913100001), e
 * as policies mudaram junto: não existe UPDATE (é log append-only), e o DELETE
 * passou a existir **só para canal `outro`**. A assimetria é o ponto —
 * registro de canal `outro` é uma declaração do casal ("entreguei em mãos"), e
 * declarar por engano precisa ter saída; envio feito pelo sistema (WhatsApp,
 * e-mail) é um fato que aconteceu, e apagá-lo seria reescrever a história.
 */
describe('RLS: comunicacoes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let comunicacaoWhatsApp: Awaited<ReturnType<typeof createTestCommunication>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)

    comunicacaoWhatsApp = await createTestCommunication(admin, weddingA.id, inviteA.id)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a comunicação normalmente', async () => {
    const { data, error } = await memberA.client
      .from('comunicacoes')
      .select('*')
      .eq('id', comunicacaoWhatsApp.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(comunicacaoWhatsApp.id)
  })

  it('membro de outro casamento não lê a comunicação (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('comunicacoes')
      .select('*')
      .eq('id', comunicacaoWhatsApp.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue inserir comunicação no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('comunicacoes')
      .insert({
        casamento_id: weddingA.id,
        convite_id: inviteA.id,
        tipo: 'lembrete',
        canal: 'email',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  // Sem policy de UPDATE: um envio não se edita. Corrigir é apagar o registro
  // (quando ele é declaração do casal) e registrar de novo.
  it('nem o próprio membro consegue editar um envio', async () => {
    await memberA.client
      .from('comunicacoes')
      .update({ tipo: 'lembrete' })
      .eq('id', comunicacaoWhatsApp.id)

    const { data } = await admin
      .from('comunicacoes')
      .select('tipo')
      .eq('id', comunicacaoWhatsApp.id)
      .single()
    expect(data?.tipo).toBe('convite')
  })

  // A regra central desta tabela, e o motivo de ela ter policy de DELETE.
  it('envio feito pelo sistema (whatsapp) não pode ser apagado nem pelo dono', async () => {
    await memberA.client.from('comunicacoes').delete().eq('id', comunicacaoWhatsApp.id)

    const { data } = await admin
      .from('comunicacoes')
      .select('id')
      .eq('id', comunicacaoWhatsApp.id)
      .maybeSingle()
    expect(data?.id).toBe(comunicacaoWhatsApp.id)
  })

  it('registro de canal "outro" pode ser apagado pelo membro — declarar por engano tem saída', async () => {
    const declarado = await createTestCommunication(admin, weddingA.id, inviteA.id, {
      canal: 'outro',
    })

    await memberA.client.from('comunicacoes').delete().eq('id', declarado.id)

    const { data } = await admin
      .from('comunicacoes')
      .select('id')
      .eq('id', declarado.id)
      .maybeSingle()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não apaga nem o registro de canal "outro"', async () => {
    const declarado = await createTestCommunication(admin, weddingA.id, inviteA.id, {
      canal: 'outro',
    })

    await memberB.client.from('comunicacoes').delete().eq('id', declarado.id)

    const { data } = await admin
      .from('comunicacoes')
      .select('id')
      .eq('id', declarado.id)
      .maybeSingle()
    expect(data?.id).toBe(declarado.id)
  })
})
