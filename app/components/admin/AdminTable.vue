<!--
  Tabela densa da direção "livro de registro": linha de ~48px, divisores de
  1px, números tabulares e hover que desloca a linha 2px (.ledger-row) em vez
  de trocar de cor agressivamente.

  Abaixo de `md` a mesma marcação vira lista de blocos empilhados (rótulo à
  esquerda, valor à direita) via display — sem duplicar DOM e sem scroll
  horizontal. Por isso os rótulos de coluna vivem em `columns` e não em
  <th> escritos à mão: a versão empilhada precisa do mesmo rótulo dentro de
  cada célula.

  O cabeçalho de colunas acompanha a rolagem. Por padrão quem rola é a própria
  grade (`.table-scroll`, ver app/assets/css/main.css), não a página: o `sticky`
  gruda no topo dessa caixa, e cabeçalho, filtros e paginação ficam em vista ao
  mesmo tempo. Como a caixa é contêiner de rolagem nos dois eixos, a rolagem
  horizontal de tabela larga volta a caber junto — o que não seria possível se o
  cabeçalho dependesse do scroller da página.

  `scrollable: false` devolve o comportamento antigo (a tabela cresce e quem
  rola é a página). Aí o `sticky` se ancora no <main> do app shell, e passa a
  valer a condição de que nenhum ancestral seja contêiner de rolagem — é por
  isso que AdminPanel usa `overflow-clip` e não `overflow-hidden`.

  É a única tabela da plataforma desde que a listagem interna de casamentos
  migrou para cá — a `UiTable`, casca fina que servia as telas ainda não
  migradas, saiu sem nenhum uso restante.
-->
<script setup lang="ts" generic="Row extends { id: string }">
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { TableFiltersApi } from '~/composables/useTableFilters'
import type { AdminTableColumn, AdminTableSection, TableSortDirection } from '~/types/table'

interface Props {
  /**
   * Colunas declaradas pela página, nunca fixas no componente: quando um
   * dado novo passar a existir na API (ex.: status de RSVP na listagem de
   * convidados), a coluna entra na lista sem refazer a tela.
   */
  columns: readonly AdminTableColumn<Row>[]
  rows: readonly Row[]
  /** Texto curto do estado vazio, dentro do painel — nunca ilustração grande. */
  emptyLabel?: string
  /**
   * Quando devolve true, a linha ganha uma segunda linha logo abaixo com o
   * conteúdo do slot `detail` (ex.: nomes dos acompanhantes de um núcleo).
   * É o próprio predicado que controla a existência da linha — nunca uma
   * <tr> vazia por linha, que somaria um divisor fantasma em cada uma.
   */
  isExpanded?: (row: Row) => boolean
  /**
   * Torna a linha inteira uma área de clique (emite `row-click`). É só
   * conveniência de mouse: o alvo acessível continua sendo o controle dentro
   * da célula (nome clicável, ícone de ação), porque uma `<tr>` não é
   * focável nem anunciada como botão.
   */
  rowClickable?: boolean
  /**
   * Grade rolável (padrão). `false` deixa a tabela crescer e a página rolar —
   * para lista curta por natureza (prévia do dashboard), onde uma caixa de
   * rolagem só somaria uma barra a mais na tela.
   */
  scrollable?: boolean
  /**
   * Estado dos filtros por coluna (`useTableFilters`). Com ele, as colunas que
   * declaram `filter`/`sort` ganham o menu no próprio cabeçalho; sem ele a
   * tabela desenha exatamente como antes. O menu só existe do `md` pra cima,
   * onde há cabeçalho: no empilhado quem abre os filtros é
   * `AdminTableFilterBar`, com o mesmo painel dentro de um modal.
   */
  filters?: TableFiltersApi
  /**
   * Divide as linhas em blocos recolhíveis, cada um com um cabeçalho que
   * atravessa as colunas. Com `sections`, é ele que manda no corpo da tabela e
   * `rows` só responde pelo estado vazio — as duas listas descrevem o mesmo
   * conjunto, e a página monta as duas da mesma fonte.
   */
  sections?: readonly AdminTableSection<Row>[]
  /** Ids dos blocos recolhidos. O estado é da página, nunca da tabela. */
  collapsedIds?: readonly string[]
  /**
   * Onde moram os rótulos de coluna.
   *
   * `'table'` (padrão) é um `<thead>` fixo no topo — certo quando a tabela é
   * uma lista só. `'section'` põe os rótulos dentro de cada bloco, logo acima
   * das linhas dele, e serve à tabela fragmentada em muitos blocos pequenos:
   * lá em cima, o cabeçalho descreve linhas que estão a três blocos de
   * distância e, pior, faz o próprio cabeçalho do bloco parecer a primeira
   * linha de dados — "Casa das Pedras" lido como se fosse um fornecedor.
   *
   * Sem `<thead>` não há menu de filtro no cabeçalho: em `'section'` a página
   * precisa oferecer a entrada de filtro por fora (busca no painel e o botão
   * da `AdminTableFilterBar`).
   */
  columnHeader?: 'table' | 'section'
}

