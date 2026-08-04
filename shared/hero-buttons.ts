// Catálogo fixo dos atalhos que podem aparecer no Hero (CLAUDE.md, seção 21
// — "Fase Vermelho Clássico"). O casal escolhe QUAIS aparecem e QUAL fica em
// destaque (theme_config.heroButtons/heroFeaturedButton) — o catálogo em si
// (id, label, ícone, âncora) não é editável, só a seleção.

export interface HeroButtonDefinition {
  id: string
  label: string
  icon: string
  href: string
}

export const HERO_BUTTON_CATALOG: HeroButtonDefinition[] = [
  // Não é uma âncora como os demais — a lista de presentes tem página
  // própria dedicada (Hero.vue trata este id como caso especial, para
  // também preservar ?code= na navegação real de rota).
  { id: 'presentes', label: 'Ver lista de presentes', icon: 'lucide:gift', href: '/presentes' },
  { id: 'confirmar-presenca', label: 'Confirmar presença', icon: 'lucide:check', href: '/#confirmar-presenca' },
  { id: 'cronograma', label: 'O Grande Dia', icon: 'lucide:calendar-clock', href: '/#grande-dia' },
  { id: 'manual-convidados', label: 'Manual do convidado', icon: 'lucide:info', href: '/#manual-convidados' },
  { id: 'dress-code', label: 'Dress code', icon: 'lucide:shirt', href: '/#dress-code' },
  { id: 'historia', label: 'Nossa história', icon: 'lucide:heart', href: '/#historia' },
  { id: 'galeria', label: 'Nossos Momentos', icon: 'lucide:image', href: '/#nossos-momentos' },
  { id: 'faq', label: 'Perguntas frequentes', icon: 'lucide:help-circle', href: '/#faq' },
]

export const HERO_BUTTON_IDS = HERO_BUTTON_CATALOG.map((button) => button.id) as [string, ...string[]]

// Seleção padrão para casamentos que ainda não personalizaram (mesmos 4
// atalhos já lançados na PR 1 desta fase) — "presentes" é o destaque padrão.
export const DEFAULT_HERO_BUTTONS = ['presentes', 'confirmar-presenca', 'cronograma', 'manual-convidados']
export const DEFAULT_HERO_FEATURED_BUTTON = 'presentes'

export function findHeroButton(id: string): HeroButtonDefinition | undefined {
  return HERO_BUTTON_CATALOG.find((button) => button.id === id)
}

/**
 * Resolve a lista final de botões do Hero a partir da seleção do casal —
 * ids desconhecidos/removidos do catálogo são ignorados silenciosamente
 * (nunca quebra o Hero por causa de uma seleção antiga).
 */
export function resolveHeroButtons(
  selectedIds: string[] | undefined,
  featuredId: string | undefined,
): Array<HeroButtonDefinition & { featured: boolean }> {
  const ids = selectedIds ?? DEFAULT_HERO_BUTTONS
  const featured = featuredId ?? DEFAULT_HERO_FEATURED_BUTTON
  return ids
    .map((id) => findHeroButton(id))
    .filter((button): button is HeroButtonDefinition => Boolean(button))
    .map((button) => ({ ...button, featured: button.id === featured }))
}
