import type { TaskInput, TaskPatch } from '#shared/schemas/planejamento'
import type { ResumoPlanejamento, Tarefa, TarefasResponse } from '~/types/planning'

/**
 * O Planejamento do client (CLAUDE.md, seção 4.1 — toda chamada de rede passa
 * por um composable).
 *
 * As duas chaves são fixas para a tela e o painel compartilharem cache:
 * concluir uma tarefa na lista precisa atualizar o bloco do painel sem que as
 * duas telas busquem a mesma coisa duas vezes.
 */
export const CHAVE_TAREFAS = 'planning-tasks'
export const CHAVE_RESUMO_PLANEJAMENTO = 'planning-summary'

export function usePlanning() {
  function listTasks() {
    return useFetch<TarefasResponse>('/api/planning/tasks', { key: CHAVE_TAREFAS })
  }

  function getResumo() {
    return useFetch<ResumoPlanejamento>('/api/planning/summary', {
      key: CHAVE_RESUMO_PLANEJAMENTO,
    })
  }

  /**
   * Recarrega a lista e o resumo depois de uma mutação.
   *
   * Dispara o hook `app:data:refresh` direto, e NÃO `refreshNuxtData` — que é o
   * mesmo hook, precedido de `await onNuxtReady()`, ou seja, de um
   * `requestIdleCallback`. Essa espera por ociosidade não tem prazo: quando ela
   * não chega, a mutação vai ao banco e a tela **não muda**, sem erro nenhum
   * para acusar. Foi o que aconteceu aqui — concluir uma tarefa gravava
   * `concluida_em` e a linha continuava no grupo de origem, reproduzível em
   * toda execução do E2E. Atualizar a tela é consequência direta de um clique
   * do casal; não é trabalho de segundo plano, e não pode depender de a aba
   * estar ociosa.
   */
  async function atualizarPlanejamento() {
    await useNuxtApp().hooks.callHookParallel('app:data:refresh', [
      CHAVE_TAREFAS,
      CHAVE_RESUMO_PLANEJAMENTO,
    ])
  }

  async function criarTarefa(input: TaskInput) {
    const tarefa = await $fetch<Tarefa>('/api/planning/tasks', { method: 'POST', body: input })
    await atualizarPlanejamento()
    return tarefa
  }

  /**
   * Cria a partir de uma sugestão do catálogo — só a chave viaja.
   *
   * Título e prazo são resolvidos no servidor a partir do catálogo e da data do
   * evento: mandá-los daqui deixaria o client decidir o que a plataforma
   * promete.
   */
  async function criarTarefaSugerida(chaveCatalogo: string) {
    return criarTarefa({ chaveCatalogo } as TaskInput)
  }

  async function atualizarTarefa(id: string, input: TaskPatch) {
    const tarefa = await $fetch<Tarefa>(`/api/planning/tasks/${id}`, {
      method: 'PATCH',
      body: input,
    })
    await atualizarPlanejamento()
    return tarefa
  }

  async function excluirTarefa(id: string) {
    const resposta = await $fetch<{ id: string }>(`/api/planning/tasks/${id}`, { method: 'DELETE' })
    await atualizarPlanejamento()
    return resposta
  }

  return {
    listTasks,
    getResumo,
    atualizarPlanejamento,
    criarTarefa,
    criarTarefaSugerida,
    atualizarTarefa,
    excluirTarefa,
  }
}
