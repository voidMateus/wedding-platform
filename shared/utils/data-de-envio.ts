/**
 * O instante que representa "mandei neste dia".
 *
 * O casal escolhe um DIA; a coluna guarda um timestamp. A conversão entre os
 * dois tem duas decisões que não podem divergir entre as telas que registram
 * envio (a fila de Comunicações e a ficha do convite), e é por isso que ela
 * mora aqui em vez de em cada uma.
 *
 * **Meio-dia, nunca meia-noite.** A data escolhida é local e o campo é UTC:
 * `2026-09-20T00:00` no fuso de Brasília vira o dia 19 em UTC, e o envio
 * apareceria um dia antes do que o casal declarou. Meio-dia sobra folga para
 * qualquer fuso do país nos dois sentidos.
 *
 * **Hoje devolve `undefined`**, e não o meio-dia de hoje: quem registra hoje
 * está dizendo "agora", e o `now()` do banco é mais preciso que um meio-dia
 * inventado — que, às nove da manhã, ainda seria futuro.
 */
export function instanteDoEnvio(dia: string, agora: Date = new Date()): string | undefined {
  if (!dia) return undefined

  const hoje = diaLocal(agora)
  if (dia >= hoje) return undefined

  return new Date(`${dia}T12:00:00`).toISOString()
}

/** `YYYY-MM-DD` no fuso de quem está olhando — nunca `toISOString`, que é UTC. */
export function diaLocal(momento: Date = new Date()): string {
  const mes = String(momento.getMonth() + 1).padStart(2, '0')
  const diaDoMes = String(momento.getDate()).padStart(2, '0')
  return `${momento.getFullYear()}-${mes}-${diaDoMes}`
}
