import type { InjectionKey } from 'vue'

/**
 * Único ponto de divergência visual deliberado entre admin e site público
 * (CLAUDE.md §21) — layouts/admin.vue provê `true`, UiButton injeta pra
 * suprimir o "lift" de hover dos botões pill numa tela com dezenas deles.
 */
export const ADMIN_UI_CONTEXT_KEY: InjectionKey<boolean> = Symbol('admin-ui-context')
