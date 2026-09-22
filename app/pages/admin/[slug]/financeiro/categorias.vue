<!--
  Categorias — o mesmo desenho de Grupos, em Convidados.

  Lá, "Andamento por grupo" é uma linha por grupo: ponto de cor, barra de
  proporção e a contagem à direita ("2/3 confirmados"). É um gerenciador de
  etiqueta que, de graça, virou a resposta para "como está cada pedaço?".

  Aqui a tradução é direta: a barra vira proporção de DINHEIRO (o pago dentro do
  contratado, contra o estimado) e a contagem vira "R$ X de R$ Y contratados".
  Por isso esta tela existe apesar da regra do módulo de que tela nova precisa
  de eixo novo — ela não relista os gastos por outro critério: ela soma. A
  pergunta "onde o dinheiro está indo?" não tem resposta numa lista de linhas
  individuais, e era a única do módulo sem lugar.

  O nome de cada categoria leva de volta para a lista já filtrada: o roll-up só
  serve se der para descer dele.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { BudgetCategoryInput } from '#shared/schemas/finance'
import type { CategoriaComDespesas } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const toast = useToast()

const { getOrcamento, listCategorias, criarCategoria, atualizarCategoria, arquivarCategoria } =
  useFinance()
const { data: orcamento, status, error, refresh } = getOrcamento()
const { data: todasCategorias } = listCategorias()
const { corDaCategoria } = useCategoriaCores()

const recorte = ref('ativas')
const chips = [
  { value: 'ativas', label: 'Ativas' },
  { value: 'arquivadas', label: 'Arquivadas' },
] as const

/**
 * As categorias com dinheiro dentro — inclusive a pseudo "Sem categoria".
 *
 * Ordenadas pelo TAMANHO, não pela ordem de exibição do orçamento: a tela
 * pergunta "onde o dinheiro está indo?", e a resposta de uma lista ordenada por
 * outro critério exige que o casal leia as doze linhas e ordene de cabeça.
 * "Sem categoria" fica sempre por último — é resto, não resposta.
 */
const linhas = computed<CategoriaComDespesas[]>(() =>
  [...(orcamento.value?.categorias ?? [])].sort((a, b) => {
    if (a.categoriaId === null) return 1
    if (b.categoriaId === null) return -1
    return Math.max(b.estimado, b.contratado) - Math.max(a.estimado, a.contratado)
  }),
)

/**
 * A régua é COMPARTILHADA entre as linhas: a maior categoria define 100%.
 *
 * Com uma régua por linha (o que Grupos faz, porque lá toda barra é "quantos
 * dos meus confirmaram"), Bebidas com R$ 1.620 desenhava uma barra do tamanho
 * da de Espaço com R$ 15.000 — e a tela que promete mostrar para onde o
 * dinheiro está indo dizia que os dois pesam igual. Aqui o comprimento é o
 * tamanho da categoria, e o preenchimento é o quanto dela já está fechado.
 */
const regua = computed(() =>
  Math.max(1, ...linhas.value.map((linha) => Math.max(linha.estimado, linha.contratado))),
)

const arquivadas = computed(() =>
  (todasCategorias.value?.data ?? []).filter((categoria) => categoria.excluido_em),
)

const totalLabel = computed(() => {
  const total = linhas.value.filter((linha) => linha.categoriaId !== null).length
  return `${total} categoria${total === 1 ? '' : 's'}`
})

/**
 * Três camadas na mesma trilha, contra a régua compartilhada: o total da
 * categoria (o quanto ela pesa), o contratado dentro dele e o pago dentro do
 * contratado. O teto nunca entra na régua — uma categoria sem teto ficaria sem
 * barra, e uma estourada desenharia 100%, escondendo justamente o estouro.
 */
