const DEFAULT_DURATION_MS = 4000

/**
 * Feedback de ações assíncronas (CLAUDE.md, seção 20.1/21) — nunca alert()
 * nativo. Toast some sozinho após DEFAULT_DURATION_MS, mas também pode ser
 * fechado manualmente (UiToast emite 'dismiss').
 */
export function useToast() {
  const uiStore = useUiStore()

  function show(tone: 'success' | 'error' | 'info', message: string): void {
    const id = uiStore.pushToast(tone, message)
    setTimeout(() => uiStore.dismissToast(id), DEFAULT_DURATION_MS)
  }

  return {
    success: (message: string) => show('success', message),
    error: (message: string) => show('error', message),
    info: (message: string) => show('info', message),
  }
}
