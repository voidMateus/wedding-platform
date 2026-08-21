import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * `assinaturas` ganhou a primeira policy real no Passo 4
 * (docs/PLANO-SAAS.md, migration `20260821120001`): SELECT liberado pra
 * membro do casamento vinculado (`casamento_id`) ou pra própria conta
 * (`conta_id = auth.uid()`) — `casamento_id`/`conta_id` são XOR (exatamente
 * um não nulo, migration `20260821090005`). Mutação continua
 * deny-by-default — efeito de negócio de assinatura nasce de um processo
 * de confiança do lado do servidor (mesmo padrão de
 * `confirm_gift_payment()`, CLAUDE.md seção 12), nunca de um UPDATE direto
 * do client. Insere só o mínimo necessário (plano + assinaturas) e apaga
 * tudo por id no `afterAll`, na ordem que respeita a FK
 * `assinaturas.plano_id -> planos.id` (sem `on delete cascade` nela) —
 * nunca depende de cascade.
 */
describe('RLS: assinaturas (select por casamento/conta, mutação deny-by-default)', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let planoId: string
  let assinaturaId: string
  let assinaturaContaId: string

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id, 'dono')
    memberB = await createTestMember(admin, weddingB.id, 'dono')

    const { data: plano, error: planoError } = await admin
      .from('planos')
      .insert({ nome: 'Plano Teste Integração (assinaturas)' })
      .select()
      .single()
    if (planoError || !plano) {
      throw new Error(`Falha ao criar plano de teste: ${planoError?.message}`)
    }
    planoId = plano.id

    const { data: assinatura, error: assinaturaError } = await admin
      .from('assinaturas')
      .insert({ plano_id: planoId, casamento_id: weddingA.id })
      .select()
      .single()
    if (assinaturaError || !assinatura) {
      throw new Error(`Falha ao criar assinatura de teste: ${assinaturaError?.message}`)
    }
    assinaturaId = assinatura.id

    // Segunda assinatura, escopo de CONTA (conta_id = memberA), pra provar
    // o outro braço do XOR isoladamente do caminho por casamento_id.
    const { data: assinaturaConta, error: assinaturaContaError } = await admin
      .from('assinaturas')
      .insert({ plano_id: planoId, conta_id: memberA.userId })
      .select()
      .single()
    if (assinaturaContaError || !assinaturaConta) {
      throw new Error(`Falha ao criar assinatura de conta de teste: ${assinaturaContaError?.message}`)
    }
    assinaturaContaId = assinaturaConta.id
  })

  afterAll(async () => {
    // Ordem importa: assinaturas.plano_id -> planos.id não tem `on delete
    // cascade`, então o plano só pode ser apagado depois das assinaturas.
    // Defensivo contra falha parcial do beforeAll (ex.: rate limit do
    // Supabase Auth ao criar o usuário de teste) — cada recurso só entra na
    // limpeza se realmente chegou a ser criado, pra nunca deixar uma linha
    // órfã por causa de um `throw` no meio do setup.
    if (assinaturaId) {
      await admin.from('assinaturas').delete().eq('id', assinaturaId)
    }
    if (assinaturaContaId) {
      await admin.from('assinaturas').delete().eq('id', assinaturaContaId)
    }
    if (planoId) {
      await admin.from('planos').delete().eq('id', planoId)
    }
    await cleanupAll([
      ...(memberA ? [() => deleteTestMember(admin, memberA.userId)] : []),
      ...(memberB ? [() => deleteTestMember(admin, memberB.userId)] : []),
      ...(weddingA ? [() => deleteTestWedding(admin, weddingA.id)] : []),
      ...(weddingB ? [() => deleteTestWedding(admin, weddingB.id)] : []),
    ])
  })

  it('service_role consegue ler a assinatura (confirma que a linha de setup existe de verdade)', async () => {
    const { data, error } = await admin
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(assinaturaId)
  })

  it('membro do casamento vinculado enxerga a assinatura via SELECT', async () => {
    const { data, error } = await memberA.client
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(assinaturaId)
  })

  it('membro de outro casamento (sem vínculo) não enxerga a assinatura', async () => {
    const { data, error } = await memberB.client
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('a própria conta (conta_id = auth.uid()) enxerga a assinatura de conta via SELECT', async () => {
    const { data, error } = await memberA.client
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaContaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(assinaturaContaId)
  })

  it('outra conta não enxerga a assinatura de conta alheia', async () => {
    const { data, error } = await memberB.client
      .from('assinaturas')
      .select('*')
      .eq('id', assinaturaContaId)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro autenticado não consegue inserir em assinaturas', async () => {
    const { data, error } = await memberA.client
      .from('assinaturas')
      .insert({ plano_id: planoId, casamento_id: weddingA.id })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('membro autenticado não consegue atualizar a assinatura existente', async () => {
    const { data, error } = await memberA.client
      .from('assinaturas')
      .update({ iniciado_em: '2000-01-01T00:00:00.000Z' })
      .eq('id', assinaturaId)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('assinaturas')
      .select('iniciado_em')
      .eq('id', assinaturaId)
      .single()
    expect(unchanged?.iniciado_em).not.toBe('2000-01-01T00:00:00.000Z')
  })

  it('membro autenticado não consegue excluir a assinatura existente', async () => {
    await memberA.client.from('assinaturas').delete().eq('id', assinaturaId)

    const { data: stillThere } = await admin
      .from('assinaturas')
      .select('id')
      .eq('id', assinaturaId)
      .maybeSingle()
    expect(stillThere?.id).toBe(assinaturaId)
  })
})
