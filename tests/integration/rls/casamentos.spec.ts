import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient, getAnonClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * `casamentos` é a única tabela com policy pública de leitura (o site
 * público do casamento não tem autenticação nem token de convidado), então
 * além do isolamento cross-tenant de update/delete, também confirma que o
 * client anônimo lê normalmente mas nunca escreve. Nunca usa o client
 * `service_role` para as asserções em si (ele ignora RLS) — só para
 * criar/limpar a massa de dados.
 */
describe('RLS: casamentos', () => {
  const admin = getServiceRoleClient()
  const anon = getAnonClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember

  beforeAll(async () => {
    weddingA = await createTestWedding(admin, { nomes_noivos: 'Casamento A & Teste' })
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê o casamento normalmente', async () => {
    const { data, error } = await memberA.client.from('casamentos').select('*').eq('id', weddingA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(weddingA.id)
  })

  it('membro do próprio casamento consegue atualizar o casamento', async () => {
    const { data, error } = await memberA.client
      .from('casamentos')
      .update({ nomes_noivos: 'Nome Atualizado Pelo Membro' })
      .eq('id', weddingA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)

    const { data: updated } = await admin.from('casamentos').select('nomes_noivos').eq('id', weddingA.id).single()
    expect(updated?.nomes_noivos).toBe('Nome Atualizado Pelo Membro')
  })

  it('membro de outro casamento não consegue atualizar o casamento A', async () => {
    const { data, error } = await memberB.client
      .from('casamentos')
      .update({ nomes_noivos: 'Nome Alterado Indevidamente' })
      .eq('id', weddingA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('casamentos').select('nomes_noivos').eq('id', weddingA.id).single()
    expect(unchanged?.nomes_noivos).not.toBe('Nome Alterado Indevidamente')
  })

  it('membro de outro casamento não consegue excluir o casamento A', async () => {
    await memberB.client.from('casamentos').delete().eq('id', weddingA.id)

    const { data: stillThere } = await admin.from('casamentos').select('id').eq('id', weddingA.id).maybeSingle()
    expect(stillThere?.id).toBe(weddingA.id)
  })

  it('client anônimo consegue ler o casamento (policy pública, site sem autenticação)', async () => {
    const { data, error } = await anon.from('casamentos').select('*').eq('id', weddingA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(weddingA.id)
  })

  it('client anônimo não consegue atualizar o casamento', async () => {
    const { data, error } = await anon
      .from('casamentos')
      .update({ nomes_noivos: 'Nome Alterado Por Anônimo' })
      .eq('id', weddingA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin.from('casamentos').select('nomes_noivos').eq('id', weddingA.id).single()
    expect(unchanged?.nomes_noivos).not.toBe('Nome Alterado Por Anônimo')
  })

  it('client anônimo não consegue excluir o casamento', async () => {
    await anon.from('casamentos').delete().eq('id', weddingA.id)

    const { data: stillThere } = await admin.from('casamentos').select('id').eq('id', weddingA.id).maybeSingle()
    expect(stillThere?.id).toBe(weddingA.id)
  })
})
