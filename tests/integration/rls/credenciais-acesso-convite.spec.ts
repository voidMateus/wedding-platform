import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInvite } from '../../factories/invite'
import { createTestAccessToken } from '../../factories/access-token'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * mesmo padrão de `convidados.spec.ts`. Nuance própria desta tabela
 * (CLAUDE.md, seção 12.2 / supabase/migrations/20260730120013_guest_access_tokens.sql):
 * só existem policies de select/insert/update — revogação é sempre lógica
 * (`revogado_em`), NUNCA existe policy de DELETE, nem para o membro dono do
 * próprio casamento (preserva o vínculo histórico com `comunicacoes`).
 */
describe('RLS: credenciais_acesso_convite', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let inviteA: Awaited<ReturnType<typeof createTestInvite>>
  let inviteASemCredencial: Awaited<ReturnType<typeof createTestInvite>>
  let credentialA: Awaited<ReturnType<typeof fetchCredentialByInvite>>

  async function fetchCredentialByInvite(conviteId: string) {
    const { data, error } = await admin
      .from('credenciais_acesso_convite')
      .select('*')
      .eq('convite_id', conviteId)
      .single()
    if (error || !data) {
      throw new Error(`Falha ao buscar credencial de teste: ${error?.message}`)
    }
    return data
  }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    inviteA = await createTestInvite(admin, weddingA.id)
    inviteASemCredencial = await createTestInvite(admin, weddingA.id, {
      codigo_interno: 'TESTE-SEM-CREDENCIAL',
    })
    await createTestAccessToken(admin, weddingA.id, inviteA.id)
    credentialA = await fetchCredentialByInvite(inviteA.id)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a credencial normalmente', async () => {
    const { data, error } = await memberA.client
      .from('credenciais_acesso_convite')
      .select('*')
      .eq('id', credentialA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(credentialA.id)
  })

  it('membro de outro casamento não lê a credencial (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('credenciais_acesso_convite')
      .select('*')
      .eq('id', credentialA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar (revogar) a credencial', async () => {
    const { data, error } = await memberB.client
      .from('credenciais_acesso_convite')
      .update({ revogado_em: new Date().toISOString() })
      .eq('id', credentialA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('credenciais_acesso_convite')
      .select('revogado_em')
      .eq('id', credentialA.id)
      .single()
    expect(unchanged?.revogado_em).toBeNull()
  })

  it('membro de outro casamento não consegue inserir credencial no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('credenciais_acesso_convite')
      .insert({
        casamento_id: weddingA.id,
        convite_id: inviteASemCredencial.id,
        codigo_hash: 'hash-intruso-nao-deveria-ser-gravado',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()

    const { data: stillNone } = await admin
      .from('credenciais_acesso_convite')
      .select('id')
      .eq('convite_id', inviteASemCredencial.id)
      .maybeSingle()
    expect(stillNone).toBeNull()
  })

  it('não existe policy de DELETE — nem o próprio membro do casamento consegue excluir a credencial', async () => {
    await memberA.client.from('credenciais_acesso_convite').delete().eq('id', credentialA.id)

    const { data: stillThere } = await admin
      .from('credenciais_acesso_convite')
      .select('id')
      .eq('id', credentialA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(credentialA.id)
  })
})
