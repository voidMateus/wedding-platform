/**
 * O que vai acontecer se os selecionados forem agrupados como Acompanhantes.
 *
 * Existe porque agrupar faz, em dois casos, MAIS do que a seleção diz — e as
 * duas coisas mexem em dado que o casal já compartilhou com convidado:
 *
 * 1. Quem já está num núcleo traz o núcleo inteiro. Agrupar o João (que já vem
 *    com a Maria) com o Pedro não pode afastar a Maria do João, então o
 *    resultado é o trio. Marcar duas pessoas e ver três agrupadas, sem aviso,
 *    pareceria defeito.
 * 2. Núcleo não atravessa convites. Se alguém da seleção já tem convite, os
 *    outros entram nele — o que habilita RSVP para quem não podia responder.
 *
 * E um caso que não acontece: convites DIFERENTES na seleção é recusa, não
 * merge de convite. Mover alguém de convite trocaria o link/QR que já pode ter
 * sido enviado, e "vão juntos" deixa de ser verdade quando vão em convites
 * separados de todo modo.
 *
 * Puro de propósito: os números deste aviso são o aviso, e a única forma de
 * garantir que descrevem a operação é testá-los sem tela nem rede.
 */
export interface ConvidadoAgrupavel {
  id: string
  nucleo_id: string | null
  convite_id: string | null
  em_consideracao: boolean
}

export interface PreviaDoAgrupamento {
  /** Quantas pessoas ficam no núcleo — pode ser mais que o selecionado. */
  total: number
  /** Quantas entram por arrasto do núcleo de alguém, sem terem sido marcadas. */
  arrastados: number
  /** Quantos núcleos existentes serão fundidos num só. */
  nucleosFundidos: number
  /** Quantas pessoas passam a ter convite (e portanto a poder responder RSVP). */
  ganhamConvite: number
  /** Impedimentos — com qualquer um deles, a ação não é oferecida. */
  convitesDiferentes: boolean
  temRascunho: boolean
}

export function montarPreviaDoAgrupamento(
  convidados: readonly ConvidadoAgrupavel[],
  idsSelecionados: readonly string[],
): PreviaDoAgrupamento {
  const marcados = new Set(idsSelecionados)

  const nucleosEnvolvidos = new Set<string>()
  for (const convidado of convidados) {
    if (marcados.has(convidado.id) && convidado.nucleo_id) {
      nucleosEnvolvidos.add(convidado.nucleo_id)
    }
  }

  // O conjunto final: os marcados mais todo mundo que compartilha núcleo com
  // algum deles.
  const envolvidos = convidados.filter(
    (convidado) =>
      marcados.has(convidado.id) ||
      (convidado.nucleo_id !== null && nucleosEnvolvidos.has(convidado.nucleo_id)),
  )

  const convites = new Set(
    envolvidos
      .map((convidado) => convidado.convite_id)
      .filter((conviteId): conviteId is string => conviteId !== null),
  )

  return {
    total: envolvidos.length,
    arrastados: envolvidos.filter((convidado) => !marcados.has(convidado.id)).length,
    // Um núcleo só não é fusão: é entrar no que já existe.
    nucleosFundidos: nucleosEnvolvidos.size > 1 ? nucleosEnvolvidos.size : 0,
    ganhamConvite:
      convites.size === 1
        ? envolvidos.filter((convidado) => convidado.convite_id === null).length
        : 0,
    convitesDiferentes: convites.size > 1,
    temRascunho: envolvidos.some((convidado) => convidado.em_consideracao),
  }
}
