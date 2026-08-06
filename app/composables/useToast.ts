import type { ToastTone } from '~/stores/ui.store'

// Duração por tom — erros/avisos exigem mais tempo de leitura do que uma
// confirmação simples (CLAUDE.md, seção 20.1/21).
const DURATION_BY_TONE_MS: Record<ToastTone, number> = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 6000,
}

/**
 * Feedback de ações assíncronas (CLAUDE.md, seção 20.1/21) — nunca alert()
 * nativo. Toast some sozinho após a duração do seu tom, mas também pode ser
 * fechado manualmente (UiToast emite 'dismiss').
 */
export function useToast() {
  const uiStore = useUiStore()

  function show(tone: ToastTone, message: string): void {
    const id = uiStore.pushToast(tone, message)
    setTimeout(() => uiStore.dismissToast(id), DURATION_BY_TONE_MS[tone])
  }

  return {
    success: (message: string) => show('success', message),
    error: (message: string) => show('error', message),
    warning: (message: string) => show('warning', message),
    info: (message: string) => show('info', message),
  }
}
