// "Criança" nunca é um campo manual — sempre calculada a partir de
// data_nascimento + casamentos.idade_maxima_crianca (CLAUDE.md, seção 15.2).
// Espelha a função SQL convidado_e_crianca() para uso no client/listagens
// sem round-trip extra; a fonte de verdade em consultas/filtros no banco
// continua sendo a função SQL.

export function computeIsChild(dataNascimento: string | null, idadeMaximaCrianca: number): boolean {
  if (!dataNascimento) return false

  const birth = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  if (!hasHadBirthdayThisYear) age -= 1

  return age <= idadeMaximaCrianca
}
