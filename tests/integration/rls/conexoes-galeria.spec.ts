import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAnonClient, getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestGalleryConnection } from '../../factories/gallery-connection'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2) —
 * mesmo padrão de `convidados.spec.ts`. Diferente de `fotos`, esta tabela
 * NÃO tem nenhuma policy pública — guarda tokens OAuth cifrados
 * (supabase/migrations/20260807120001_gallery_source_connections.sql,
 * comentário da tabela: "Nenhuma policy pública nesta tabela: ela tem
 * segredo, e a galeria pública lê só de photos"). CRUD completo restrito ao
 * membro do próprio casamento.
 */
describe('RLS: conexoes_galeria', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let connectionA: Awaited<ReturnType<typeof createTestGalleryConnection>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    connectionA = await createTestGalleryConnection(admin, weddingA.id, {
      nome_pasta: 'Pasta do Casamento A',
    })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a conexão normalmente', async () => {
    const { data, error } = await memberA.client
      .from('conexoes_galeria')
      .select('*')
      .eq('id', connectionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(connectionA.id)
  })

  it('membro de outro casamento não lê a conexão (RLS filtra a linha)', async () => {
    const { data, error } = await memberB.client
      .from('conexoes_galeria')
      .select('*')
      .eq('id', connectionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('visitante anônimo não lê a conexão — não existe policy pública nesta tabela (guarda tokens)', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon
      .from('conexoes_galeria')
      .select('*')
      .eq('id', connectionA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('membro de outro casamento não consegue atualizar a conexão', async () => {
    const { data, error } = await memberB.client
      .from('conexoes_galeria')
      .update({ nome_pasta: 'Pasta Alterada Indevidamente' })
      .eq('id', connectionA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('conexoes_galeria')
      .select('nome_pasta')
      .eq('id', connectionA.id)
      .single()
    expect(unchanged?.nome_pasta).toBe('Pasta do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a conexão', async () => {
    await memberB.client.from('conexoes_galeria').delete().eq('id', connectionA.id)

    const { data: stillThere } = await admin
      .from('conexoes_galeria')
      .select('id')
      .eq('id', connectionA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(connectionA.id)
  })

  it('membro de um casamento não consegue inserir conexão de galeria em outro casamento', async () => {
    // Alvo é o casamento B (sem conexão própria ainda) para isolar o motivo
    // da rejeição na RLS — casamento A já tem uma linha e colidiria com a
    // constraint de unicidade (uma conexão por casamento) independente de RLS.
    const { data, error } = await memberA.client
      .from('conexoes_galeria')
      .insert({
        casamento_id: weddingB.id,
        provedor: 'google_drive',
        modo: 'public_link',
        id_pasta: 'pasta-intrusa',
      })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()

    const { data: stillNone } = await admin
      .from('conexoes_galeria')
      .select('id')
      .eq('casamento_id', weddingB.id)
      .maybeSingle()
    expect(stillNone).toBeNull()
  })
})
