import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { getAnonClient, getServiceRoleClient } from './helpers/supabase-clients'
import { cleanupAll } from './helpers/cleanup'
import { TEST_MEMBER_PASSWORD } from '../factories/member'

/**
 * Os invariantes de segurança da Fase 6 (docs/fase6-contas-e-acessos.md §7).
 *
 * Eles são o contrato da fase, escritos ANTES das rotas de propósito: a regra
 * mora no banco (função Postgres), então ela pode — e deve — ser exercida sem
 * passar por HTTP nenhum. Uma rota que esqueça a trava não faz a trava sumir.
 *
 * ## Operador não tem tenant, e isso muda como se testa
 *
 * Todo o resto da suíte se isola criando um casamento próprio por teste. Um
 * operador não pertence a casamento nenhum: `operadores_plataforma` é uma
 * tabela global, e dois testes que mexem nela disputam o mesmo estado.
 *
 * Isso tem consequência direta no invariante 1 ("sempre existe ao menos um
 * operador"): exercê-lo exige que o total seja exatamente 1, e o único jeito
 * honesto de chegar lá num banco compartilhado seria apagar os operadores de
 * verdade — inaceitável no `dev`, onde há gente logada no `/plataforma`.
 *
 * Então ele roda onde a condição pode ser montada sem destruir nada: o banco
 * do CI, que nasce das migrations com a tabela VAZIA (o `seed.sql` não cria
 * operador). Localmente, contra o `dev`, ele é pulado — e o teste diz isso em
 * voz alta, com o total que encontrou, para o pulo nunca ser silencioso.
 */
