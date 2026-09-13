import type {
  AdminTableColumn,
  TableActiveFilter,
  TableSortDirection,
  TableSortKind,
} from '~/types/table'

/**
 * As regras dos filtros por coluna das tabelas do admin, separadas de onde o
 * estado é guardado (a URL, em `useTableFilters`).
 *
 * A separação é o que torna as regras testáveis: aqui não há `useRoute` nem
 * `useRouter`, então cada decisão — validar valor de select, alternar uma
 * opção marcada, montar os chips do que está ativo, alternar o sentido da
 * ordenação — é função pura com entrada e saída, como o resto de `app/utils/`.
 *
 * O valor de um filtro é **sempre uma lista**, mesmo quando a coluna aceita um
 * valor só (aí é lista de zero ou um). Sem isso, cada ponto do caminho —
 * leitura da URL, chip, painel, parâmetro do endpoint — precisaria de um ramo
 * "é string ou é array?", que é onde esse tipo de tela costuma divergir.
 */

export const TABLE_SORT_KEY_PARAM = 'ordenar'
export const TABLE_SORT_DIRECTION_PARAM = 'direcao'

/** Separador da lista na URL: `?faixa=crianca,adolescente` continua legível num link. */
const VALUE_SEPARATOR = ','

const SORT_LABELS: Record<TableSortKind, { asc: string; desc: string }> = {
  alpha: { asc: 'A a Z', desc: 'Z a A' },
  numeric: { asc: 'Menor a maior', desc: 'Maior a menor' },
  date: { asc: 'Mais antiga a mais recente', desc: 'Mais recente a mais antiga' },
}

/** Par de rótulos do menu "Ordenar" — o sentido só faz sentido junto do tipo do dado. */
export function tableSortLabels(kind: TableSortKind): { asc: string; desc: string } {
  return SORT_LABELS[kind]
}

/**
 * Valores de filtro que a coluna aceita, a partir do que veio da URL.
 *
 * Só filtro de lista fechada é dividido pela vírgula — em campo de texto livre
 * a vírgula é conteúdo ("Silva, Jr."), não separador.
 *
 * Valor de select fora da lista é descartado: a URL é editável à mão e um valor
 * inventado vira 400 no endpoint (que valida por Zod), derrubando a tela em vez
 * de mostrar a lista sem recorte. Só que a lista de opções de vários recortes
 * vem de outra requisição (grupos, categorias) e chega vazia no primeiro
 * render — validar contra lista vazia descartaria o recorte de um link
 * legítimo, então lista vazia deixa passar.
 */
export function resolveFilterValues<T>(
  column: AdminTableColumn<T> | undefined,
  raw: string,
): string[] {
  const filter = column?.filter
  if (!filter) return []

  if (filter.type !== 'select') {
    const value = raw.trim()
    return value ? [value] : []
  }

  const entries = [...new Set(raw.split(VALUE_SEPARATOR).map((entry) => entry.trim()))].filter(
    Boolean,
  )
  if (!entries.length) return []

  const options = filter.options ?? []
  const known = options.length
    ? entries.filter((entry) => options.some((option) => option.value === entry))
    : entries

  // Coluna de valor único com dois valores na URL fica com o primeiro: o
  // endpoint aceitaria um só, e escolher em silêncio é melhor que devolver erro
  // por causa de um link editado à mão.
  return filter.multiple ? known : known.slice(0, 1)
}

/** Serializa de volta para a URL — lista vazia some do endereço, nunca vira `?faixa=`. */
export function serializeFilterValues(values: string[]): string | undefined {
  return values.length ? values.join(VALUE_SEPARATOR) : undefined
}

/**
 * Efeito de clicar numa opção do filtro.
 *
 * A opção vazia é sempre "sem recorte": marcá-la limpa a seleção inteira, em
 * vez de virar mais um valor marcado ao lado dos outros. Em coluna de múltipla
 * escolha, clicar de novo numa opção marcada a desmarca — é o único caminho
 * para tirar uma das duas faixas sem limpar as duas.
 */
export function toggleFilterValue(
  current: readonly string[],
  value: string,
  options: { multiple?: boolean } = {},
): string[] {
  if (!value) return []
  if (!options.multiple) return current.includes(value) ? [] : [value]
  return current.includes(value) ? current.filter((entry) => entry !== value) : [...current, value]
}

/**
 * Um chip por valor marcado (não por coluna): com duas faixas etárias
 * escolhidas, quem lê precisa poder tirar uma sem perder a outra.
 */
