import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * `planos` tem RLS habilitada e ZERO policies definidas (deny-by-default —
 * supabase/policies/README.md, "sem UI/feature usando ainda",
 * docs/ROADMAP.md seção 8). Não existe um caso "membro de X pode Y" pra
 * provar aqui — o objetivo desta suíte é uma guarda de regressão: provar
 * que hoje ninguém além de `service_role` enxerga ou altera qualquer linha,
 * mesmo um membro `dono` de um casamento real, pra pegar quem adicionar uma
 * policy permissiva sem querer no futuro. Insere só a linha mínima
 * necessária e apaga por id no `afterAll` (sem depender de cascade — a
 * tabela não é particionada por `casamento_id`).
 */
describe('RLS: planos (deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let planoId: string

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id, 'dono')

    const { data, error } = await admin
      .from('planos')
      .insert({ nome: 'Plano Teste Integração' })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar plano de teste: ${error?.message}`)
    }
    planoId = data.id
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar o usuário de teste) — cada recurso só entra na
    // limpeza se realmente chegou a ser criado, pra nunca deixar uma linha
    // órfã por causa de um `throw` no meio do setup.
    if (planoId) {
      await admin.from('planos').delete().eq('id', planoId)
    }
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
    ])
  })

  it('service_role consegue ler o plano (confirma que a linha de setup existe de verdade)', async () => {
    const { data, error } = await admin.from('planos').select('*').eq('id', planoId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(planoId)
  })

  it('membro autenticado não enxerga o plano via SELECT (sem nenhuma policy)', async () => {
    const { data, error } = await memberA.client
      .from('planos')
      .select('*')
      .eq('id', planoId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro autenticado não consegue inserir em planos', async () => {
    const { data, error } = await memberA.client
      .from('planos')
      .insert({ nome: 'Plano Intruso' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro autenticado não consegue atualizar o plano existente', async () => {
    const { data, error } = await memberA.client
      .from('planos')
      .update({ nome: 'Nome Alterado Indevidamente' })
      .eq('id', planoId)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('planos').select('nome').eq('id', planoId).single()
    expect(unchanged?.nome).toBe('Plano Teste Integração')
  })

  it('membro autenticado não consegue excluir o plano existente', async () => {
    await memberA.client.from('planos').delete().eq('id', planoId)

    const { data: stillThere } = await admin
      .from('planos')
      .select('id')
      .eq('id', planoId)
      .maybeSingle()
    expect(stillThere?.id).toBe(planoId)
  })
})
