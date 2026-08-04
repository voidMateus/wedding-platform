// Deriva as iniciais do casal a partir de `couple_names` (CLAUDE.md, Fase
// Premium Experience — CoupleMonogram.vue). Mesma convenção de split usada
// em Hero.vue (`coupleNameParts`) para o formato "Nome & Nome": quando bate
// com o padrão, usa a primeira letra de cada lado do "&"; fora do padrão
// (ex.: "Família Silva"), cai para a primeira letra das duas primeiras
// palavras — nunca quebra, só produz um monograma menos específico.
export function getCoupleInitials(coupleNames: string): string {
  const ampersandParts = coupleNames
    .split(/\s*&\s*/)
    .map((part) => part.trim())
    .filter(Boolean)

  if (ampersandParts.length === 2) {
    return `${ampersandParts[0]!.charAt(0).toUpperCase()}${ampersandParts[1]!.charAt(0).toUpperCase()}`
  }

  const words = coupleNames.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
}
