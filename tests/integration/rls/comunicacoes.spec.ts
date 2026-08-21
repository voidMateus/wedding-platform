import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestAccessToken } from '../../factories/access-token'
import { createTestCommunication } from '../../factories/communication'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * mesmo padrão de `convidados.spec.ts`. `comunicacoes` é o log de envio por
 * canal (CLAUDE.md, seção 12.2): tem select/insert/update, mas NUNCA existe
 * policy de DELETE — o log não é apagado mesmo quando a credencial associada
 * é revogada (supabase/migrations/20260730120014_communications.sql).
 */
describe('RLS: comunicacoes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let credentialAId: string
  let communicationA: Awaited<ReturnType<typeof createTestCommunication>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)
    await createTestAccessToken(admin, weddingA.id, inviteA.id)

    const { data: credential, error } = await admin
      .from('credenciais_acesso_convite')
      .select('id')
      .eq('convite_id', inviteA.id)
      .single()
    if (error || !credential) {
      throw new Error(`Falha ao buscar credencial de teste: ${error?.message}`)
    }
    credentialAId = credential.id

    communicationA = await createTestCommunication(admin, weddingA.id, credentialAId)
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
      .eq('id', communicationA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(communicationA.id)
  })

  it('membro de outro casamento não lê a comunicação (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('comunicacoes')
      .select('*')
      .eq('id', communicationA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a comunicação', async () => {
    const { data, error } = await memberB.client
      .from('comunicacoes')
      .update({ aberto_em: new Date().toISOString() })
      .eq('id', communicationA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('comunicacoes')
      .select('aberto_em')
      .eq('id', communicationA.id)
      .single()
    expect(unchanged?.aberto_em).toBeNull()
  })

  it('membro de outro casamento não consegue inserir comunicação no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('comunicacoes')
      .insert({
        casamento_id: weddingA.id,
        credencial_id: credentialAId,
        tipo: 'lembrete',
        canal: 'email',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('não existe policy de DELETE — nem o próprio membro do casamento consegue excluir a comunicação', async () => {
    await memberA.client.from('comunicacoes').delete().eq('id', communicationA.id)

    const { data: stillThere } = await admin
      .from('comunicacoes')
      .select('id')
      .eq('id', communicationA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(communicationA.id)
  })
})
