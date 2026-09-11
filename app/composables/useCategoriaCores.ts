import type { ThemeConfig } from '#shared/schemas/theme'
import { DEFAULT_PRIMARY_COLOR } from '#shared/utils/contrast'
import {
  corDaCategoriaComOverride,
  paletaDeCategorias,
  type CorDeCategoria,
} from '#shared/utils/paleta-categorias'

/**
 * A cor de uma categoria, pronta para a tela.
 *
 * A regra inteira mora em `shared/utils/paleta-categorias.ts`; aqui só se
 * junta o slot da categoria (`cor_indice`) com a cor tema do casamento, que no
 * admin já está no store de UI. Assim Orçamento, Fornecedores e Pagamentos
 * consomem exatamente a mesma regra — e trocar o tema repinta os três de uma
 * vez, sem migração de dado nenhuma.
 */
export function useCategoriaCores() {
  const uiStore = useUiStore()

  const corTema = computed(() => {
    const tema = (uiStore.themeConfig ?? {}) as Partial<ThemeConfig>
    return tema.primaryColor ?? DEFAULT_PRIMARY_COLOR
  })

  function corDaCategoria(
    indice: number | null | undefined,
    personalizada?: string | null,
  ): CorDeCategoria {
    return corDaCategoriaComOverride(indice ?? 0, corTema.value, personalizada)
  }

  /** A paleta inteira — a grade de escolha manual da cor da categoria. */
  const paleta = computed(() => paletaDeCategorias(corTema.value))

  return { corTema, corDaCategoria, paleta }
}
