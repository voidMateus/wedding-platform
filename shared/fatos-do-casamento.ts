/**
 * O que o sistema já sabe sobre este casamento.
 *
 * Este vocabulário nasceu dentro de `planejamento-tarefas.ts`, na Fase 3, e
 * mudou de casa na Fase 4 porque ganhou um segundo consumidor: o roteiro de
 * Primeiros passos (`onboarding-passos.ts`) observa exatamente os mesmos fatos.
 * Com dois leitores, "fatos do planejamento" passou a descrever menos do que a
 * coisa é — mesmo movimento que renomeou a fila `tarefas` para
 * `fila_processamento` quando a checklist reivindicou o nome.
 *
 * ## Os dois usos, e a assimetria entre eles
 *
 * Um fato decide **o que oferecer**, nunca **o que está feito** — para o
 * Planejamento (docs/fase3-planejamento.md 1.1). Para o onboarding, o mesmo
 * fato **é** o passo: "o local está cadastrado" não é indício de que algo foi
 * feito no mundo, é a própria coisa que o passo pede
 * (docs/fase4-onboarding.md 1.2).
 *
 * É por isso que um passo do roteiro pode se marcar sozinho e uma tarefa da
 * checklist não: a diferença não é de confiança no fato, é de objeto.
 */
export const FATOS_SIMPLES = [
  'orcamento_definido',
  'tem_convidado',
  'local_definido',
  'tem_cronograma',
  'site_publicado',
  'tem_save_the_date',
  'tem_convite_enviado',
  'tem_resposta_rsvp',
  'tem_presente',
  'tem_mesa',
  // --- Fase 4: os três que só o roteiro do onboarding lê ------------------
  //
  // Nada impede uma tarefa sugerida de usá-los; eles ficam na mesma lista
  // justamente para que uma segunda lista não precise existir.
  'horario_definido',
  'prazo_rsvp_definido',
  'identidade_visual_definida',
] as const

export type FatoSimples = (typeof FATOS_SIMPLES)[number]

/**
 * `contratado:<Nome da categoria>` é o fato "já existe gasto com valor fechado
 * nessa categoria".
 *
 * Casa pelo NOME da categoria, e a quebra é silenciosa: categoria renomeada
 * pelo casal deixa de dispensar a sugestão, exatamente como deixa de receber
 * sugestão de gasto. Aqui custa ainda menos — o pior caso é oferecer uma tarefa
 * já resolvida, que o casal ignora. Como a quebra é muda, há teste travando que
 * toda categoria citada existe em `orcamento-categorias.ts`.
 */
export type FatoObservado = FatoSimples | `contratado:${string}`

/** O nome da categoria dentro de um fato `contratado:...`, ou null. */
export function categoriaDoFato(fato: FatoObservado): string | null {
  return fato.startsWith('contratado:') ? fato.slice('contratado:'.length) : null
}
