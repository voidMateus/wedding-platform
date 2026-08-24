import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestInviteTag } from '../../factories/invite-tag'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * um `auth.uid()` de um casamento nunca lê/escreve dado de outro casamento.
 * `etiquetas_convite` tem `casamento_id` próprio (supabase/migrations/
 * 20260803120010_invite_tags.sql) — CRUD completo para qualquer membro do
 * casamento dono, igual ao padrão de `convidados`. Nunca usa o client
 * `service_role` para as asserções em si (ele ignora RLS) — só para
 * criar/limpar a massa de dados.
 */
describe('RLS: etiquetas_convite', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let tagA: Awaited<ReturnType<typeof createTestInviteTag>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    tagA = await createTestInviteTag(admin, weddingA.id, { nome: 'Etiqueta do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a etiqueta normalmente', async () => {
    const { data, error } = await memberA.client.from('etiquetas_convite').select('*').eq('id', tagA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(tagA.id)
  })

  it('membro de outro casamento não lê a etiqueta (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client.from('etiquetas_convite').select('*').eq('id', tagA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a etiqueta', async () => {
    const { data, error } = await memberB.client
      .from('etiquetas_convite')
      .update({ nome: 'Nome Alterado Indevidamente' })
      .eq('id', tagA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('etiquetas_convite').select('nome').eq('id', tagA.id).single()
    expect(unchanged?.nome).toBe('Etiqueta do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a etiqueta', async () => {
    await memberB.client.from('etiquetas_convite').delete().eq('id', tagA.id)

    const { data: stillThere } = await admin.from('etiquetas_convite').select('id').eq('id', tagA.id).maybeSingle()
    expect(stillThere?.id).toBe(tagA.id)
  })

  it('membro de outro casamento não consegue inserir etiqueta no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('etiquetas_convite')
      .insert({ casamento_id: weddingA.id, nome: 'Etiqueta Intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
