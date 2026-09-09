/**
 * Vocabulário de grupo e subdivisão, compartilhado por client e server.
 *
 * Mora fora de `importacao-convidados.ts` porque não é assunto de importação:
 * o nome qualificado aparece na revisão da planilha, no resultado da
 * importação e em todo seletor de grupo do admin. Uma subdivisão só é
 * identificável pelo PAR grupo+nome — duas famílias podem ter "Primos" —,
 * então mostrar o nome sozinho deixaria duas opções idênticas na tela, sem
 * como escolher entre elas.
 */

/**
 * Separador do nome qualificado ("Família do Mateus › Primos").
 *
 * O mesmo separador está escrito em `importar_convidados` (migration
 * 20260908090002), que monta `subgruposCriados` do lado do Postgres: os dois
 * precisam bater para o casal ver o mesmo nome antes e depois de confirmar.
 */
export const SEPARADOR_SUBGRUPO = ' › '

export function qualificarSubgrupo(grupo: string, subgrupo: string): string {
  return `${grupo}${SEPARADOR_SUBGRUPO}${subgrupo}`
}
