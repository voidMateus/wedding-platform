// Ritmo vertical de seção (CLAUDE.md, Fase Premium Experience — Design
// System §22): nenhuma seção pública decide seu próprio padding solto,
// todas consomem uma dessas 5 densidades. A escala é só uma combinação
// nomeada de classes já dentro do spacing padrão do Tailwind (múltiplos de
// 4px, CLAUDE.md §22.1) — não introduz uma escala numérica nova.
export type SectionSpacing = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export const SECTION_SPACING_CLASSES: Record<SectionSpacing, string> = {
  xs: 'py-8 sm:py-10',
  sm: 'py-14 sm:py-16',
  // 'md' preserva o padding usado por toda seção editorial até aqui
  // (Fase Editorial) — é o default, sem mudança visual para quem não
  // escolher outra densidade.
  md: 'py-20 sm:py-28',
  lg: 'py-28 sm:py-36',
  xl: 'py-36 sm:py-48',
}

export const DEFAULT_SECTION_SPACING: SectionSpacing = 'md'
