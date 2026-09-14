import type { FatoObservado } from '#shared/fatos-do-casamento'

/**
 * A resposta de `GET /api/onboarding/summary`.
 *
 * Fatos, não passos: a lista de passos é derivada do catálogo compartilhado
 * (`shared/onboarding-passos.ts`), que é quem sabe rótulo, grupo e ordem.
 */
export interface OnboardingSummary {
  fatos: FatoObservado[]
  /** O que cada passo cumprido exibe na linha, por id de passo, já formatado. */
  valores: Record<string, string>
}
