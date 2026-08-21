import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * `funcionalidades_habilitadas` tem RLS habilitada e ZERO policies
 * definidas (deny-by-default — supabase/policies/README.md, "sem UI/feature
 * usando ainda", docs/ROADMAP.md seção 8). Guarda de regressão: mesmo um
 * membro `dono` do casamento dono da flag não enxerga nem altera nada — só
 * `service_role`. `casamento_id`/`conta_id` são XOR (migration
 * 20260821090005) — a linha de teste usa `casamento_id`. A tentativa de
 * INSERT usa uma `chave` diferente da linha de setup pra evitar colidir com
 * o `unique(casamento_id, chave)` e mascarar a asserção de RLS atrás de uma
 * violação de constraint. Insere só o mínimo necessário e apaga por id no
 * `afterAll`, sem depender de cascade.
 */
describe('RLS: funcionalidades_habilitadas (deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let flagId: string

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id, 'dono')

    const { data, error } = await admin
      .from('funcionalidades_habilitadas')
      .insert({ casamento_id: weddingA.id, chave: 'teste_integracao_flag' })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar funcionalidade habilitada de teste: ${error?.message}`)
    }
    flagId = data.id
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar o usuário de teste) — cada recurso só entra na
    // limpeza se realmente chegou a ser criado, pra nunca deixar uma linha
    // órfã por causa de um `throw` no meio do setup.
    if (flagId) {
      await admin.from('funcionalidades_habilitadas').delete().eq('id', flagId)
    }
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
    ])
  })

  it('service_role consegue ler a flag (confirma que a linha de setup existe de verdade)', async () => {
    const { data, error } = await admin
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(flagId)
  })

  it('membro autenticado não enxerga a flag via SELECT (sem nenhuma policy), mesmo sendo dono do casamento', async () => {
    const { data, error } = await memberA.client
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro autenticado não consegue inserir em funcionalidades_habilitadas', async () => {
    const { data, error } = await memberA.client
      .from('funcionalidades_habilitadas')
      .insert({ casamento_id: weddingA.id, chave: 'teste_integracao_flag_insercao_membro' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro autenticado não consegue atualizar a flag existente', async () => {
    const { data, error } = await memberA.client
      .from('funcionalidades_habilitadas')
      .update({ habilitado: true })
      .eq('id', flagId)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('funcionalidades_habilitadas')
      .select('habilitado')
      .eq('id', flagId)
      .single()
    expect(unchanged?.habilitado).toBe(false)
  })

  it('membro autenticado não consegue excluir a flag existente', async () => {
    await memberA.client.from('funcionalidades_habilitadas').delete().eq('id', flagId)

    const { data: stillThere } = await admin
      .from('funcionalidades_habilitadas')
      .select('id')
      .eq('id', flagId)
      .maybeSingle()
    expect(stillThere?.id).toBe(flagId)
  })
})
