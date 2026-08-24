import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getAnonClient, getServiceRoleClient } from '../helpers/supabase-clients'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, type TestMember } from '../../factories/member'
import { createTestPhoto } from '../../factories/photo'

/**
 * Suíte de isolamento entre tenants (docs/ARCHITECTURE.md, seção 9.1/9.2).
 * `fotos` é diferente das demais tabelas administrativas: além do CRUD por
 * membro, tem uma policy pública de SELECT (`fotos_select_publico using
 * (true)`, supabase/migrations/20260731160002_photos_select_public.sql) —
 * mesmo padrão de `casamentos`/`etapas_evento`, pois a galeria do site
 * público lê sem autenticação. Por isso o isolamento entre tenants só se
 * aplica às operações de escrita — leitura é deliberadamente pública, tanto
 * para membro de outro casamento quanto para visitante anônimo.
 */
describe('RLS: fotos', () => {
  const admin = getServiceRoleClient()

  let weddingA: Awaited<ReturnType<typeof createTestWedding>>
  let weddingB: Awaited<ReturnType<typeof createTestWedding>>
  let memberA: TestMember
  let memberB: TestMember
  let photoA: Awaited<ReturnType<typeof createTestPhoto>>

  beforeAll(async () => {
    weddingA = await createTestWedding(admin)
    weddingB = await createTestWedding(admin)
    memberA = await createTestMember(admin, weddingA.id)
    memberB = await createTestMember(admin, weddingB.id)
    photoA = await createTestPhoto(admin, weddingA.id, { legenda: 'Foto do Casamento A' })
  })

  afterAll(async () => {
    await cleanupAll([
      () => deleteTestMember(admin, memberA.userId),
      () => deleteTestMember(admin, memberB.userId),
      () => deleteTestWedding(admin, weddingA.id),
      () => deleteTestWedding(admin, weddingB.id),
    ])
  })

  it('membro do próprio casamento lê a foto normalmente', async () => {
    const { data, error } = await memberA.client
      .from('fotos')
      .select('*')
      .eq('id', photoA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(photoA.id)
  })

  it('membro de outro casamento consegue ler a foto (policy pública de select, by design)', async () => {
    const { data, error } = await memberB.client
      .from('fotos')
      .select('*')
      .eq('id', photoA.id)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(photoA.id)
  })

  it('visitante anônimo (sem sessão) consegue ler a foto — galeria pública do site', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon.from('fotos').select('*').eq('id', photoA.id).maybeSingle()
    expect(error).toBeNull()
    expect(data?.id).toBe(photoA.id)
  })

  it('membro de outro casamento não consegue atualizar a foto', async () => {
    const { data, error } = await memberB.client
      .from('fotos')
      .update({ legenda: 'Legenda Alterada Indevidamente' })
      .eq('id', photoA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('fotos')
      .select('legenda')
      .eq('id', photoA.id)
      .single()
    expect(unchanged?.legenda).toBe('Foto do Casamento A')
  })

  it('membro de outro casamento não consegue excluir a foto', async () => {
    await memberB.client.from('fotos').delete().eq('id', photoA.id)

    const { data: stillThere } = await admin
      .from('fotos')
      .select('id')
      .eq('id', photoA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(photoA.id)
  })

  it('membro de outro casamento não consegue inserir foto no casamento A', async () => {
    const { data, error } = await memberB.client
      .from('fotos')
      .insert({ casamento_id: weddingA.id, legenda: 'Foto Intrusa' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })

  it('visitante anônimo não consegue atualizar a foto', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon
      .from('fotos')
      .update({ legenda: 'Legenda Alterada Por Anônimo' })
      .eq('id', photoA.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])

    const { data: unchanged } = await admin
      .from('fotos')
      .select('legenda')
      .eq('id', photoA.id)
      .single()
    expect(unchanged?.legenda).toBe('Foto do Casamento A')
  })

  it('visitante anônimo não consegue excluir a foto', async () => {
    const anon = getAnonClient()
    await anon.from('fotos').delete().eq('id', photoA.id)

    const { data: stillThere } = await admin
      .from('fotos')
      .select('id')
      .eq('id', photoA.id)
      .maybeSingle()
    expect(stillThere?.id).toBe(photoA.id)
  })

  it('visitante anônimo não consegue inserir foto', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon
      .from('fotos')
      .insert({ casamento_id: weddingA.id, legenda: 'Foto Intrusa Anônima' })
      .select()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
  })
})
