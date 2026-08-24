import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * `funcionalidades_habilitadas` ganhou a primeira policy real no Passo 4
 * (docs/PLANO-SAAS.md, migration `20260821120001`): SELECT liberado pra
 * membro do casamento dono da flag (`casamento_id`) ou pra própria conta
 * (`conta_id = auth.uid()`) — XOR entre as duas (migration
 * `20260821090005`). Mutação continua deny-by-default — feature flag só
 * deveria mudar via processo de confiança do servidor. A tentativa de
 * INSERT usa uma `chave` diferente da linha de setup pra evitar colidir com
 * o `unique(casamento_id, chave)` e mascarar a asserção de RLS atrás de uma
 * violação de constraint. Insere só o mínimo necessário e apaga por id no
 * `afterAll`, sem depender de cascade.
 */
describe('RLS: funcionalidades_habilitadas (select por casamento/conta, mutação deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let flagId: string
  let flagContaId: string

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id, 'dono')
    memberB = await createTestMember(admin, weddingB.id, 'dono')

    const { data, error } = await admin
      .from('funcionalidades_habilitadas')
      .insert({ casamento_id: weddingA.id, chave: 'teste_integracao_flag' })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar funcionalidade habilitada de teste: ${error?.message}`)
    }
    flagId = data.id

    // Segunda flag, escopo de CONTA (conta_id = memberA), pra provar o
    // outro braço do XOR isoladamente do caminho por casamento_id.
    const { data: flagConta, error: flagContaError } = await admin
      .from('funcionalidades_habilitadas')
      .insert({ conta_id: memberA.userId, chave: 'teste_integracao_flag_conta' })
      .select()
      .single()
    if (flagContaError || !flagConta) {
      throw new Error(`Falha ao criar funcionalidade de conta de teste: ${flagContaError?.message}`)
    }
    flagContaId = flagConta.id
  })

  afterAll(async () => {
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar o usuário de teste) — cada recurso só entra na
    // limpeza se realmente chegou a ser criado, pra nunca deixar uma linha
    // órfã por causa de um `throw` no meio do setup.
    if (flagId) {
      await admin.from('funcionalidades_habilitadas').delete().eq('id', flagId)
    }
    if (flagContaId) {
      await admin.from('funcionalidades_habilitadas').delete().eq('id', flagContaId)
    }
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
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

  it('membro do casamento dono da flag enxerga via SELECT', async () => {
    const { data, error } = await memberA.client
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(flagId)
  })

  it('membro de outro casamento (sem vínculo) não enxerga a flag', async () => {
    const { data, error } = await memberB.client
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('a própria conta (conta_id = auth.uid()) enxerga a flag de conta via SELECT', async () => {
    const { data, error } = await memberA.client
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagContaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(flagContaId)
  })

  it('outra conta não enxerga a flag de conta alheia', async () => {
    const { data, error } = await memberB.client
      .from('funcionalidades_habilitadas')
      .select('*')
      .eq('id', flagContaId)
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
