import { resolverPassosDoOnboarding } from '#shared/onboarding-passos'
import type { OnboardingSummary } from '~/types/onboarding'

/**
 * O roteiro de Primeiros passos (docs/fase4-onboarding.md).
 *
 * O endpoint devolve os fatos; a lista de passos é derivada aqui, pelo
 * catálogo compartilhado. Chave fixa `onboarding` para que o bloco do Início e
 * o wizard compartilhem a mesma resposta — são duas telas lendo o mesmo
 * estado, não duas requisições.
 */
export function useOnboarding() {
  function getRoteiro() {
    const fetchState = useFetch<OnboardingSummary>('/api/onboarding/summary', {
      key: useWeddingScopedKey('onboarding'),
    })

    const roteiro = computed(() => resolverPassosDoOnboarding(fetchState.data.value?.fatos ?? []))

    return { ...fetchState, roteiro }
  }

  /**
   * Relê os fatos depois de uma etapa salvar.
   *
   * Hook direto, e NÃO `refreshNuxtData` — que é o mesmo hook precedido de um
   * `requestIdleCallback` cuja espera não tem prazo: quando ela não chega, a
   * mutação vai ao banco e a tela não muda, sem erro nenhum para acusar
   * (armadilha registrada no Planejamento). Aqui custaria o roteiro marcando
   * um passo que o casal acabou de responder.
   */
  async function atualizarRoteiro() {
    await useNuxtApp().hooks.callHookParallel('app:data:refresh', ['onboarding'])
  }

  return { getRoteiro, atualizarRoteiro }
}
