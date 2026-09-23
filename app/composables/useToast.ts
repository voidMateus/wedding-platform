import type { ToastAction, ToastTone } from '~/stores/ui.store'

// Duração por tom — erros/avisos exigem mais tempo de leitura do que uma
// confirmação simples (CLAUDE.md, seção 20.1/21).
const DURATION_BY_TONE_MS: Record<ToastTone, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6000,
}

/**
 * Relógio de cada toast na tela, para o mesmo aviso repetido reiniciar a
 * contagem em vez de empilhar uma cópia. Vive no módulo (e não no composable)
 * porque cada componente chama `useToast()` por conta própria, e a pilha é
 * uma só.
 */
const relogios = new Map<string, ReturnType<typeof setTimeout>>()

/**
 * Feedback de ações assíncronas (CLAUDE.md, seção 20.1/21) — nunca alert()
 * nativo. Toast some sozinho após a duração do seu tom, mas também pode ser
 * fechado manualmente (UiToast emite 'dismiss').
 *
 * Mensagem idêntica ao que já está na tela não vira um segundo cartão: quem
 * tenta a mesma ação impedida seis vezes recebia seis avisos iguais
 * empilhados, cobrindo meia tela para dizer uma coisa só.
 */
export function useToast() {
  const uiStore = useUiStore()

  function show(tone: ToastTone, message: string, action?: ToastAction): void {
    const id = uiStore.pushToast(tone, message, action)

    const anterior = relogios.get(id)
    if (anterior) clearTimeout(anterior)

    relogios.set(
      id,
      setTimeout(() => {
        relogios.delete(id)
        uiStore.dismissToast(id)
      }, DURATION_BY_TONE_MS[tone]),
    )
  }

  return {
    /**
     * `action` é o caminho de volta (hoje, "Desfazer"), e ele tem o tempo do
     * toast: some junto. É deliberado — desfazer é arrependimento imediato, e
     * um botão que ficasse na tela viraria uma segunda forma de editar o dado.
     */
    success: (message: string, action?: ToastAction) => show('success', message, action),
    error: (message: string) => show('error', message),
    warning: (message: string) => show('warning', message),
    info: (message: string) => show('info', message),
  }
}
