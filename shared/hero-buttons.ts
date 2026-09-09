// Atalhos que podem aparecer no Hero. Desde a Fase Rebrand do Convite o
// catálogo é DERIVADO do catálogo de seções (shared/home-sections.ts), não uma
// segunda lista escrita à mão: toda seção da home é um destino possível, e
// manter as duas listas em paralelo já tinha produzido um catálogo de oito
// atalhos para onze seções — três seções sem como serem alcançadas pelo Hero,
// sem que nada acusasse a falta.
//
// O casal continua escolhendo QUAIS aparecem e QUAL fica em destaque
// (config_tema.heroButtons/heroFeaturedButton); o catálogo em si não é
// editável.
import { HOME_SECTION_CATALOG, findHomeSection, type HomeSectionDefinition } from './home-sections'

export interface HeroButtonDefinition {
  id: string
  label: string
  /** Rótulo curto para a barra de navegação — ver HomeSectionDefinition.navLabel. */
  navLabel: string
  icon: string
  href: string
}

function toHeroButton(section: HomeSectionDefinition): HeroButtonDefinition {
  return {
    id: section.id,
    label: section.shortcutLabel,
    navLabel: section.navLabel ?? section.shortcutLabel,
    icon: section.shortcutIcon,
    href: section.shortcutHref,
  }
}

export const HERO_BUTTON_CATALOG: HeroButtonDefinition[] = HOME_SECTION_CATALOG.map(toHeroButton)

/**
 * Ids de atalho anteriores à unificação com o catálogo de seções, e o id de
 * seção que cada um virou.
 *
 * Sem este mapa, um casal que tivesse "O Grande Dia" no Hero simplesmente
 * perderia o botão no próximo carregamento: `resolveHeroButtons` descarta id
 * desconhecido em silêncio, que é o comportamento certo para um id extinto e o
 * errado para um id apenas renomeado. Só estes dois divergiam — os outros seis
 * já usavam o mesmo id da seção.
 */
const LEGACY_HERO_BUTTON_IDS: Record<string, string> = {
  cronograma: 'grande-dia',
  galeria: 'nossos-momentos',
}

/** Traduz um id salvo (possivelmente legado) para o id de seção atual. */
export function normalizeHeroButtonId(id: string): string {
  return LEGACY_HERO_BUTTON_IDS[id] ?? id
}

// Seleção padrão para casamentos que ainda não personalizaram — os mesmos
// quatro atalhos de sempre, agora pelos ids de seção.
export const DEFAULT_HERO_BUTTONS = [
  'presentes',
  'confirmar-presenca',
  'grande-dia',
  'manual-convidados',
]
export const DEFAULT_HERO_FEATURED_BUTTON = 'presentes'

export function findHeroButton(id: string): HeroButtonDefinition | undefined {
  const section = findHomeSection(normalizeHeroButtonId(id))
  return section ? toHeroButton(section) : undefined
}

/**
 * Resolve a lista final de botões do Hero a partir da seleção do casal.
 *
 * `hiddenSections` entra aqui porque um atalho para uma seção desligada é um
 * link para lugar nenhum: a âncora existe no menu, o convidado clica e a página
 * não se move. Desligar a seção precisa apagar o atalho junto, sem exigir que o
 * casal lembre de desmarcar os dois.
 *
 * Ids desconhecidos/removidos do catálogo continuam sendo ignorados em
 * silêncio — nunca quebra o Hero por causa de uma seleção antiga.
 */
export function resolveHeroButtons(
  selectedIds: string[] | undefined,
  featuredId: string | undefined,
  hiddenSections: string[] = [],
): Array<HeroButtonDefinition & { featured: boolean }> {
  const hidden = new Set(hiddenSections)
  const ids = selectedIds ?? DEFAULT_HERO_BUTTONS
  const featured = normalizeHeroButtonId(featuredId ?? DEFAULT_HERO_FEATURED_BUTTON)

  return ids
    .map((id) => findHeroButton(id))
    .filter((button): button is HeroButtonDefinition => Boolean(button))
    .filter((button) => !hidden.has(button.id))
    .map((button) => ({ ...button, featured: button.id === featured }))
}
