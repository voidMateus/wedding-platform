import { concederOperadorSchema } from '#shared/schemas/operadores-plataforma'
import { serverSupabaseUser } from '#supabase/server'

/**
 * Concede acesso de operador da plataforma (docs/fase6-contas-e-acessos.md §8).
 *
 * auditoria em transação: a trilha nasce dentro de
 * `conceder_operador_plataforma()`, no mesmo commit da linha de
 * `operadores_plataforma` — nunca numa chamada depois. É a mesma decisão de
 * `criar_casamento_com_dono`, e é o que torna o invariante 4 ("toda concessão
 * gera trilha") verdadeiro por construção em vez de por disciplina.
 *
 * ## Por e-mail, e por convite
 *
 * Decisão 4.3: o candidato é um colega, não quem está rodando o comando —
 * então vale o mesmo caminho do resto da plataforma
 * (`resolverOuConvidarUsuario`), e não o `createUser` com senha impressa que o
 * script de bootstrap usa. Quem já tem conta é reaproveitado; quem não tem
 * recebe convite.
 *
 * ## Fronteira transacional
 *
 * `inviteUserByEmail` cria linha em `auth.users` E dispara e-mail, e nenhuma
 * das duas volta atrás com rollback. Por isso o usuário é resolvido ANTES da
 * chamada ao banco: falhando aqui, nada foi escrito no nosso schema; falhando
 * depois, o pior resíduo é um convite para quem ainda não é operador —
 * autocurável, porque a próxima tentativa reaproveita o usuário.
 *
 * ## Idempotente
 *
 * Conceder a quem já é operador devolve `concedido: false`: não duplica linha
 * (o `on conflict` da função), não escreve segunda trilha e não dispara segundo
 * convite (o usuário já existe, então `resolverOuConvidarUsuario` não convida).
 * Invariante 9.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformOperator(event)
  const operador = await serverSupabaseUser(event)
  const admin = supabaseAdmin(event)

  const body = await readValidatedBody(event, (corpo) => concederOperadorSchema.safeParse(corpo))
  if (!body.success) {
    throw badRequestError(body.error.issues[0]?.message ?? 'Dados inválidos.')
  }

  const { email } = body.data
  const usuarioId = await resolverOuConvidarUsuario(admin, email)

  const { data: concedido, error } = await admin.rpc('conceder_operador_plataforma', {
    p_alvo: usuarioId,
    p_ator: operador!.sub,
    p_alvo_email: email,
  })

  if (error) throw badRequestError(error.message)

  return { data: { usuarioId, email, concedido: concedido === true } }
})
