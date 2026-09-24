import { consultaDeAcessosSchema } from '#shared/schemas/operadores-plataforma'

/**
 * "Este e-mail alcança quais eventos?" (docs/fase6-contas-e-acessos.md §6).
 *
 * ## Leitura, e só leitura
 *
 * Decisão 4.5, e o motivo é estrutural: a Fase 5 decidiu que a equipe interna
 * entra num casamento por um vínculo REAL e identificável, para que toda ação
 * apareça na trilha do casal. Se o `/plataforma` pudesse remover
 * `membros_casamento` direto, existiria um segundo caminho administrativo por
 * fora desse modelo — e a accountability que a Fase 5 comprou sumiria. Aqui se
 * pergunta "quem tem acesso"; alterar acesso continua sendo operação de dentro
 * do casamento (invariante 7).
 *
 * ## Três coisas, não uma
 *
 * Membership e suporte saem em listas SEPARADAS, na API e não só na tela
 * (invariante 6). Fundi-los para facilitar a listagem seria criar a confusão no
 * modelo de dados para resolvê-la no template.
 *
 * E o suporte **vencido** não entra em nenhuma das duas: `is_membro_casamento`
 * já o ignora na leitura (a expiração vale na leitura, não numa varredura), e
 * mostrá-lo como acesso seria a tela afirmando o contrário do banco.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const admin = supabaseAdmin(event)

  const query = await getValidatedQuery(event, (q) => consultaDeAcessosSchema.safeParse(q))
  if (!query.success) {
    throw badRequestError(query.error.issues[0]?.message ?? 'Consulta inválida.')
  }

  const email = query.data.email.toLowerCase()
  const usuarios = await listarTodosUsuarios(admin)
  const usuario = usuarios.find((u) => u.email?.toLowerCase() === email)

  if (!usuario) {
    // Não é erro: "este e-mail não alcança nada" é uma resposta legítima da
    // pergunta, e 404 faria a tela tratar ausência como falha.
    return { data: { email, encontrado: false, acessos: [], suportes: [] } }
  }

  const { data: vinculos, error } = await admin
    .from('membros_casamento')
    .select('papel, acesso_suporte_expira_em, casamentos (id, slug, nomes_noivos, data_evento)')
    .eq('usuario_id', usuario.id)

  if (error) throw badRequestError(error.message)

  const agora = Date.now()
  const acessos = []
  const suportes = []

  for (const vinculo of vinculos ?? []) {
    const casamento = vinculo.casamentos
    if (!casamento) continue

    const evento = {
      casamentoId: casamento.id,
      slug: casamento.slug,
      nomesNoivos: casamento.nomes_noivos,
      dataEvento: casamento.data_evento,
    }

    if (vinculo.acesso_suporte_expira_em === null) {
      acessos.push({ ...evento, papel: vinculo.papel })
      continue
    }

    if (new Date(vinculo.acesso_suporte_expira_em).getTime() > agora) {
      suportes.push({ ...evento, expiraEm: vinculo.acesso_suporte_expira_em })
    }
  }

  return { data: { email, encontrado: true, acessos, suportes } }
})
