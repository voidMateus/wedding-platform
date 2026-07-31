// Resolve a data/hora-alvo do casamento para a contagem regressiva (Fase
// Visual). event_date é sempre obrigatório; event_time é opcional — sem
// horário definido, o alvo é meia-noite do dia do evento. Cálculo feito no
// horário local de quem acessa (nem event_date nem event_time têm
// timezone no banco — mesmo nível de "ingenuidade" de fuso já existente).

export function resolveEventDateTime(eventDate: string, eventTime: string | null): Date {
  const time = eventTime ?? '00:00:00'
  const normalizedTime = time.length === 5 ? `${time}:00` : time
  return new Date(`${eventDate}T${normalizedTime}`)
}