const {
  columns,
  rows,
  emptyLabel = 'Nenhum registro com esses filtros.',
  isExpanded,
  rowClickable = false,
  scrollable = true,
  filters,
  sections,
  collapsedIds,
  columnHeader = 'table',
} = defineProps<Props>()

const emit = defineEmits<{
  'row-click': [row: Row]
  'toggle-section': [id: string]
}>()

function isCollapsed(section: AdminTableSection<Row>): boolean {
  return (collapsedIds ?? []).includes(section.id)
}

// Um bloco recolhido continua contando: o cabeçalho anuncia quantas pessoas
// estão ali, e some só a lista.
function visibleRowsOf(section: AdminTableSection<Row>): readonly Row[] {
  return isCollapsed(section) ? [] : section.rows
}

/**
 * Os dois modos (plano e em blocos) passam pelo mesmo laço, com a tabela sem
 * seção virando um bloco único e sem cabeçalho. É o que impede a marcação da
 * linha — célula, rótulo empilhado do celular, slot por coluna — de existir
 * duas vezes no template e as duas versões divergirem na primeira correção.
 */
const blocks = computed(() => {
  if (!sections) return [{ id: '__plano__', section: null, rows }]
  return sections.map((section) => ({
    id: section.id,
    section,
    rows: visibleRowsOf(section),
  }))
})

// Uma célula por coluna declarada (`cell-<key>`) — nome dinâmico, então o
// tipo é declarado aqui para a página receber `row` já tipado no template.
//
// `stacked` é a linha do celular quando a página quer desenhá-la: o formato
// rótulo/valor automático serve tabela de três ou quatro colunas, mas com oito
// cada pessoa vira um bloco alto e uma lista de 15 passa de 2000px de rolagem.
// Com o slot, cada largura ganha o desenho certo a partir da MESMA linha de
// dados — nunca duas listas que podem divergir.
const slots = defineSlots<
  Record<string, (props: { row: Row }) => unknown> & {
    /** Linha final de um bloco — ex.: "Adicionar convidado" dentro do grupo. */
    'section-footer'?: (props: { section: AdminTableSection<Row> }) => unknown
  }
>()

const temLinhaDeCelular = computed(() => Boolean(slots.stacked))

function hasDetail(row: Row): boolean {
  return isExpanded ? isExpanded(row) : false
}

function handleRowClick(row: Row, event: MouseEvent): void {
  if (!rowClickable) return
  // Clique num controle da linha (excluir, expandir acompanhantes, link) é
  // dele, não da linha — senão o ícone de excluir abriria também o detalhe.
  const target = event.target as HTMLElement | null
  if (target?.closest('a, button, input, select, textarea, label, [role="button"]')) return
  emit('row-click', row)
}

function headClass(column: AdminTableColumn<Row>): string {
  return column.align === 'right' ? 'text-right' : ''
}

/**
 * O peso do cabeçalho do bloco. Por padrão vem do nível (0 forte, 1 discreto);
 * `emphasis` inverte onde a relação é outra — em Fornecedores a categoria só
 * agrupa e o gasto é a entidade que o casal procura.
 */
function sectionLabelClass(section: AdminTableSection<Row>): string {
  if (section.emphasis === 'quiet') {
    return 'text-xs font-semibold uppercase tracking-wide text-text-muted'
  }
  if (section.emphasis === 'strong') return 'text-base font-semibold text-text'
  return section.level === 0 ? 'text-base font-medium text-text' : 'text-sm text-text-muted'
}

