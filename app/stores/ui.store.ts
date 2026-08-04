import { defineStore } from 'pinia'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  tone: ToastTone
  message: string
}

/**
 * Estado de UI global (CLAUDE.md, seção 10): tema ativo do casamento
 * (theme_config bruto — resolvido para CSS vars via useWeddingTheme.ts,
 * aplicado pelos layouts), toasts de feedback (CLAUDE.md, seção 20.1/21 —
 * nunca alert() nativo) e estado da sidebar do admin (colapsável).
 */
export const useUiStore = defineStore('ui', () => {
  const themeConfig = ref<unknown>(null)
  const sidebarOpen = ref(true)
  const toasts = ref<Toast[]>([])

  function setThemeConfig(config: unknown): void {
    themeConfig.value = config
  }

  function pushToast(tone: ToastTone, message: string): string {
    const id = crypto.randomUUID()
    toasts.value.push({ id, tone, message })
    return id
  }

  function dismissToast(id: string): void {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  return { themeConfig, sidebarOpen, toasts, setThemeConfig, pushToast, dismissToast }
})
