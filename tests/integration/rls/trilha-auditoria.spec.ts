import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * `trilha_auditoria` só tem policy de SELECT e INSERT (supabase/policies/
 * README.md) — log de auditoria é imutável, sem UPDATE/DELETE pra ninguém
 * além de `service_role`. Usa `tipo_autor: 'sistema'` (com `autor_id` nulo)
 * nas linhas de teste — `autor_id` de `tipo_autor: 'membro'` referenciaria
 * `membros_casamento.id`, irrelevante pro que esta suíte prova (isolamento
 * por `casamento_id`, não o valor de `tipo_autor`). Nunca usa o client
 * `service_role` para as asserções em si — só para criar/verificar a massa
 * de dados.
 */
describe('RLS: trilha_auditoria', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let logA: { id: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)

    const { data, error } = await admin
      .from('trilha_auditoria')
      .insert({
        casamento_id: weddingA.id,
        acao: 'acao_teste_integracao',
        tipo_autor: 'sistema',
        tipo_entidade: 'teste_integracao',
      })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar log de auditoria de teste: ${error?.message}`)
    }
    logA = data
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar um dos usuários de teste) — cada recurso só
    // entra na limpeza se realmente chegou a ser criado, pra nunca deixar
    // uma linha órfã por causa de um `throw` no meio do setup.
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('membro do próprio casamento lê o log normalmente', async () => {
    const { data, error } = await memberA.client
      .from('trilha_auditoria')
      .select('*')
      .eq('id', logA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(logA.id)
  })

  it('membro do próprio casamento consegue registrar um novo log', async () => {
    const { data, error } = await memberA.client
      .from('trilha_auditoria')
      .insert({
        casamento_id: weddingA.id,
        acao: 'acao_registrada_pelo_membro',
        tipo_autor: 'sistema',
        tipo_entidade: 'teste_integracao',
      })
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('membro de outro casamento não lê o log (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('trilha_auditoria')
      .select('*')
      .eq('id', logA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue inserir log no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('trilha_auditoria')
      .insert({
        casamento_id: weddingA.id,
        acao: 'acao_intrusa',
        tipo_autor: 'sistema',
        tipo_entidade: 'teste_integracao',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o log', async () => {
    const { data, error } = await memberB.client
      .from('trilha_auditoria')
      .update({ acao: 'acao_alterada_indevidamente' })
      .eq('id', logA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('membro de outro casamento não consegue excluir o log', async () => {
    await memberB.client.from('trilha_auditoria').delete().eq('id', logA.id)

    const { data: stillThere } = await admin
      .from('trilha_auditoria')
      .select('id')
      .eq('id', logA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(logA.id)
  })

  it('nem o próprio membro do casamento consegue atualizar o log (sem policy de update pra ninguém além de service_role)', async () => {
    const { data, error } = await memberA.client
      .from('trilha_auditoria')
      .update({ acao: 'acao_alterada_pelo_proprio_membro' })
      .eq('id', logA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('trilha_auditoria')
      .select('acao')
      .eq('id', logA.id)
      .single()
    expect(unchanged?.acao).toBe('acao_teste_integracao')
  })

  it('nem o próprio membro do casamento consegue excluir o log (sem policy de delete pra ninguém além de service_role)', async () => {
    await memberA.client.from('trilha_auditoria').delete().eq('id', logA.id)

    const { data: stillThere } = await admin
      .from('trilha_auditoria')
      .select('id')
      .eq('id', logA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(logA.id)
  })
})
