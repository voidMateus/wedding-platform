import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getServiceRoleClient } from '../helpers/supabase-clients'
import { createTestApiClient } from '../helpers/http-client'
import { getAdminSessionCookie } from '../helpers/admin-session'
import { cleanupAll } from '../helpers/cleanup'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, deleteTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'

/**
 * Integração — `POST /api/platform/weddings`
 * (docs/fase5-multievento.md seção 6).
 *
 * É a ação mais sensível do produto: cria um tenant e dá posse dele a alguém.
 * O que precisa ser verdade em produção, e por isso é verificado aqui contra o
 * servidor e o banco reais:
 *
 * - só operador de plataforma passa pelo portão;
 * - o casamento nasce RASCUNHO (criar não publica);
 * - o dono é vinculado, e vira dono de verdade;
 * - a criação deixa trilha com `tipo_autor = 'operador'`;
 * - duplo envio não gera dois tenants (o slug é a chave de idempotência).
 */
describe('api: POST /api/platform/weddings', () => {
  const admin = getServiceRoleClient()

  // O operador precisa ser um usuário de auth real com linha em
  // operadores_plataforma. Reaproveita a fábrica de membro para nascer com
  // sessão, e o casamento dela é descartável — ser membro de um casamento é
  // ortogonal a ser operador.
  let casamentoDoOperador: Awaited<ReturnType<typeof createTestWedding>>
  let operador: Awaited<ReturnType<typeof createTestMember>>
  let cookieOperador: string

  let casamentoComum: Awaited<ReturnType<typeof createTestWedding>>
  let membroComum: Awaited<ReturnType<typeof createTestMember>>
  let cookieComum: string

  const criados: string[] = []
  const usuariosCriados: string[] = []

  beforeAll(async () => {
    casamentoDoOperador = await createTestWedding(admin)
    operador = await createTestMember(admin, casamentoDoOperador.id)
    cookieOperador = await getAdminSessionCookie(operador.email, TEST_MEMBER_PASSWORD)

    const { error } = await admin
      .from('operadores_plataforma')
      .insert({ usuario_id: operador.userId })
    if (error) {
      throw new Error(`Falha ao criar operador de teste: ${error.message}`)
    }

    casamentoComum = await createTestWedding(admin)
    membroComum = await createTestMember(admin, casamentoComum.id)
    cookieComum = await getAdminSessionCookie(membroComum.email, TEST_MEMBER_PASSWORD)
  })

  afterAll(async () => {
    await cleanupAll([
      ...criados.map((id) => () => deleteTestWedding(admin, id)),
      ...usuariosCriados.map((id) => () => deleteTestMember(admin, id)),
      () =>
        admin
          .from('operadores_plataforma')
          .delete()
          .eq('usuario_id', operador.userId)
          .then(() => undefined),
      () => deleteTestMember(admin, operador.userId),
      () => deleteTestWedding(admin, casamentoDoOperador.id),
      () => deleteTestMember(admin, membroComum.userId),
      () => deleteTestWedding(admin, casamentoComum.id),
    ])
  })

  /**
   * O e-mail do dono é de um usuário que JÁ EXISTE, criado aqui pela API de
   * admin.
   *
   * Não é conveniência: `inviteUserByEmail` esbarra no limite de envio de
   * e-mail do Supabase Auth (2/hora no SMTP embutido), e uma suíte que o
   * exercitasse passaria a falhar por rate limit em vez de por regressão. O
   * caminho "usuário novo, convite disparado" continua coberto onde ele é o
   * assunto — `POST /api/wedding/members` —, e aqui o que se verifica é a
   * transação: casamento + dono + trilha, tudo ou nada.
   */
  async function novoCorpo() {
    const sufixo = randomUUID().slice(0, 8)
    const emailDono = `teste-integracao-${randomUUID()}@example.com`

    const { data, error } = await admin.auth.admin.createUser({
      email: emailDono,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      throw new Error(`Falha ao criar usuário dono de teste: ${error?.message}`)
    }
    usuariosCriados.push(data.user.id)

    return {
      slug: `teste-integracao-plat-${sufixo}`,
      nomesNoivos: `Teste & Plataforma ${sufixo}`,
      dataEvento: '2031-05-05',
      emailDono,
    }
  }

  it('recusa quem não é operador de plataforma', async () => {
    const client = createTestApiClient({ cookie: cookieComum })
    const res = await client.post('/api/platform/weddings', await novoCorpo())

    expect(res.status).toBe(403)
  })

  it('recusa sem sessão nenhuma', async () => {
    const client = createTestApiClient({})
    const res = await client.post('/api/platform/weddings', await novoCorpo())

    expect(res.status).toBe(401)
  })

  it('recusa slug reservado', async () => {
    const client = createTestApiClient({ cookie: cookieOperador })
    const res = await client.post('/api/platform/weddings', {
      ...(await novoCorpo()),
      slug: 'admin',
    })

    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(res.status).toBeLessThan(500)
  })

  it('cria o casamento em rascunho, com dono e trilha de operador', async () => {
    const corpo = await novoCorpo()
    const client = createTestApiClient({ cookie: cookieOperador })
    const res = await client.post('/api/platform/weddings', corpo)

    expect(res.status).toBe(201)
    const body = await res.json()
    const casamentoId = body.data.id as string
    criados.push(casamentoId)

    // 1. Criar NUNCA publica: o site responde 404 até o casal publicar.
    expect(body.data.status_ciclo_vida).toBe('rascunho')
    expect(body.data.slug).toBe(corpo.slug)

    // 2. O dono existe, e é dono de verdade.
    const { data: membros } = await admin
      .from('membros_casamento')
      .select('usuario_id, papel')
      .eq('casamento_id', casamentoId)

    expect(membros).toHaveLength(1)
    expect(membros?.[0]?.papel).toBe('dono')

    // 3. A trilha nasce junto, com o operador identificado — e dentro da mesma
    // transação, então nunca existe tenant sem registro.
    const { data: trilha } = await admin
      .from('trilha_auditoria')
      .select('acao, tipo_autor, autor_id, autor_operador_id')
      .eq('casamento_id', casamentoId)

    expect(trilha).toHaveLength(1)
    expect(trilha?.[0]?.acao).toBe('casamento.criar')
    expect(trilha?.[0]?.tipo_autor).toBe('operador')
    expect(trilha?.[0]?.autor_id).toBeNull()
    expect(trilha?.[0]?.autor_operador_id).toBe(operador.userId)
  })

  it('duplo envio do mesmo slug devolve 409 e não cria um segundo tenant', async () => {
    const corpo = await novoCorpo()
    const client = createTestApiClient({ cookie: cookieOperador })

    const primeira = await client.post('/api/platform/weddings', corpo)
    expect(primeira.status).toBe(201)
    const body = await primeira.json()
    criados.push(body.data.id as string)

    const segunda = await client.post('/api/platform/weddings', corpo)
    expect(segunda.status).toBe(409)

    const { data: comEsseSlug } = await admin.from('casamentos').select('id').eq('slug', corpo.slug)

    expect(comEsseSlug).toHaveLength(1)
  })
})
