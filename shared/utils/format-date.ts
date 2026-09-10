// Formatação de data/data-hora em pt-BR — reaproveitado pelas listagens e
// telas de detalhe do admin, pra não ter a mesma expressão toLocaleString
// espalhada pelo código.

export function formatDateTimePtBR(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export function formatDatePtBR(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}

/**
 * "hoje", "há 8 dias", "há 3 meses" — quanto tempo faz que algo aconteceu.
 *
 * Existe para o tempo no estágio do convite: "Aberto" é um fato, "Aberto há 14
 * dias" é um pedido de lembrete.
 *
 * Só olha para trás, porque descreve fato registrado: data no futuro é dado
 * inconsistente, e devolve "hoje" em vez de inventar "em 3 dias".
 *
 * Dias corridos, não calendário — a pergunta é "quanto tempo faz", e para isso
 * 23h de ontem e 1h de hoje são a mesma coisa. Vira mês a partir de 60 dias, e
 * não de 30, para não trocar precisão útil ("há 45 dias") por arredondamento
 * pior ("há 1 mês").
 *
 * `agora` é parâmetro para o teste não depender do relógio.
 */
export function formatarTempoDecorrido(
  value: string | null | undefined,
  agora: Date = new Date(),
): string | null {
  if (!value) return null
  const quando = new Date(value)
  if (Number.isNaN(quando.getTime())) return null

  const dias = Math.floor((agora.getTime() - quando.getTime()) / 86_400_000)
  if (dias <= 0) return 'hoje'
  if (dias === 1) return 'há 1 dia'
  if (dias < 60) return `há ${dias} dias`

  // Sempre plural: com o corte em 60 dias, o primeiro balde de mês já é 2.
  // "há 1 mês" seria ramo morto — e ramo morto é o que faz alguém acreditar
  // que um caso está tratado quando ele nunca acontece.
  return `há ${Math.floor(dias / 30)} meses`
}
