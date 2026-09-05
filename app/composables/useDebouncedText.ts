import { useDebounceFn } from '@vueuse/core'

const DEFAULT_DELAY_MS = 300

/**
 * Espelho local de um filtro de texto que só escreve no estado compartilhado
 * depois que a digitação para.
 *
 * Existe porque o estado dos filtros mora na URL: sem o atraso, cada tecla
 * vira um `router.replace` mais uma requisição de listagem — e em base grande,
 * uma varredura por tecla. O caminho de volta também importa: quando o valor
 * é limpo de fora (chip removido, "Limpar tudo"), o campo precisa esvaziar
 * sozinho, e é por isso que isto não é um `ref` solto na página.
 */
export function useDebouncedText(
  source: MaybeRefOrGetter<string>,
  commit: (value: string) => void,
  delayMs: number = DEFAULT_DELAY_MS,
): Ref<string> {
  const draft = ref(toValue(source))

  watch(
    () => toValue(source),
    (value) => {
      if (value !== draft.value) draft.value = value
    },
  )

  const push = useDebounceFn((value: string) => commit(value), delayMs)
  watch(draft, (value) => {
    void push(value)
  })

  return draft
}
