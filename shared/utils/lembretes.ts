/**
 * Os avisos que o sistema manda SOZINHO — o lembrete de RSVP ao convidado e o
 * lembrete de vencimento ao casal.
 *
 * É a única peça da plataforma que age sem ninguém clicar, e é isso que define
 * as regras daqui: elas são todas sobre **não mandar**. Um envio a mais que o
 * casal não pediu chega na caixa de outra pessoa, com o nome dele.
 *
 * Puro e em `shared/` porque a MESMA regra roda em dois lugares: no cron, que
 * decide o que sai hoje, e na tela de configuração, que precisa dizer ao casal
 * "o próximo lembrete sai em 3 de outubro" antes de qualquer coisa ter saído.
 * Duas implementações divergiriam na borda que ninguém testa.
 */

/** Datas do domínio são date-only (`2026-10-20`), nunca timestamp. */
type DataISO = string

/**
 * Três marcas bastam e o limite é deliberado: cada marca é um e-mail a mais
 * na caixa de alguém que não pediu. Quatro lembretes de RSVP para a mesma
 * pessoa não é insistência, é spam — e o remetente é o casal.
 */
export const MAX_MARCAS_LEMBRETE = 3

/** Quantos dias antes do prazo o lembrete de RSVP sai, por padrão. */
export const DIAS_ANTES_PADRAO_RSVP = [14, 3]

/** Quantos dias antes do vencimento o aviso de pagamento sai, por padrão. */
export const DIAS_ANTES_PADRAO_PAGAMENTO = [7, 1]

/** Marca máxima aceita: mais de um semestre de antecedência não é lembrete. */
export const MAX_DIAS_ANTES = 180

/**
 * Dias inteiros de `hoje` até `alvo`. Negativo quando o alvo já passou.
 *
 * Contado em UTC de propósito: as duas pontas são datas sem hora, e usar o
 * fuso local faria o mesmo par de datas dar 6 ou 7 dias dependendo do horário
 * de verão de quem roda o cálculo.
 */
export function diasAte(hoje: DataISO, alvo: DataISO): number | null {
  const a = Date.parse(`${hoje}T00:00:00Z`)
  const b = Date.parse(`${alvo}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86_400_000)
}

/**
 * A marca que dispara hoje, ou `null`.
 *
 * No máximo uma: as marcas são dias distintos, e a distância de hoje até o
 * alvo é um número só. Devolve o número (e não um booleano) porque ele vai
 * para o registro do envio — "este foi o lembrete de 3 dias" é o que permite
 * explicar depois por que a pessoa recebeu dois.
 *
 * **Alvo que já passou nunca dispara.** Um prazo vencido não vira lembrete
 * diário: o convidado que não respondeu até a data já não tem o que confirmar,
 * e a parcela vencida é assunto da tela de Pagamentos, que a mostra em
 * vermelho todo dia — sem precisar de e-mail todo dia.
 */
export function marcaQueDispara(
  hoje: DataISO,
  alvo: DataISO | null | undefined,
  diasAntes: readonly number[],
): number | null {
  if (!alvo) return null
  const distancia = diasAte(hoje, alvo)
  if (distancia === null || distancia < 0) return null
  return diasAntes.includes(distancia) ? distancia : null
}

/**
 * A próxima data em que algo sai, para a tela poder dizer antes de acontecer.
 * `null` quando todas as marcas já passaram.
 */
export function proximaDataDeLembrete(
  hoje: DataISO,
  alvo: DataISO | null | undefined,
  diasAntes: readonly number[],
): DataISO | null {
  if (!alvo) return null
  const distancia = diasAte(hoje, alvo)
  if (distancia === null) return null

  const futuras = [...diasAntes].filter((dias) => dias <= distancia).sort((a, b) => b - a)
  const marca = futuras[0]
  if (marca === undefined) return null

  const data = new Date(Date.parse(`${alvo}T00:00:00Z`) - marca * 86_400_000)
  return data.toISOString().slice(0, 10)
}

/**
 * Este convite recebe o lembrete de hoje?
 *
 * Quatro recusas, todas por um motivo diferente de "o casal não quis":
 *
 * - **Não recebeu o convite** — lembrar de confirmar presença quem nunca foi
 *   convidado é a plataforma anunciando o casamento no lugar do casal.
 * - **Já respondeu por inteiro** — o convite fechou. Quem respondeu em parte
 *   continua recebendo: falta gente dentro dele.
 * - **Não tem para onde mandar** — sem e-mail válido não há envio, e o lugar
 *   de resolver isso é o cadastro, não o cron.
 * - **Já recebeu hoje** — a proteção contra o cron rodar duas vezes (retry da
 *   plataforma, dois deploys no mesmo dia). Derivada do log de envios, nunca
 *   de uma coluna "último lembrete" a manter sincronizada.
 */
export function conviteDeveReceberLembrete(convite: {
  recebeuConvite: boolean
  respondidoPorCompleto: boolean
  temDestinatario: boolean
  lembreteEnviadoHoje: boolean
}): boolean {
  return (
    convite.recebeuConvite &&
    !convite.respondidoPorCompleto &&
    convite.temDestinatario &&
    !convite.lembreteEnviadoHoje
  )
}
