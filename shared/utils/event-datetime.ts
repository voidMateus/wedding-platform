// Resolve a data/hora-alvo do casamento para a contagem regressiva (Fase
// Visual). data_evento é sempre obrigatório; horario_evento é opcional —
// sem horário definido, o alvo é meia-noite do dia do evento. Cálculo feito
// no horário local de quem acessa (nem data_evento nem horario_evento têm
// timezone no banco — mesmo nível de "ingenuidade" de fuso já existente).

export function resolveEventDateTime(dataEvento: string, horarioEvento: string | null): Date {
  const time = horarioEvento ?? '00:00:00'
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return new Date(`${dataEvento}T${normalizedTime}`)
}
