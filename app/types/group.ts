import type { Database } from './database.types'

export type Group = Database['public']['Tables']['grupos']['Row']

/**
 * Linha de `grupos` enriquecida com o andamento do grupo, montado por
 * /api/groups para exibição (CLAUDE.md, seção 6: DTO computado fica em
 * inglês, como InviteListItem). guestCount conta convidados não excluídos
 * com esse grupo_id; confirmedCount, quantos deles têm RSVP 'confirmado'.
 * Rascunho da lista (`em_consideracao`) não entra em nenhuma das contagens.
 *
 * Os pares `*Total` incluem as subdivisões do grupo (`grupo_pai_id`). Como o
 * convidado sempre aponta para a folha, o grupo-pai tem `guestCount` próprio
 * baixo — ou zero — e é o `guestCountTotal` que responde "quantas pessoas há
 * em Família do Mateus". Para uma subdivisão, ou para um grupo sem
 * subdivisões, os dois valores coincidem.
 */
export interface GroupListItem extends Group {
  guestCount: number
  confirmedCount: number
  guestCountTotal: number
  confirmedCountTotal: number
  subdivisionCount: number
}