describe('invariantes: operadores da plataforma', () => {
  const admin = getServiceRoleClient()

  interface Usuario {
    id: string
    email: string
  }

  const usuariosCriados: string[] = []

  async function criarUsuario(): Promise<Usuario> {
    const email = `teste-operador-${randomUUID()}@example.com`
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_MEMBER_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) throw new Error(`Falha ao criar usuário: ${error?.message}`)
    usuariosCriados.push(data.user.id)
    return { id: data.user.id, email }
  }

  async function totalDeOperadores(): Promise<number> {
    const { count, error } = await admin
      .from('operadores_plataforma')
      .select('usuario_id', { count: 'exact', head: true })
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  async function trilhaDe(alvoEmail: string) {
    const { data, error } = await admin
      .from('trilha_auditoria_plataforma')
      .select('*')
      .eq('alvo_email', alvoEmail)
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return data
  }

  /** Quantos operadores havia ANTES do arquivo — define o que dá para exercer. */
  let baseline = 0
  /** O operador que age nos testes; ele mesmo é concedido por `service_role`. */
  let ator: Usuario

  beforeAll(async () => {
    baseline = await totalDeOperadores()
    ator = await criarUsuario()
    const { error } = await admin.from('operadores_plataforma').insert({ usuario_id: ator.id })
    if (error) throw new Error(`Falha ao criar o operador ator: ${error.message}`)
  })

  afterAll(async () => {
    await cleanupAll([
      () =>
        admin
          .from('operadores_plataforma')
          .delete()
          .in('usuario_id', usuariosCriados)
          .then(() => undefined),
      ...usuariosCriados.map((id) => () => admin.auth.admin.deleteUser(id).then(() => undefined)),
    ])
  })

  /** Invariante 4: toda concessão gera trilha. */
  it('conceder cria o operador e registra na trilha', async () => {
    const alvo = await criarUsuario()

    const { data, error } = await admin.rpc('conceder_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: ator.id,
      p_alvo_email: alvo.email,
    })

    expect(error).toBeNull()
    expect(data).toBe(true)

    const { data: linha } = await admin
      .from('operadores_plataforma')
      .select('usuario_id')
      .eq('usuario_id', alvo.id)
      .maybeSingle()
    expect(linha).not.toBeNull()

    const trilha = await trilhaDe(alvo.email)
    expect(trilha).toHaveLength(1)
    expect(trilha[0]?.tipo_acao).toBe('operador.concedido')
    expect(trilha[0]?.autor_operador_id).toBe(ator.id)
    expect(trilha[0]?.alvo_usuario_id).toBe(alvo.id)
  })

  /** Invariante 9: conceder é idempotente — nem linha nem trilha duplicadas. */
  it('conceder de novo não duplica linha nem trilha', async () => {
    const alvo = await criarUsuario()

    const primeira = await admin.rpc('conceder_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: ator.id,
      p_alvo_email: alvo.email,
    })
    const segunda = await admin.rpc('conceder_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: ator.id,
      p_alvo_email: alvo.email,
    })

    expect(primeira.data).toBe(true)
    // `false` é a resposta honesta de "já era operador": a chamada não falha,
    // mas também não finge ter concedido algo.
    expect(segunda.data).toBe(false)

    const { count } = await admin
      .from('operadores_plataforma')
      .select('usuario_id', { count: 'exact', head: true })
      .eq('usuario_id', alvo.id)
    expect(count).toBe(1)

    const trilha = await trilhaDe(alvo.email)
    expect(trilha).toHaveLength(1)
  })

  /** Invariantes 2 e 3: autoalteração proibida. */
  it('um operador não revoga a si próprio', async () => {
    const { error } = await admin.rpc('revogar_operador_plataforma', {
      p_alvo: ator.id,
      p_ator: ator.id,
      p_alvo_email: ator.email,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('não altera o próprio acesso')

    // E continua operador — a recusa não pode ter efeito colateral.
    const { data: aindaLa } = await admin
      .from('operadores_plataforma')
      .select('usuario_id')
      .eq('usuario_id', ator.id)
      .maybeSingle()
    expect(aindaLa).not.toBeNull()
  })

  it('revogar quem não é operador é recusado, e a mensagem diz isso', async () => {
    const estranho = await criarUsuario()

    const { error } = await admin.rpc('revogar_operador_plataforma', {
      p_alvo: estranho.id,
      p_ator: ator.id,
      p_alvo_email: estranho.email,
    })

    expect(error).not.toBeNull()
    expect(error?.message).toContain('não é operador')
  })

  /** Invariante 4, do outro lado: toda revogação gera trilha. */
  it('revogar apaga o operador e registra na trilha', async () => {
    const alvo = await criarUsuario()
    await admin.rpc('conceder_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: ator.id,
      p_alvo_email: alvo.email,
    })

    const { error } = await admin.rpc('revogar_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: ator.id,
      p_alvo_email: alvo.email,
    })
    expect(error).toBeNull()

    const { data: linha } = await admin
      .from('operadores_plataforma')
      .select('usuario_id')
      .eq('usuario_id', alvo.id)
      .maybeSingle()
    expect(linha).toBeNull()

    const trilha = await trilhaDe(alvo.email)
    expect(trilha.map((l) => l.tipo_acao)).toEqual(['operador.concedido', 'operador.revogado'])
  })

  /** Invariante 5: a trilha sobrevive à saída de quem agiu e de quem sofreu. */
  it('a trilha sobrevive à exclusão do autor e do alvo', async () => {
    const autor = await criarUsuario()
    await admin.from('operadores_plataforma').insert({ usuario_id: autor.id })
    const alvo = await criarUsuario()

    await admin.rpc('conceder_operador_plataforma', {
      p_alvo: alvo.id,
      p_ator: autor.id,
      p_alvo_email: alvo.email,
    })

    // Some com os dois usuários de auth — o cascata leva as linhas de
    // operadores_plataforma junto.
    await admin.auth.admin.deleteUser(autor.id)
    await admin.auth.admin.deleteUser(alvo.id)

    const trilha = await trilhaDe(alvo.email)
    expect(trilha).toHaveLength(1)
    // As FKs viram nulas; o e-mail denormalizado é o que mantém a linha legível.
    expect(trilha[0]?.autor_operador_id).toBeNull()
    expect(trilha[0]?.alvo_usuario_id).toBeNull()
    expect(trilha[0]?.alvo_email).toBe(alvo.email)
  })

  /**
   * O buraco que o `security definer` abre, e que o `revoke execute` fecha.
   *
   * As funções recebem o ATOR por parâmetro, porque sob `service_role` o
   * `auth.uid()` é nulo. Isso significa que elas confiam no id que recebem — e
   * função nova no Supabase nasce executável por `public`. Sem o `revoke`,
   * qualquer usuário autenticado chamaria a RPC passando como `p_ator` o id de
   * um operador de verdade (que a checagem interna aceitaria) e se concederia
   * acesso de operador.
   */
  it('usuário autenticado comum não executa as funções', async () => {
    const intruso = await criarUsuario()
    const anon = getAnonClient()
    const { error: loginError } = await anon.auth.signInWithPassword({
      email: intruso.email,
      password: TEST_MEMBER_PASSWORD,
    })
    expect(loginError).toBeNull()

    const { error } = await anon.rpc('conceder_operador_plataforma', {
      p_alvo: intruso.id,
      p_ator: ator.id,
      p_alvo_email: intruso.email,
    })

    expect(error).not.toBeNull()

    const { data: virouOperador } = await admin
      .from('operadores_plataforma')
      .select('usuario_id')
      .eq('usuario_id', intruso.id)
      .maybeSingle()
    expect(virouOperador).toBeNull()

    await anon.auth.signOut()
  })

  /**
   * Invariante 1 — e a descoberta de que ele só se exerce por CORRIDA.
   *
   * Sequencialmente a trava do último operador é inalcançável, e entender por
   * quê é o que dá sentido ao teste: o ator precisa ser operador, o alvo
   * precisa ser operador, e os dois precisam ser pessoas diferentes — logo há
   * pelo menos dois operadores quando a contagem roda. No caminho normal, quem
   * garante que sempre sobra alguém é a proibição de autoalteração, não a
   * contagem.
   *
   * A contagem existe para o caso que a checagem sequencial não cobre: **A
   * revoga B enquanto B revoga A**. As duas transações passam por todas as
   * checagens — as duas são verdadeiras quando cada uma as faz — e a plataforma
   * fica sem operador nenhum. O `for update` serializa, e a contagem faz a
   * segunda recuar.
   *
   * Exercer isso exige que A e B sejam os ÚNICOS operadores, o que só se monta
   * num banco que nasce vazio (o do CI; o `seed.sql` não cria operador). Contra
   * o `dev` o teste é pulado, dizendo o total que encontrou — um teste que se
   * pula calado é um teste que não existe.
   */
  it('duas revogações simultâneas não esvaziam a plataforma', async () => {
    // No CI o banco nasce das migrations e o `seed.sql` não cria operador, então
    // baseline diferente de zero ali significa que ALGUM arquivo anterior
    // vazou um operador (a suíte roda sequencial). Falhar é o certo: sem isto o
    // único teste que exerce a trava de corrida se pularia calado justamente
    // onde ele é o gate, e "8 passed" descreveria sete.
    if (process.env.CI) {
      expect(
        baseline,
        'No CI a tabela de operadores precisa começar vazia — algum teste anterior não limpou o que criou.',
      ).toBe(0)
    }

    if (baseline !== 0) {
      console.log(
        `[invariante 1] pulado: o banco já tinha ${baseline} operador(es) antes do teste. ` +
          'A corrida só se monta quando os dois operadores da vez são os ÚNICOS, ' +
          'o que exigiria apagar operadores de verdade neste banco.',
      )
      return
    }

    // `ator` (do beforeAll) e `b` passam a ser os únicos dois operadores.
    const b = await criarUsuario()
    await admin.rpc('conceder_operador_plataforma', {
      p_alvo: b.id,
      p_ator: ator.id,
      p_alvo_email: b.email,
    })
    expect(await totalDeOperadores()).toBe(2)

    // A revoga B e B revoga A, ao mesmo tempo.
    const [aRevogaB, bRevogaA] = await Promise.all([
      admin.rpc('revogar_operador_plataforma', {
        p_alvo: b.id,
        p_ator: ator.id,
        p_alvo_email: b.email,
      }),
      admin.rpc('revogar_operador_plataforma', {
        p_alvo: ator.id,
        p_ator: b.id,
        p_alvo_email: ator.email,
      }),
    ])

    const falhas = [aRevogaB.error, bRevogaA.error].filter(Boolean)
    expect(falhas).toHaveLength(1)
    expect(falhas[0]?.message).toContain('sem operador')

    // O que de fato importa: sobrou alguém.
    expect(await totalDeOperadores()).toBe(1)

    // Repõe o que sobrou para o afterAll ter o que limpar em qualquer ordem.
    await admin
      .from('operadores_plataforma')
      .upsert({ usuario_id: ator.id }, { onConflict: 'usuario_id' })
  })
})
