import { defineStore } from 'pinia'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

/**
 * A ação de um toast — hoje, o desfazer.
 *
 * Existe porque é ela que torna aceitável destruir sem perguntar: numa tela em
 * que criar custa um Enter, um diálogo de confirmação a cada exclusão cobra
 * mais do que o gesto que ele protege. O caminho de volta substitui a pergunta
 * — mas só vale quando existe: sem desfazer, confirmação.
 */
export interface ToastAction {
  label: string
  run: () => void | Promise<void>
}

export interface Toast {
  id: string
  tone: ToastTone
  message: string
  action?: ToastAction
}

/**
 * Estado de UI global (CLAUDE.md, seção 10): tema ativo do casamento
 * (config_tema bruto — resolvido para CSS vars via useWeddingTheme.ts,
 * aplicado pelos layouts) e toasts de feedback (CLAUDE.md, seção 20.1/21 —
 * nunca alert() nativo).
 *
 * `menuDaSecaoRecolhido` é o único estado de chrome aqui, e é do **menu da
 * seção** (não da nav primária, que vive no cabeçalho): é preferência de
 * leitura do casal e precisa sobreviver à navegação entre telas da seção. No
 * celular não existe — ali quem navega é a barra de abas inferior.
 */
export const useUiStore = defineStore('ui', () => {
  const themeConfig = ref<unknown>(null)
  const menuDaSecaoRecolhido = ref(false)
  const toasts = ref<Toast[]>([])

  function setThemeConfig(config: unknown): void {
    themeConfig.value = config
  }

  /**
   * Devolve o id do toast — o de um já visível quando a mensagem se repete, e
   * é isso que impede a mesma ação impedida de empilhar seis cartões iguais.
   * Quem chama (`useToast`) reinicia a contagem desse id.
   */
  function pushToast(tone: ToastTone, message: string, action?: ToastAction): string {
    const jaNaTela = toasts.value.find((toast) => toast.tone === tone && toast.message === message)
    // Com ação, nunca se reaproveita o cartão que já está na tela: o botão
    // desfaria a exclusão ANTERIOR, e quem apagou duas linhas seguidas
    // recuperaria a errada.
    if (jaNaTela && !action && !jaNaTela.action) return jaNaTela.id

    const id = crypto.randomUUID()
    toasts.value.push({ id, tone, message, action })
    return id
  }

  function dismissToast(id: string): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return {
    themeConfig,
    menuDaSecaoRecolhido,
    toasts,
    setThemeConfig,
    pushToast,
    dismissToast,
  }
})