function proporcao(linha: CategoriaComDespesas) {
  const total = Math.max(linha.estimado, linha.contratado)
  if (total === 0) return null
  const cor =
    linha.corIndice === null ? null : corDaCategoria(linha.corIndice, linha.corPersonalizada)
  const largura = (valor: number) => `${Math.min(100, (valor / regua.value) * 100)}%`
  return {
    total: largura(total),
    contratado: largura(linha.contratado),
    pago: largura(linha.pago),
    // "Sem categoria" não tem cor de categoria: pintá-la com a cor do texto
    // fazia a linha menos significativa da tela ter a barra mais pesada dela.
    solida: cor?.solida ?? 'var(--color-text-muted)',
  }
}

/** "2/3 confirmados" de Grupos, em dinheiro. */
function resumo(linha: CategoriaComDespesas): string {
  if (linha.estimado === 0 && linha.contratado === 0) return 'Nada planejado ainda'
  if (linha.contratado === 0) return `nada fechado de ${formatCentsToBRL(linha.estimado)}`
  return `${formatCentsToBRL(linha.contratado)} de ${formatCentsToBRL(linha.estimado)} contratados`
}

/**
 * Quais categorias estão abertas.
 *
 * A linha era um link para a lista de gastos filtrada; virou expansão porque a
 * pergunta de quem clica numa categoria é "o que tem aqui dentro?", e a
 * resposta cabe na própria linha — inclusive editável. O caminho para a lista
 * continua existindo, dentro do que abriu.
 */
const expandidas = ref<string[]>([])

/**
 * Ninguém planejou nada ainda?
 *
 * Categoria existe, gasto nenhum — exatamente o estado de quem acabou de semear
 * as sugeridas e foi trazido para cá (ponto 10). É o único momento em que a
 * tela precisa dizer o que é, e ela para de dizer sozinha: some quando o
 * primeiro gasto entra, como o acolhimento do Início — nunca um modal.
 */
const primeiroPlanejamento = computed(
  () => linhas.value.length > 0 && linhas.value.every((linha) => linha.despesas.length === 0),
)

/**
 * A primeira categoria abre sozinha, e só no primeiro planejamento.
 *
 * Chegar aqui e encontrar treze linhas fechadas para contemplar é o mesmo erro
 * do ponto 10 um passo adiante: o casal precisa cair no GESTO. Depois que
 * existe gasto, a tela volta a abrir fechada — aí a pergunta é "onde o
 * dinheiro está indo?", e a resposta é o agregado, não um formulário.
 */
watch(
  [primeiroPlanejamento, linhas],
  ([primeiro, atuais]) => {
    if (!primeiro || expandidas.value.length > 0) return
    const primeiraLinha = atuais[0]
    if (primeiraLinha) expandidas.value = [chave(primeiraLinha)]
  },
  { immediate: true },
)

function chave(linha: CategoriaComDespesas): string {
  return linha.categoriaId ?? 'sem-categoria'
}

function aberta(linha: CategoriaComDespesas): boolean {
  return expandidas.value.includes(chave(linha))
}

function alternar(linha: CategoriaComDespesas) {
  const id = chave(linha)
  expandidas.value = aberta(linha)
    ? expandidas.value.filter((atual) => atual !== id)
    : [...expandidas.value, id]
}

// --- criar / editar ---
const modalAberto = ref(false)
const emEdicao = ref<CategoriaComDespesas | null>(null)

function novaCategoria() {
  emEdicao.value = null
  modalAberto.value = true
}

function editar(linha: CategoriaComDespesas) {
  emEdicao.value = linha
  modalAberto.value = true
}

async function salvar(input: BudgetCategoryInput) {
  try {
    if (emEdicao.value?.categoriaId) {
      await atualizarCategoria(emEdicao.value.categoriaId, input)
    } else {
      await criarCategoria(input)
    }
    modalAberto.value = false
    toast.success('Categoria salva.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar a categoria.'))
  }
}

