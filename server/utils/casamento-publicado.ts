import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

/**
 * O portão do rascunho para o caminho que usa `service_role`.
 *
 * As rotas públicas que leem com a anon key não passam por aqui: elas resolvem
 * `casamentos` por slug antes de tocar em qualquer tabela filha, e a policy
 * `casamentos_select_publico` já devolve nada para um rascunho — uma linha de
 * SQL cobrindo as três. Mas `service_role` **ignora RLS**, então no caminho do
 * convidado e no de presentes a policy não protegeria coisa nenhuma: ali o
 * portão é este, checado em TypeScript, exatamente como manda o modelo de
 * confiança do CLAUDE.md seção 4.2.
 *
 * Responde **404**, nunca 403: "existe, mas você não pode ver" é informação que
 * o caminho público não deve dar — é a mesma resposta de um slug inexistente.
 *
 * Uma exceção, e só uma: se quem pede é membro deste casamento, passa. É o que
 * faz a prévia do próprio rascunho mostrar a lista de presentes de verdade, em
 * vez de uma seção quebrada, sem precisar inventar um "modo de prévia".
 * `resolveWeddingContext` devolve `null` sem sessão e nunca lança, então a
 * exceção não acrescenta caminho de erro nenhum.
 *
 * **O portão barra quem está começando algo, nunca quem está terminando o que
 * já começou** (docs/fase4-onboarding.md 8.1.1): o webhook de pagamento e a
 * consulta de status do checkout ficam de fora, com a dispensa declarada no
 * próprio arquivo — o dinheiro já saiu da conta do convidado, e despublicar o
 * site não pode apagar o efeito de um pagamento em trânsito.
 */
export async function garantirCasamentoPublicado(
  event: H3Event,
  client: SupabaseClient<Database>,
  weddingId: string,
): Promise<void> {
  const { data, error } = await client
    .from('casamentos')
    .select('status_ciclo_vida')
    .eq('id', weddingId)
    .maybeSingle()

  if (error) throw badRequestError(error.message)
  if (data?.status_ciclo_vida === 'publicado') return

  const contexto = await resolveWeddingContext(event)
  if (contexto?.weddingId === weddingId) return

  throw notFoundError('Casamento não encontrado.')
}
