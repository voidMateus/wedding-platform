import { platformWeddingCreateSchema } from '#shared/schemas/platform-wedding'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Cria um casamento pelo painel interno (docs/fase5-multievento.md seção 6).
 *
 * Até esta rota existir, cliente novo era um INSERT à mão no banco de
 * produção — sem registro de quem fez. É a ação mais sensível do produto:
 * cria um tenant e dá posse dele a alguém.
 *
 * `requirePlatformOperator()` é o portão real, e só depois dele entra o
 * `service_role` — mesmo desenho de GET /api/platform/overview. RLS não
 * protege nada aqui: `casamentos` não tem policy de INSERT, e nunca deve ter
 * (CLAUDE.md 4.2 — o caminho Plataforma é sempre service_role + checagem
 * explícita, jamais uma policy cross-tenant "de conveniência").
 *
 * ## A ordem importa, e é a fronteira transacional
 *
 * 1. Resolve/convida o usuário do dono — FORA da transação (o convite manda
 *    e-mail e cria linha em auth.users; nada disso volta atrás).
 * 2. `criar_casamento_com_dono()` escreve casamento + membro + auditoria
 *    numa transação só.
 *
 * auditoria em transação: o registro (`tipo_autor = 'operador'`, ação
 * `casamento.criar`) é escrito dentro de `criar_casamento_com_dono()`, junto
 * do tenant que ele descreve. Registrar aqui em TypeScript, depois do commit,
 * abriria a janela em que o casamento existe e a trilha não — justamente na
 * ação em que isso não pode acontecer.
 *
 * Invertida, a falha do passo 1 deixaria um casamento sem dono: um tenant que
 * ninguém alcança. Nesta ordem, o pior resíduo é um convite para alguém que
 * ainda não pertence a casamento nenhum — autocurável, e com destino já
 * implementado (o vazio de /admin).
 *
 * ## Duplo envio
 *
 * O `unique` de `casamentos.slug` é a chave de idempotência
 * (docs/fase5-multievento.md 6.3): duplo clique, requisição repetida e corrida
 * entre dois operadores desembocam todos em exatamente um casamento, com 409
 * para os perdedores. Não há chave de idempotência própria de propósito — ela
 * pediria tabela nova para cobrir o que a restrição existente já cobre.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)

  const operador = await serverSupabaseUser(event)
  const input = await validateBody(event, platformWeddingCreateSchema)
  const admin = supabaseAdmin(event)

  // Antes de convidar ninguém: um slug tomado é o caso comum de duplo envio, e
  // descobri-lo aqui evita disparar um e-mail de convite que a transação
  // seguinte vai desperdiçar.
  const { data: existente, error: slugError } = await admin
    .from('casamentos')
    .select('id')
    .eq('slug', input.slug)
    .maybeSingle()

  if (slugError) {
    throw badRequestError(slugError.message)
  }
  if (existente) {
    throw conflictError('Já existe um casamento com este endereço.')
  }

  const usuarioDono = await resolverOuConvidarUsuario(admin, input.emailDono)

  const { data, error } = await admin.rpc('criar_casamento_com_dono', {
    p_slug: input.slug,
    p_nomes_noivos: input.nomesNoivos,
    p_data_evento: input.dataEvento,
    p_usuario_dono: usuarioDono,
    p_operador: operador!.sub,
  })

  if (error) {
    // A corrida que a checagem acima não cobre: dois operadores criando o
    // mesmo slug ao mesmo tempo. A garantia é a constraint, não a consulta.
    if (error.code === '23505') {
      throw conflictError('Já existe um casamento com este endereço.')
    }
    throw badRequestError(error.message)
  }

  setResponseStatus(event, 201)
  return { data }
})
