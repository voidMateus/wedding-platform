// Mascara um nome para a confirmação leve do RSVP público (CLAUDE.md, seção
// 12.1) — mostra só a primeira letra de cada palavra, o resto vira
// asteriscos, preservando o tamanho para dar uma pista sem revelar o nome.

export function maskName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((word) => (word.length <= 1 ? word : word[0] + '*'.repeat(word.length - 1)))
    .join(' ')
}
