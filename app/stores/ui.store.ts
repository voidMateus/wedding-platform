import { defineStore } from 'pinia'

/**
 * Estado de UI global (CLAUDE.md, seção 10): tema ativo do casamento
 * (theme_config bruto — resolvido para CSS vars via useWeddingTheme.ts,
 * aplicado pelos layouts) e estado da sidebar do admin (colapsável).
 */
export const useUiStore = defineStore('ui', () => {
  const themeConfig = ref<unknown>(null)
  const sidebarOpen = ref(true)

  function setThemeConfig(config: unknown): void {
    themeConfig.value = config
  }

  return { themeConfig, sidebarOpen, setThemeConfig }
})
