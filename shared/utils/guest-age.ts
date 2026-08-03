// "Criança" nunca é um campo manual — sempre calculada a partir de
// birth_date + weddings.child_max_age (CLAUDE.md, seção 15.2). Espelha a
// função SQL guest_is_child() para uso no client/listagens sem round-trip
// extra; a fonte de verdade em consultas/filtros no banco continua sendo a
// função SQL.

export function computeIsChild(birthDate: string | null, childMaxAge: number): boolean {
  if (!birthDate) return false

  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1

  return age <= childMaxAge
}
