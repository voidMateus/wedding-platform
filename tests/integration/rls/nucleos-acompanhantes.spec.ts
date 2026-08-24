import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * Nunca usa o client `service_role` para as asserções em si (ele ignora
 * RLS) — só para criar/limpar a massa de dados.
 *
 * `nucleos_acompanhantes` (docs/PRODUCT.md — "Acompanhantes", ex-guest_parties)
 * é uma tabela puramente estrutural: só `casamento_id` além de PK/timestamps
 * (`convidados.nucleo_id` é o único vínculo real). Sem campo de negócio para
 * editar, o teste de update usa `updated_at` só para provar que a policy de
 * UPDATE bloqueia a linha antes mesmo de qualquer trigger rodar.
 */
describe('RLS: nucleos_acompanhantes', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let nucleoA: { id: string; casamento_id: string; updated_at: string }

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)

    const { data, error } = await admin
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: weddingA.id })
      .select()
      .single()
    if (error || !data) {
      throw new Error(`Falha ao criar núcleo de acompanhantes de teste: ${error?.message}`)
    }
    nucleoA = data
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o núcleo normalmente', async () => {
    const { data, error } = await memberA.client
      .from('nucleos_acompanhantes')
      .select('*')
      .eq('id', nucleoA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(nucleoA.id)
  })

  it('membro de outro casamento não lê o núcleo (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('nucleos_acompanhantes')
      .select('*')
      .eq('id', nucleoA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar o núcleo', async () => {
    const { data, error } = await memberB.client
      .from('nucleos_acompanhantes')
      .update({ updated_at: '2020-01-01T00:00:00.000Z' })
      .eq('id', nucleoA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('nucleos_acompanhantes')
      .select('updated_at')
      .eq('id', nucleoA.id)
      .single()
    expect(unchanged?.updated_at).toBe(nucleoA.updated_at)
  })

  it('membro de outro casamento não consegue excluir o núcleo', async () => {
    await memberB.client.from('nucleos_acompanhantes').delete().eq('id', nucleoA.id)

    const { data: stillThere } = await admin
      .from('nucleos_acompanhantes')
      .select('id')
      .eq('id', nucleoA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(nucleoA.id)
  })

  it('membro de outro casamento não consegue inserir núcleo no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('nucleos_acompanhantes')
      .insert({ casamento_id: weddingA.id })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