// Coluna sem `filter` nem `sort` declarados não abre menu nenhum — é assim que
// a tabela evita oferecer um recorte que o endpoint não sabe fazer.
function isFilterable(column: AdminTableColumn<Row>): boolean {
  return Boolean(filters) && Boolean(column.filter || column.sort)
}

function filterValuesOf(column: AdminTableColumn<Row>): string[] {
  return filters?.valuesOf(column.key) ?? []
}

function sortDirectionOf(column: AdminTableColumn<Row>): TableSortDirection | null {
  return filters?.sortOf(column.key) ?? null
}

function ariaSort(column: AdminTableColumn<Row>): 'ascending' | 'descending' | 'none' | undefined {
  if (!isFilterable(column) || !column.sort) return undefined
  const direction = sortDirectionOf(column)
  if (!direction) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

// O sentido da ordenação vale mais que o funil na hora de bater o olho: é o
// que explica por que a lista está nessa ordem. Só quando não há ordenação o
// ícone volta a falar do filtro.
function triggerIcon(column: AdminTableColumn<Row>): string {
  const direction = sortDirectionOf(column)
  if (direction === 'asc') return 'lucide:arrow-up'
  if (direction === 'desc') return 'lucide:arrow-down'
  if (filterValuesOf(column).length) return 'lucide:filter'
  return 'lucide:chevron-down'
}

// Vale só para a versão empilhada (rótulo à esquerda, valor à direita). No
// desktop o alinhamento por coluna tem que estar na <td>, não aqui: o span é
// inline dentro de um table-cell, e text-align não posiciona elemento inline
// — era por isso que a coluna à direita não batia com o próprio <th>.
const STACKED_VALUE_CLASS = 'text-right md:text-left'
</script>

<template>
  <!-- break-words é herdado, então vale para toda célula: conteúdo comprido
       quebra linha em vez de empurrar a largura da tabela. -->
  <div class="overflow-clip break-words">
    <div :class="scrollable && 'table-scroll'">
      <table class="w-full text-left text-sm">
        <!-- Fundo opaco (e não `bg-surface-muted/50`): parado sobre as linhas, o
             meio-tom deixaria o conteúdo passar por baixo. Borda e fundo ficam
             na <th>, não no <thead> — é a célula que gruda, e no <thead> a borda
             some assim que a rolagem começa.

             Branco, e não `surface-muted`: o cabeçalho é chrome (diz como ler a
             tabela), a faixa de grupo é conteúdo (diz de quem é este trecho da
             lista). Os dois no mesmo tom faziam cabeçalho e primeiro grupo
             virarem uma massa cinza só, sem dizer onde um acabava. Agora o
             cabeçalho recua para o branco do cartão e quem carrega o tom é a
             faixa. -->
        <thead
          v-if="columnHeader === 'table'"
          class="sticky top-0 z-10 hidden md:table-header-group"
        >
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              scope="col"
              class="border-b border-border bg-surface-elevated px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-text-muted"
              :class="headClass(column)"
              :aria-sort="ariaSort(column)"
            >
              <span v-if="column.labelHidden" class="sr-only">{{ column.label }}</span>
              <span v-else class="inline-flex items-center gap-1">
                {{ column.label }}
                <PopoverRoot v-if="isFilterable(column)">
                  <PopoverTrigger
                    :aria-label="`Filtrar e ordenar por ${column.label}`"
                    class="rounded p-0.5 transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    :class="
                      filters?.isActive(column.key)
                        ? 'text-primary'
                        : 'text-text-muted/70 hover:text-text'
                    "
                  >
                    <Icon :name="triggerIcon(column)" class="h-3.5 w-3.5" />
                  </PopoverTrigger>
                  <!-- z-60 pelo mesmo motivo de UiSelect/UiColorPicker: listas
                       do admin também aparecem dentro de modal (z-50). -->
                  <PopoverPortal>
                    <PopoverContent
                      align="start"
                      :side-offset="6"
                      class="z-60 rounded-lg border border-border bg-surface-elevated p-3 text-left normal-case shadow-lg"
                    >
                      <AdminColumnFilter
                        :label="column.label"
                        :filter="column.filter"
                        :sort="column.sort"
                        :values="filterValuesOf(column)"
                        :direction="sortDirectionOf(column)"
                        @select="filters?.toggleValue(column.key, $event)"
                        @update:text="filters?.setText(column.key, $event)"
                        @sort="filters?.setSort(column.key, $event)"
                        @clear="filters?.clearColumn(column.key)"
                      />
                    </PopoverContent>
                  </PopoverPortal>
                </PopoverRoot>
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <template v-for="block in blocks" :key="block.id">
            <!-- Cabeçalho do bloco: atravessa as colunas e é o próprio
                 controle de recolher. Botão de verdade (não a <tr>), porque
                 linha de tabela não é focável nem anunciada como controle. -->
            <tr v-if="block.section" class="block md:table-row">
              <td
                :colspan="columns.length"
                class="block border-t border-border p-0 first:border-t-0 md:table-cell"
                :class="[
                  block.section.level === 0 ? 'bg-surface-muted' : 'bg-surface',
                  block.section.corEstilo === 'barra' && 'border-l-4',
                ]"
                :style="
                  block.section.corEstilo === 'barra' && block.section.cor
                    ? {
                        borderLeftColor: block.section.cor,
                        backgroundColor: block.section.corFundo ?? undefined,
                      }
                    : undefined
                "
              >
                <button
                  type="button"
                  :aria-expanded="!(collapsedIds ?? []).includes(block.section.id)"
                  class="flex w-full items-center gap-2 py-2.5 text-left transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  :class="block.section.level === 0 ? 'px-4' : 'px-4 md:pl-10'"
                  @click="emit('toggle-section', block.section.id)"
                >
                  <Icon
                    name="lucide:chevron-down"
                    class="h-4 w-4 shrink-0 text-text-muted transition-brand"
                    :class="(collapsedIds ?? []).includes(block.section.id) && '-rotate-90'"
                  />
                  <Icon
                    v-if="block.section.icon"
                    :name="block.section.icon"
                    class="h-4 w-4 shrink-0 text-text-muted"
                    :style="
                      block.section.corEstilo === 'barra' && block.section.cor
                        ? { color: block.section.cor }
                        : undefined
                    "
                  />
                  <span
                    v-if="block.section.cor && block.section.corEstilo !== 'barra'"
                    aria-hidden="true"
                    class="h-2 w-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: block.section.cor }"
                  />
                  <span class="flex min-w-0 flex-1 flex-col items-start">
                    <span class="flex min-w-0 max-w-full items-center gap-2">
                      <!-- 16px no bloco-raiz (a tabela herda 14px): o nome do
                           grupo é o título de um trecho da lista, não uma
                           célula, e no tamanho do corpo ele não se distinguia
                           das linhas que encabeça. A subdivisão fica em 14px de
                           propósito — os dois níveis precisam ser diferentes
                           entre si. `emphasis` inverte essa relação quando é o
                           nível de baixo que carrega a entidade. -->
                      <span class="min-w-0 truncate" :class="sectionLabelClass(block.section)">
                        {{ block.section.label }}
                      </span>
                      <!-- Ao lado do rótulo, não empurrado para a direita: numa
                           tabela larga o `ml-auto` jogaria a contagem para a
                           borda da largura ROLÁVEL, fora da área visível — o
                           cabeçalho do bloco atravessa todas as colunas.

                           E quem cede espaço primeiro é a meta, não o nome: com
                           `shrink-0` aqui, uma meta longa espremia o rótulo do
                           bloco até "F…" no celular — o dado mais importante da
                           linha desaparecendo para caber o de apoio. -->
                      <span
                        v-if="block.section.meta"
                        class="num min-w-0 truncate text-xs text-text-muted"
                      >
                        {{ block.section.meta }}
                      </span>
                      <UiBadge
                        v-if="block.section.badge"
                        :tone="block.section.badge.tone"
                        class="shrink-0"
                      >
                        {{ block.section.badge.label }}
                      </UiBadge>
                    </span>
                    <span
                      v-if="block.section.description"
                      class="num max-w-full truncate text-xs text-text-muted"
                    >
                      {{ block.section.description }}
                    </span>
                    <!-- A proporção como forma, não como terceiro número lido
                         em sequência. `aria-hidden` porque os valores que ela
                         representa já estão escritos na linha acima — para
                         leitor de tela ela seria repetição. -->
                    <span
                      v-if="block.section.progresso && block.section.progresso.total > 0"
                      aria-hidden="true"
                      class="mt-1.5 flex h-1 w-36 overflow-clip rounded-full bg-border"
                    >
                      <span
                        class="h-full"
                        :style="{
                          width: `${Math.min(100, (block.section.progresso.valor / block.section.progresso.total) * 100)}%`,
                          backgroundColor: block.section.cor ?? 'var(--color-text-muted)',
                        }"
                      />
                      <span
                        v-if="block.section.progresso.secundario"
                        class="h-full opacity-40"
                        :style="{
                          width: `${Math.max(0, Math.min(100, ((block.section.progresso.secundario - block.section.progresso.valor) / block.section.progresso.total) * 100))}%`,
                          backgroundColor: block.section.cor ?? 'var(--color-text-muted)',
                        }"
                      />
                    </span>
                  </span>
                </button>
              </td>
            </tr>

            <!-- Os rótulos de coluna dentro do bloco, imediatamente acima das
                 linhas que eles descrevem. `<th scope="col">` de verdade, e um
                 por bloco: numa tabela fragmentada é isso que diz ao leitor de
                 tela (e ao olho) que as colunas pertencem a ESTE trecho. Some
                 junto com as linhas quando o bloco não tem nenhuma. -->
            <tr
              v-if="columnHeader === 'section' && block.section && block.rows.length > 0"
              class="hidden md:table-row"
            >
              <th
                v-for="column in columns"
                :key="column.key"
                scope="col"
                class="border-b border-border bg-surface px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-text-muted"
                :class="headClass(column)"
              >
                <span v-if="column.labelHidden" class="sr-only">{{ column.label }}</span>
                <span v-else>{{ column.label }}</span>
              </th>
            </tr>

            <template v-for="row in block.rows" :key="row.id">
              <!-- Linha do celular desenhada pela página. Só existe abaixo de
                   `md`; do `md` pra cima quem manda é a grade de colunas. -->
              <tr
                v-if="temLinhaDeCelular"
                class="ledger-row block md:hidden"
                :class="rowClickable && 'cursor-pointer'"
                @click="handleRowClick(row, $event)"
              >
                <td class="block p-0">
                  <slot name="stacked" :row="row" />
                </td>
              </tr>
              <tr
                class="ledger-row block px-4 py-3 md:table-row md:px-0 md:py-0"
                :class="[
                  rowClickable && 'cursor-pointer',
                  temLinhaDeCelular && 'hidden md:table-row',
                ]"
                @click="handleRowClick(row, $event)"
              >
                <td
                  v-for="column in columns"
                  :key="column.key"
                  class="flex items-baseline justify-between gap-4 py-1 text-text md:table-cell md:px-4 md:py-2.5 md:align-middle"
                  :class="column.align === 'right' && 'md:text-right'"
                >
                  <span
                    v-if="!column.labelHidden"
                    class="shrink-0 text-xs uppercase tracking-wide text-text-muted md:hidden"
                  >
                    {{ column.label }}
                  </span>
                  <!-- ml-auto quando não há rótulo (coluna de ações): a célula é
                     flex no empilhado e, com um único filho, ele encostaria à
                     esquerda. Inline no desktop, onde margem auto não se
                     aplica — não afeta a tabela. -->
                  <span
                    class="min-w-0"
                    :class="[STACKED_VALUE_CLASS, column.labelHidden && 'ml-auto']"
                  >
                    <slot :name="`cell-${column.key}`" :row="row">
                      {{ column.value ? column.value(row) : '—' }}
                    </slot>
                  </span>
                </td>
              </tr>
              <tr v-if="hasDetail(row)" class="block bg-surface-muted/40 md:table-row">
                <td :colspan="columns.length" class="block px-4 py-3 md:table-cell">
                  <slot name="detail" :row="row" />
                </td>
              </tr>
            </template>

            <!-- Rodapé do bloco: a linha que continua a lista de dentro dele
                 (ex.: "Adicionar convidado"). Some com o bloco recolhido —
                 uma ação de acrescentar a um grupo fechado não tem alvo
                 visível. -->
            <tr
              v-if="
                block.section &&
                !(collapsedIds ?? []).includes(block.section.id) &&
                slots['section-footer']
              "
              class="block md:table-row"
            >
              <td :colspan="columns.length" class="block p-0 md:table-cell">
                <slot name="section-footer" :section="block.section" />
              </td>
            </tr>
          </template>
          <tr v-if="!rows.length">
            <td :colspan="columns.length" class="px-5 py-10 text-center text-sm text-text-muted">
              {{ emptyLabel }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
