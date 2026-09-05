/**
 * Contrato das tabelas do admin — coluna, filtro por coluna e ordenação.
 *
 * Vive em `app/types/` (e não dentro de `AdminTable.vue`, onde
 * `AdminTableColumn` nasceu) porque agora são quatro consumidores do mesmo
 * contrato: a tabela, o painel de filtro, a barra de filtros ativos e o
 * composable `useTableFilters` — e um deles não é componente.
 */

export type TableSortDirection = 'asc' | 'desc'

/**
 * Só muda o par de rótulos do menu ("A a Z" vs "Menor a maior" vs "Mais
 * antiga a mais recente"). Quem ordena de fato é o endpoint (listas
 * paginadas) ou a própria página (listas carregadas inteiras) — a tabela
 * nunca reordena `rows` por conta própria.
 */
export type TableSortKind = 'alpha' | 'numeric' | 'date'

export interface TableFilterOption {
  value: string
  label: string
}

export interface TableColumnFilter {
  /** 'select' quando a lista de valores é fechada e conhecida; 'text' no resto. */
  type: 'text' | 'select'
  /** Obrigatório em 'select' — pode chegar vazio enquanto a lista carrega. */
  options?: readonly TableFilterOption[]
  placeholder?: string
  /**
   * Múltipla escolha (só 'select'): marcar duas faixas etárias recorta as duas
   * ao mesmo tempo. Exige que o endpoint aceite lista naquele parâmetro — sem
   * isso o segundo valor seria ignorado em silêncio.
   */
  multiple?: boolean
}

export interface AdminTableColumn<T> {
  key: string
  label: string
  align?: 'left' | 'right'
  /** Coluna de ações: rótulo só para leitor de tela, nunca desenhado. */
  labelHidden?: boolean
  /** Valor padrão da célula quando a página não passa o slot `cell-<key>`. */
  value?: (row: T) => string | number
  /**
   * Declarar `filter`/`sort` é o que faz a coluna ganhar o menu no cabeçalho.
   * Coluna sem nenhum dos dois não abre menu nenhum — e isso é regra, não
   * descuido: filtro que não filtra de verdade (porque o endpoint não sabe
   * aquele recorte, ou porque o valor é derivado só da página carregada) é
   * pior que filtro ausente, já que quem usa confia nele.
   */
  filter?: TableColumnFilter
  sort?: TableSortKind
}

/**
 * Um valor marcado num filtro de coluna — um chip da barra de filtros ativos.
 * É por valor, não por coluna: com duas faixas marcadas são dois chips, e tirar
 * uma não derruba a outra.
 */
export interface TableActiveFilter {
  key: string
  value: string
  columnLabel: string
  valueLabel: string
}
