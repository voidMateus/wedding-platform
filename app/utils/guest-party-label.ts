/**
 * Rótulo de um núcleo de Acompanhantes ("João e Maria").
 *
 * `nucleos_acompanhantes` não tem coluna de nome — e não deveria ter: o núcleo
 * é o agrupamento das pessoas, então o nome dele é sempre derivado de quem
 * está dentro. Batizar núcleo à mão criaria um dado que envelhece sozinho
 * ("João e Maria" continuaria escrito depois de Maria sair do núcleo).
 *
 * A regra: os dois primeiros nomes por `ordem_nucleo` (o convidado principal é
 * sempre 0), unidos por "e", com "+N" quando há mais gente. Dois porque é o
 * caso dominante — um casal —, e porque a lista inteira num rótulo de célula
 * deixaria de ser rótulo.
 */

interface MembroDeNucleo {
  nucleo_id: string | null
  nome_completo: string
  ordem_nucleo: number
}

/** Primeiro nome: é o que identifica dentro do núcleo, onde o sobrenome se repete. */
function primeiroNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? nomeCompleto
}

export function montarRotulosDeNucleo(convidados: readonly MembroDeNucleo[]): Map<string, string> {
  const membrosPorNucleo = new Map<string, MembroDeNucleo[]>()
  for (const convidado of convidados) {
    if (!convidado.nucleo_id) continue
    const membros = membrosPorNucleo.get(convidado.nucleo_id) ?? []
    membros.push(convidado)
    membrosPorNucleo.set(convidado.nucleo_id, membros)
  }

  const rotulos = new Map<string, string>()
  for (const [nucleoId, membros] of membrosPorNucleo) {
    const ordenados = [...membros].sort((a, b) => a.ordem_nucleo - b.ordem_nucleo)
    const nomes = ordenados.slice(0, 2).map((membro) => primeiroNome(membro.nome_completo))
    const restantes = ordenados.length - nomes.length

    const base = nomes.join(' e ')
    rotulos.set(nucleoId, restantes > 0 ? `${base} +${restantes}` : base)
  }

  return rotulos
}
