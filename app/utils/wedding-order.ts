import type { WeddingMembership } from '~/types/auth'

/**
 * A ordem em que alguém que administra vários casamentos quer vê-los
 * (docs/fase5-multievento.md 5.3).
 *
 * Não é "por data" — ordenar a lista inteira por data crescente põe o
 * casamento de 2020 no topo e o do mês que vem no fim. A pergunta de quem
 * organiza é sempre "qual é o próximo", então:
 *
 *   1. os que ainda vão acontecer, do mais próximo ao mais distante;
 *   2. os que já aconteceram, do mais recente ao mais antigo;
 *   3. os arquivados, sempre por último — escopo encerrado não disputa
 *      atenção com evento vivo, mesmo que a data caia antes.
 *
 * `hoje` é parâmetro, nunca `new Date()` aqui dentro: é a mesma regra que o
 * Financeiro e o Planejamento seguem (CLAUDE.md, seção 12), e é o que torna
 * esta função testável sem congelar o relógio.
 */
export function sortWeddingsByEvent(
  memberships: readonly WeddingMembership[],
  hoje: string,
): WeddingMembership[] {
  function balde(membership: WeddingMembership): number {
    if (membership.statusCicloVida === 'arquivado') return 2
    return membership.dataEvento >= hoje ? 0 : 1
  }

  return [...memberships].sort((a, b) => {
    const baldeA = balde(a)
    const baldeB = balde(b)
    if (baldeA !== baldeB) return baldeA - baldeB

    // Dentro do balde dos futuros, o mais próximo primeiro; nos outros dois, o
    // mais recente primeiro — em ambos os casos, o mais perto de hoje.
    const porData =
      baldeA === 0
        ? a.dataEvento.localeCompare(b.dataEvento)
        : b.dataEvento.localeCompare(a.dataEvento)
    if (porData !== 0) return porData

    // Empate de data é real (duas festas no mesmo sábado): o nome desempata
    // para a ordem não depender de como o banco devolveu as linhas.
    return a.nomesNoivos.localeCompare(b.nomesNoivos, 'pt-BR')
  })
}
