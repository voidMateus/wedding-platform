/**
 * Ordem de exibição dos membros de um convite.
 *
 * `ordem_nucleo` NÃO ordena um convite, e ordenava — nos dois lugares que
 * listam membros (o detalhe do convite no painel e o payload de RSVP do
 * convidado).
 *
 * A coluna é a posição dentro de um núcleo de Acompanhantes. Um convite pode
 * conter vários núcleos (três casais sob o mesmo cartão) e gente sem núcleo
 * nenhum, cujo `ordem_nucleo` é 0 para todos — então `order by ordem_nucleo`
 * devolvia 0,1,0,1: uma ordem que parecia intencional e era arbitrária.
 *
 * A regra certa mantém cada núcleo junto (é para isso que o núcleo existe) e
 * ordena os blocos pelo nome de quem vem primeiro em cada um. Quem não tem
 * núcleo é um bloco de um, entrando na mesma ordem alfabética — assim "Ana e
 * Bia" (núcleo) e "Carlos" (sozinho) se intercalam pelo nome, sem duas listas
 * separadas na tela.
 *
 * Resolvido em TypeScript e não no `order` do PostgREST porque a chave é o
 * nome do primeiro membro do núcleo, que ele não expressa — e a lista de um
 * convite tem punhado de linhas, nunca a lista inteira.
 */
export interface MembroOrdenavel {
  id: string
  nome_completo: string
  nucleo_id: string | null
  ordem_nucleo: number
}

export function ordenarMembrosDoConvite<T extends MembroOrdenavel>(membros: readonly T[]): T[] {
  // Líder = menor `ordem_nucleo` do núcleo. Calculado, não assumido da ordem
  // que veio do banco: a função não pode depender de quem a chamou ter
  // lembrado de ordenar antes.
  const liderPorNucleo = new Map<string, T>()
  for (const membro of membros) {
    if (!membro.nucleo_id) continue
    const atual = liderPorNucleo.get(membro.nucleo_id)
    if (!atual || membro.ordem_nucleo < atual.ordem_nucleo) {
      liderPorNucleo.set(membro.nucleo_id, membro)
    }
  }

  function chaveDoBloco(membro: T): string {
    if (!membro.nucleo_id) return membro.nome_completo
    return liderPorNucleo.get(membro.nucleo_id)?.nome_completo ?? membro.nome_completo
  }

  return [...membros].sort((a, b) => {
    const chaveA = chaveDoBloco(a)
    const chaveB = chaveDoBloco(b)
    if (chaveA !== chaveB) return chaveA.localeCompare(chaveB, 'pt-BR')

    // Nomes iguais em blocos diferentes não podem intercalar os blocos — sem
    // este desempate, dois "João" de núcleos distintos embaralhariam os dois.
    const blocoA = a.nucleo_id ?? a.id
    const blocoB = b.nucleo_id ?? b.id
    if (blocoA !== blocoB) return blocoA < blocoB ? -1 : 1

    return a.ordem_nucleo - b.ordem_nucleo
  })
}
