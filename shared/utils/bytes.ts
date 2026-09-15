/**
 * Bytes viram texto só na hora de mostrar (docs/fase5-multievento.md 8.2).
 *
 * O banco devolve o dado-base — bytes —, e quem escolhe entre "12,4 MB" e
 * "1,83 GB" é a tela. É a mesma regra dos centímetros da planta de mesas: o
 * pixel é `cm × zoom` e só existe na renderização (CLAUDE.md, seção 12).
 *
 * Base 1024 (KB/MB/GB no sentido que todo painel de hospedagem usa), uma casa
 * decimal a partir de MB — abaixo disso a fração não informa nada.
 */
const UNIDADES = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  let valor = bytes
  let unidade = 0
  while (valor >= 1024 && unidade < UNIDADES.length - 1) {
    valor /= 1024
    unidade += 1
  }

  // Byte e KB inteiros: "1,4 KB" sugere uma precisão que ninguém usa.
  const casas = unidade >= 2 ? 1 : 0
  return `${valor.toFixed(casas).replace('.', ',')} ${UNIDADES[unidade]}`
}
