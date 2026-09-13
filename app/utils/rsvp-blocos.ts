/**
 * Os membros de um convite em blocos, para a tela do convidado.
 *
 * Cada núcleo de Acompanhantes vira um bloco; quem não tem núcleo vira um
 * bloco de um. Quem abria um convite de 6 pessoas via 6 cartões idênticos e
 * tinha que descobrir sozinho que dois deles eram o casal de tios.
 *
 * O agrupamento é **só visual**: a resposta continua sendo por pessoa
 * (CLAUDE.md, seção 12), e cada nome mantém os próprios botões dentro do
 * cartão. O rótulo derivado do núcleo ("João e Maria") não entra aqui — é
 * linguagem do painel, e para quem responde os nomes dentro do cartão já
 * dizem o que ele significa.
 *
 * Junta CONSECUTIVOS porque o servidor já entrega cada núcleo junto
 * (`ordenarMembrosDoConvite`); reagrupar por `Map` seria uma segunda
 * ordenação, capaz de discordar da primeira — e a ordem alfabética dos blocos
 * é decisão do servidor, não desta função.
 */
export interface MembroAgrupavel {
  guestId: string
  partyId: string | null
}

export interface BlocoDeMembros<T extends MembroAgrupavel> {
  /**
   * Chave da lista. É o `guestId` do primeiro membro, nunca o `partyId`: se a
   * ordem chegar com um núcleo partido em dois trechos, o id do núcleo
   * apareceria duas vezes e o `v-for` teria chaves duplicadas — um defeito de
   * renderização escondido atrás de um defeito de ordenação.
   */
  id: string
  membros: T[]
}

export function agruparMembrosPorNucleo<T extends MembroAgrupavel>(
  membros: readonly T[],
): BlocoDeMembros<T>[] {
  const blocos: BlocoDeMembros<T>[] = []
  let nucleoAberto: string | null = null

  for (const membro of membros) {
    const ultimo = blocos.at(-1)
    if (membro.partyId && ultimo && nucleoAberto === membro.partyId) {
      ultimo.membros.push(membro)
      continue
    }
    blocos.push({ id: membro.guestId, membros: [membro] })
    nucleoAberto = membro.partyId
  }

  return blocos
}