export function buildActiveFilters<T>(
  columns: readonly AdminTableColumn<T>[],
  values: Record<string, string[]>,
): TableActiveFilter[] {
  return columns.flatMap((column) =>
    (values[column.key] ?? []).map((value) => {
      const option = column.filter?.options?.find((item) => item.value === value)
      return {
        key: column.key,
        value,
        columnLabel: column.label,
        valueLabel: option?.label ?? value,
      }
    }),
  )
}

/**
 * Parâmetros de URL de um clique no menu "Ordenar".
 *
 * Uma coluna ordenada por vez (o parâmetro é um só, como o `sort` que os
 * endpoints aceitam), e clicar de novo na direção já ativa desliga a
 * ordenação — sem isso não haveria como voltar à ordem padrão da lista depois
 * de ordenar uma vez.
 */
export function buildSortPatch(
  key: string,
  direction: TableSortDirection,
  current: { key: string | null; direction: TableSortDirection },
): Record<string, string | undefined> {
  const isCurrent = current.key === key && current.direction === direction
  return {
    [TABLE_SORT_KEY_PARAM]: isCurrent ? undefined : key,
    [TABLE_SORT_DIRECTION_PARAM]: isCurrent ? undefined : direction,
  }
}

/** Parâmetros de URL do "Limpar tudo": toda coluna filtrável mais a ordenação. */
export function buildClearAllPatch<T>(
  columns: readonly AdminTableColumn<T>[],
): Record<string, string | undefined> {
  const patch: Record<string, string | undefined> = {
    [TABLE_SORT_KEY_PARAM]: undefined,
    [TABLE_SORT_DIRECTION_PARAM]: undefined,
  }
  for (const column of columns) {
    if (column.filter) patch[column.key] = undefined
  }
  return patch
}

/**
 * A fila que faz o filtro CEDER A PASSAGEM à navegação do usuário.
 *
 * O defeito que ela existe para pagar (achado em 2026-09-09, reproduzido em
 * 2026-09-10): digitar no filtro e clicar numa linha dentro da janela do
 * debounce (300ms) fazia o modal não abrir. O clique dispara um `router.push`
 * com `?editar=<id>`; com a navegação ainda em voo, o `router.replace` do
 * filtro **aborta** a anterior — o Vue Router cancela a navegação pendente, e
 * o `editar` nunca chega.
 *
 * O merge de `applyQuery` nunca foi o problema (ele monta o destino a partir
 * da query do momento e preserva as chaves alheias); o problema é o aborto.
 * Então a correção não é mesclar melhor, é **não escrever enquanto o usuário
 * está indo a algum lugar**: o patch fica guardado e é reaplicado quando a
 * navegação assenta, sobre a URL que ela produziu.
 *
 * Só aparecia sob carga — com a máquina folgada o `push` completa antes do
 * flush do debounce —, e é por isso que o estado vive aqui, fora do router:
 * assim a regra é verificável sem depender de tempo. Um teste E2E dedicado
 * chegou a ser escrito e foi descartado por ser instável por construção.
 */
export interface FilaDeQuery {
  /** `router.beforeEach`: alguém começou a navegar. */
  aoIniciar: () => void
  /** `router.afterEach`: a navegação assentou (com sucesso ou não). */
  aoTerminar: () => void
  /** Pede para escrever um patch na query — agora, ou quando der. */
  enfileirar: (patch: Record<string, string | undefined>) => void
  /** Só para teste/diagnóstico: há patch esperando? */
  readonly pendente: boolean
}

export function criarFilaDeQuery(
  escrever: (patch: Record<string, string | undefined>) => void,
): FilaDeQuery {
  let navegando = false
  let acumulado: Record<string, string | undefined> | null = null

  function despejar(): void {
    if (!acumulado) return
    const patch = acumulado
    // Zerado ANTES de escrever: `escrever` dispara uma navegação, que chama
    // `aoIniciar`/`aoTerminar` de volta — com o acumulado ainda cheio, o
    // despejo se repetiria para sempre.
    acumulado = null
    escrever(patch)
  }

  return {
    aoIniciar() {
      navegando = true
    },

    aoTerminar() {
      navegando = false
      despejar()
    },

    enfileirar(patch) {
      if (navegando) {
        // Acumula em vez de substituir: duas teclas e uma ordenação dentro da
        // mesma janela viram uma escrita só, e nenhuma se perde.
        acumulado = { ...(acumulado ?? {}), ...patch }
        return
      }
      escrever(patch)
    },

    get pendente() {
      return acumulado !== null
    },
  }
}
