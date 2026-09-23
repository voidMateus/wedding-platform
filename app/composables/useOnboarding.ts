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
export const CHAVE_ONBOARDING = 'onboarding'

export function useOnboarding() {
  // A chave resolvida, uma vez, para os dois usos. Ela era montada dentro do
  // `useFetch` e o refresh invalidava a base crua (`'onboarding'`), que não é
  // a chave de requisição nenhuma — `useWeddingScopedKey` devolve
  // `onboarding@<slug>`. O roteiro nunca era relido: o casal respondia as
  // etapas, voltava ao Início e continuava lendo "0 de 4 concluídos".
  const chaveRoteiro = useWeddingScopedKey(CHAVE_ONBOARDING)

  function getRoteiro() {
    const fetchState = useFetch<OnboardingSummary>('/api/onboarding/summary', {
      key: chaveRoteiro,
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
   *
   * A chave vai **resolvida** (`chaveRoteiro()`), nunca a base crua: invalidar
   * uma chave que ninguém registrou falha exatamente como um refresh que não
   * acontece — em silêncio.
   */
  async function atualizarRoteiro() {
    await useNuxtApp().hooks.callHookParallel('app:data:refresh', [chaveRoteiro()])
  }

  return { getRoteiro, atualizarRoteiro }
}