async function arquivar(id: string, arquivada: boolean) {
  try {
    await arquivarCategoria(id, arquivada)
    toast.success(arquivada ? 'Categoria arquivada.' : 'Categoria restaurada.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar a categoria.'))
  }
}
</script>

<template>
  <AdminSection title="Onde o dinheiro está indo" :meta="totalLabel">
    <template #actions>
      <UiButton @click="novaCategoria">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar categoria
      </UiButton>
    </template>

    <!-- Sem título próprio: a pergunta subiu para o título da TELA quando ela
         deixou de se chamar "Categorias" (ponto 13), e repeti-la aqui seria o
         mesmo texto duas vezes na mesma dobra. -->
    <!-- A linha de acolhimento, e não um modal: quem chega de "começar com as
         sugeridas" precisa saber o que fazer com treze categorias vazias
         (ponto 10). Ela some sozinha quando o primeiro gasto entra — mesma
         lógica do Início: a explicação serve ao primeiro dia e atrapalha no
         trigésimo. -->
    <p
      v-if="primeiroPlanejamento"
      class="mb-4 rounded-md border border-border bg-surface-muted/60 px-4 py-3 text-sm leading-relaxed text-text-muted"
    >
      <strong class="font-medium text-text">É aqui que vocês planejam.</strong>
      Abra uma categoria e escreva o que pretendem contratar, com quanto imaginam gastar — um item
      por linha, sem formulário. O valor pode ficar em branco enquanto vocês não souberem.
    </p>

    <AdminPanel>
      <template #headerActions>
        <AdminFilterChips
          v-model="recorte"
          :items="chips"
          group-label="Filtrar categorias por situação"
        />
      </template>

      <div v-if="status === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 4" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:triangle-alert"
          title="Não foi possível carregar as categorias"
          description="Tente novamente em alguns instantes."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <!-- ARQUIVADAS -->
      <template v-else-if="recorte === 'arquivadas'">
        <p v-if="arquivadas.length === 0" class="px-5 py-10 text-center text-sm text-text-muted">
          Nenhuma categoria arquivada.
        </p>
        <ul v-else class="divide-y divide-border">
          <li
            v-for="categoria in arquivadas"
            :key="categoria.id"
            class="ledger-row flex items-center gap-3 px-4 py-3.5 sm:px-5"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-text">{{ categoria.nome }}</span>
            <AdminRowAction
              icon="lucide:archive-restore"
              :label="`Restaurar categoria ${categoria.nome}`"
              @click="arquivar(categoria.id, false)"
            />
          </li>
        </ul>
      </template>

      <!-- ATIVAS -->
      <div v-else-if="linhas.length === 0" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:tags"
          title="Nenhuma categoria ainda"
          description="Categoria é o rótulo e a cor de cada gasto — Buffet, Decoração, Música. Ela agrupa o dinheiro para vocês enxergarem para onde ele está indo."
        >
          <UiButton @click="novaCategoria">Adicionar categoria</UiButton>
        </UiEmptyState>
      </div>

      <ul v-else class="divide-y divide-border">
        <li v-for="linha in linhas" :key="chave(linha)" class="ledger-row flex flex-col">
          <div class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
            <button
              type="button"
              class="flex min-w-0 flex-1 flex-col gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-5"
              :aria-expanded="aberta(linha)"
              @click="alternar(linha)"
            >
              <!-- A largura serve ao NOSSO catálogo: "Cerimônia e assessoria" e
                   "Papelaria e lembranças" pedem 152px de texto, e a coluna de
                   176px dava 136px — a plataforma cortava nomes que ela mesma
                   semeou. 224px deixa 184px de caixa, folga que absorve
                   diferença de métrica de fonte entre sistemas. Nome que o
                   casal inventa maior continua truncando, com o texto inteiro
                   no `title`. -->
              <span
                class="flex min-w-0 items-center gap-2 text-sm font-medium text-text sm:w-56 sm:flex-none"
              >
                <Icon
                  name="lucide:chevron-down"
                  class="h-4 w-4 shrink-0 text-text-muted transition-brand"
                  :class="!aberta(linha) && '-rotate-90'"
                />
                <span
                  v-if="linha.corIndice !== null"
                  aria-hidden="true"
                  class="h-2.5 w-2.5 shrink-0 rounded-full"
                  :style="{
                    backgroundColor: corDaCategoria(linha.corIndice, linha.corPersonalizada).solida,
                  }"
                />
                <span class="truncate" data-testid="nome-da-categoria" :title="linha.nome">{{
                  linha.nome
                }}</span>
              </span>

              <!-- aria-hidden: a mesma informação está no texto ao lado. -->
              <span
                class="relative block h-2 w-full overflow-hidden rounded-full bg-text/10 sm:min-w-16 sm:flex-1"
                aria-hidden="true"
              >
                <template v-if="proporcao(linha)">
                  <span
                    class="absolute inset-y-0 left-0 rounded-full opacity-20 transition-brand"
                    :style="{
                      width: proporcao(linha)?.total,
                      backgroundColor: proporcao(linha)?.solida,
                    }"
                  />
                  <span
                    class="absolute inset-y-0 left-0 rounded-full opacity-50 transition-brand"
                    :style="{
                      width: proporcao(linha)?.contratado,
                      backgroundColor: proporcao(linha)?.solida,
                    }"
                  />
                  <span
                    class="absolute inset-y-0 left-0 rounded-full transition-brand"
                    :style="{
                      width: proporcao(linha)?.pago,
                      backgroundColor: proporcao(linha)?.solida,
                    }"
                  />
                </template>
              </span>

              <!-- O selo de estouro vive junto dos números, que é o assunto dele. -->
              <span class="flex flex-col items-start gap-1 sm:w-52 sm:items-end">
                <UiBadge v-if="linha.acimaDoOrcado > 0" tone="danger">
                  {{ formatCentsToBRL(linha.acimaDoOrcado) }} acima do teto
                </UiBadge>
                <span class="num text-xs text-text-muted sm:text-right">{{ resumo(linha) }}</span>
              </span>
            </button>

            <!-- Largura FIXA: com as ações encolhendo ou crescendo por linha, a
                 barra ao lado mudaria de largura junto — e barras de larguras
                 diferentes não podem ser comparadas, que é o que esta tela
                 promete. -->
            <span class="flex shrink-0 items-center justify-end gap-1 sm:w-20">
              <!-- "Sem categoria" não é linha do banco: não se renomeia nem se
                   arquiva, e oferecer os botões prometeria o que não existe. -->
              <template v-if="linha.categoriaId">
                <AdminRowAction
                  icon="lucide:pencil"
                  :label="`Editar categoria ${linha.nome}`"
                  @click="editar(linha)"
                />
                <AdminRowAction
                  icon="lucide:archive"
                  tone="danger"
                  :label="`Arquivar categoria ${linha.nome}`"
                  @click="arquivar(linha.categoriaId, true)"
                />
              </template>
            </span>
          </div>

          <div v-if="aberta(linha)" class="border-t border-border px-4 py-2 sm:px-5 sm:pl-12">
            <AdminFinanceCategoryExpenses
              :categoria="linha"
              :base="base"
              :comecar-digitando="primeiroPlanejamento"
            />
          </div>
        </li>
      </ul>
    </AdminPanel>

    <AdminFinanceCategoryModal
      v-model="modalAberto"
      :categoria="
        emEdicao?.categoriaId
          ? {
              id: emEdicao.categoriaId,
              nome: emEdicao.nome,
              valor_previsto_centavos: emEdicao.orcado,
              cor_indice: emEdicao.corIndice ?? 0,
              cor_personalizada: emEdicao.corPersonalizada,
            }
          : null
      "
      @salvar="salvar"
    />
  </AdminSection>
</template>
