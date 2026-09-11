<!--
  Orçamento — onde o casal PLANEJA.

  De cima para baixo: quanto temos, em que pé está o dinheiro (estimado →
  contratado → pago → a pagar) e, abaixo, cada categoria com os gastos dentro.
  Pagamento não mora aqui: parcela, vencimento e baixa são a tela de Pagamentos.

  Mesma mecânica de tabela do Modo Lista de convidados — blocos recolhíveis por
  categoria, filtro por coluna e formato empilhado no celular. A governança do
  Design System não admite <table> escrito à mão.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type {
  BudgetCategoryInput,
  ExpenseInput,
  VendorContractInput,
} from '#shared/schemas/finance'
import type { AdminTableColumn, AdminTableSection } from '~/types/table'
import type { CategoriaComDespesas, DespesaComParcelas } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
  getResumo,
  getOrcamento,
  listCategorias,
  definirTetoDoOrcamento,
  criarCategoria,
  criarCategoriasSugeridas,
  atualizarCategoria,
  arquivarCategoria,
  criarDespesa,
  atualizarDespesa,
  excluirDespesa,
  contratarFornecedor,
} = useFinance()

const { data: resumo, status, error, refresh } = getResumo()
const { data: orcamento } = getOrcamento()
const { data: todasCategorias } = listCategorias()

// Só as ativas podem ser escolhidas num gasto novo — oferecer uma arquivada
// seria ressuscitá-la pela porta dos fundos.
const categoriasSimples = computed(() => ({
  data: (todasCategorias.value?.data ?? []).filter((categoria) => !categoria.excluido_em),
}))
const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()

const categorias = computed<CategoriaComDespesas[]>(() => orcamento.value?.categorias ?? [])
const todasDespesas = computed(() => categorias.value.flatMap((categoria) => categoria.despesas))

// --- tabela ---
const colunas = computed<AdminTableColumn<DespesaComParcelas>[]>(() => [
  { key: 'gasto', label: 'Gasto', filter: { type: 'text', placeholder: 'Buscar gasto' } },
  {
    key: 'estagio',
    label: 'Situação',
    filter: {
      type: 'select',
      multiple: true,
      options: [
        { value: 'planejado', label: 'A contratar' },
        { value: 'contratado', label: 'Contratado' },
        { value: 'quitado', label: 'Quitado' },
      ],
    },
  },
  { key: 'estimado', label: 'Estimado', align: 'right', sort: 'numeric' },
  { key: 'final', label: 'Valor fechado', align: 'right', sort: 'numeric' },
  { key: 'pago', label: 'Pago', align: 'right' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const filters = useTableFilters(colunas)

const recorteEstouro = computed(() => route.query.recorte === 'estouro')
const categoriaNaUrl = computed(() => route.query.categoria as string | undefined)

function passaNoFiltro(despesa: DespesaComParcelas): boolean {
  const texto = (filters.values.value.gasto?.[0] ?? '').toLowerCase().trim()
  const estagios = filters.values.value.estagio ?? []

  if (texto && !despesa.descricao.toLowerCase().includes(texto)) return false
  if (estagios.length > 0 && !estagios.includes(despesa.totais.estagio)) return false
  return true
}

const categoriasVisiveis = computed(() => {
  const base = recorteEstouro.value
    ? categorias.value.filter((categoria) => categoria.acimaDoOrcado > 0)
    : categorias.value

  return base
    .map((categoria) => ({ ...categoria, despesas: categoria.despesas.filter(passaNoFiltro) }))
    .filter((categoria) => categoria.despesas.length > 0 || !temFiltroAtivo.value)
})

const temFiltroAtivo = computed(
  () =>
    (filters.values.value.gasto?.length ?? 0) > 0 ||
    (filters.values.value.estagio?.length ?? 0) > 0,
)

const linhas = computed(() => categoriasVisiveis.value.flatMap((categoria) => categoria.despesas))

const secoes = computed<AdminTableSection<DespesaComParcelas>[]>(() =>
  categoriasVisiveis.value.map((categoria) => {
    const partes: string[] = []
    if (categoria.orcado > 0) partes.push(`orçado ${formatCentsToBRL(categoria.orcado)}`)
    partes.push(`estimado ${formatCentsToBRL(categoria.estimado)}`)
    if (categoria.contratado > 0) {
      partes.push(`contratado ${formatCentsToBRL(categoria.contratado)}`)
    }
    if (categoria.acimaDoOrcado > 0) {
      partes.push(`${formatCentsToBRL(categoria.acimaDoOrcado)} acima do orçado`)
    }

    return {
      id: categoria.categoriaId ?? 'sem-categoria',
      label: categoria.nome,
      level: 0 as const,
      meta: partes.join(' · '),
      icon: 'lucide:folder',
      rows: categoria.despesas,
    }
  }),
)

const recolhidos = ref<string[]>([])

watch(
  [categoriaNaUrl, categorias],
  () => {
    // Chegando por link de uma categoria específica, só ela fica aberta.
    if (categoriaNaUrl.value) {
      recolhidos.value = categorias.value
        .map((categoria) => categoria.categoriaId ?? 'sem-categoria')
        .filter((id) => id !== categoriaNaUrl.value)
    }
  },
  { immediate: true },
)

function alternarBloco(id: string) {
  recolhidos.value = recolhidos.value.includes(id)
    ? recolhidos.value.filter((atual) => atual !== id)
    : [...recolhidos.value, id]
}

const tudoRecolhido = computed(() => recolhidos.value.length >= secoes.value.length)

function alternarTudo() {
  recolhidos.value = tudoRecolhido.value ? [] : secoes.value.map((secao) => secao.id)
}

// --- teto ---
const tetoAberto = ref(false)

async function salvarTeto(valor: number | null) {
  try {
    await definirTetoDoOrcamento(valor)
    tetoAberto.value = false
    toast.success(valor === null ? 'Orçamento total removido.' : 'Orçamento total atualizado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o orçamento total.'))
  }
}

// --- categorias ---
const categoriaModalAberto = ref(false)
const categoriaEmEdicao = ref<CategoriaComDespesas | null>(null)
const semeando = ref(false)

function novaCategoria() {
  categoriaEmEdicao.value = null
  categoriaModalAberto.value = true
}

function editarCategoria(categoria: CategoriaComDespesas) {
  categoriaEmEdicao.value = categoria
  categoriaModalAberto.value = true
}

function editarCategoriaPorId(id: string) {
  const categoria = categorias.value.find((atual) => (atual.categoriaId ?? 'sem-categoria') === id)
  if (categoria?.categoriaId) editarCategoria(categoria)
}

async function salvarCategoria(input: BudgetCategoryInput) {
  try {
    if (categoriaEmEdicao.value?.categoriaId) {
      await atualizarCategoria(categoriaEmEdicao.value.categoriaId, input)
    } else {
      await criarCategoria(input)
    }
    categoriaModalAberto.value = false
    toast.success('Categoria salva.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar a categoria.'))
  }
}

async function comecarComSugeridas() {
  semeando.value = true
  try {
    const criadas = await criarCategoriasSugeridas()
    toast.success(`${criadas.length} categorias criadas.`)
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível criar as categorias.'))
  } finally {
    semeando.value = false
  }
}

async function arquivarPorId(id: string) {
  const categoria = categorias.value.find((atual) => (atual.categoriaId ?? 'sem-categoria') === id)
  if (!categoria?.categoriaId) return
  try {
    await arquivarCategoria(categoria.categoriaId, true)
    toast.success('Categoria arquivada. Dá para restaurar no fim desta página.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar a categoria.'))
  }
}

const arquivadas = computed(() =>
  (todasCategorias.value?.data ?? []).filter((categoria) => categoria.excluido_em),
)
const mostrarArquivadas = ref(false)

async function restaurar(id: string) {
  try {
    await arquivarCategoria(id, false)
    toast.success('Categoria restaurada.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível restaurar a categoria.'))
  }
}

// --- gastos ---
const despesaModalAberto = ref(false)
const despesaEmEdicao = ref<DespesaComParcelas | null>(null)
const categoriaPadrao = ref<string | null>(null)

function novaDespesa(categoriaId?: string) {
  despesaEmEdicao.value = null
  categoriaPadrao.value = categoriaId && categoriaId !== 'sem-categoria' ? categoriaId : null
  despesaModalAberto.value = true
}

function editarDespesa(despesa: DespesaComParcelas) {
  despesaEmEdicao.value = despesa
  categoriaPadrao.value = null
  despesaModalAberto.value = true
}

async function salvarDespesa(input: ExpenseInput) {
  try {
    if (despesaEmEdicao.value) {
      await atualizarDespesa(despesaEmEdicao.value.id, {
        descricao: input.descricao,
        valorEstimadoCentavos: input.valorEstimadoCentavos,
        valorCentavos: input.valorCentavos,
        categoriaId: input.categoriaId,
        fornecedorId: input.fornecedorId,
        observacao: input.observacao,
      })
    } else {
      await criarDespesa(input)
    }
    despesaModalAberto.value = false
    toast.success('Gasto salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o gasto.'))
  }
}

const despesaParaExcluir = ref<DespesaComParcelas | null>(null)

async function confirmarExclusao() {
  const despesa = despesaParaExcluir.value
  if (!despesa) return
  try {
    await excluirDespesa(despesa.id)
    despesaParaExcluir.value = null
    toast.success('Gasto excluído.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir o gasto.'))
  }
}

// --- registrar o valor fechado direto da linha ---
const contratoAberto = ref(false)
const despesaDoContrato = ref<string | null>(null)

function abrirContratacao(despesa: DespesaComParcelas) {
  despesaDoContrato.value = despesa.id
  contratoAberto.value = true
}

async function confirmarContratacao(input: VendorContractInput) {
  const despesa = todasDespesas.value.find((atual) => atual.id === input.despesaId)
  try {
    // Com fornecedor vinculado, contratar é o fluxo completo (estágio +
    // parcelas). Sem fornecedor, é só registrar o valor fechado — o fornecedor
    // é opcional em todo o módulo.
    if (despesa?.fornecedor) {
      await contratarFornecedor(despesa.fornecedor.id, input)
    } else {
      await atualizarDespesa(input.despesaId, { valorCentavos: input.valorCentavos })
    }
    contratoAberto.value = false
    toast.success('Valor fechado registrado — o pagamento já está em Pagamentos.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível registrar a contratação.'))
  }
}

function criarGastoPeloContrato() {
  contratoAberto.value = false
  novaDespesa()
}

/** Quanto o fechado diferiu do estimado — economia aparece como ganho. */
function desvio(despesa: DespesaComParcelas): { texto: string; economia: boolean } | null {
  const valor = despesa.totais.desvioDoEstimado
  if (valor === null || valor === 0) return null
  return {
    texto: `${valor > 0 ? '+' : '−'}${formatCentsToBRL(Math.abs(valor))}`,
    economia: valor < 0,
  }
}
</script>

<template>
  <AdminSection
    title="Orçamento"
    description="Quanto vocês pretendem gastar, e o que já está fechado."
  >
    <template #actions>
      <UiButton variant="outline" @click="novaCategoria">Nova categoria</UiButton>
      <UiButton @click="novaDespesa()">Novo gasto</UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar o orçamento"
      description="Tente novamente em alguns instantes."
    >
      <UiButton variant="outline" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else-if="resumo">
      <UiEmptyState
        v-if="resumo.vazio"
        icon="lucide:wallet"
        title="Comece pelo orçamento"
        description="Crie as categorias do seu casamento e vá registrando o que for planejando. Dá para começar com as categorias que quase todo casamento tem — e mudar tudo depois."
      >
        <div class="flex flex-wrap justify-center gap-2">
          <UiButton :disabled="semeando" @click="comecarComSugeridas">
            Começar com as categorias sugeridas
          </UiButton>
          <UiButton variant="outline" @click="novaCategoria">Criar do zero</UiButton>
        </div>
      </UiEmptyState>

      <template v-else>
        <AdminFinanceTotalsHeader :resumo="resumo" @editar-teto="tetoAberto = true" />

        <div
          v-if="recorteEstouro"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-4 py-2.5"
        >
          <span class="text-sm text-text">Mostrando só as categorias acima do orçado</span>
          <UiButton size="sm" variant="ghost" @click="router.replace({ query: {} })">
            Ver tudo
          </UiButton>
        </div>

        <AdminTableFilterBar
          :filters="filters"
          :columns="colunas"
          group-label="Filtros do orçamento"
        />

        <AdminPanel title="Categorias e gastos" :meta="`${linhas.length} gastos`">
          <template #headerActions>
            <UiButton variant="ghost" size="sm" @click="alternarTudo">
              <Icon
                :name="tudoRecolhido ? 'lucide:unfold-vertical' : 'lucide:fold-vertical'"
                class="h-4 w-4"
              />
              {{ tudoRecolhido ? 'Expandir tudo' : 'Recolher tudo' }}
            </UiButton>
          </template>

          <AdminTable
            :columns="colunas"
            :rows="linhas"
            :sections="secoes"
            :collapsed-ids="recolhidos"
            :filters="filters"
            empty-label="Nenhum gasto com esses filtros."
            @toggle-section="alternarBloco"
          >
            <template #cell-gasto="{ row }">
              <div class="min-w-0">
                <span class="block truncate text-text">{{ row.descricao }}</span>
                <span v-if="row.fornecedor" class="block truncate text-xs text-text-muted">
                  {{ row.fornecedor.nome }}
                </span>
              </div>
            </template>

            <template #cell-estagio="{ row }">
              <UiBadge
                :tone="
                  row.totais.estagio === 'quitado'
                    ? 'success'
                    : row.totais.estagio === 'contratado'
                      ? 'primary'
                      : 'neutral'
                "
              >
                {{
                  row.totais.estagio === 'quitado'
                    ? 'Quitado'
                    : row.totais.estagio === 'contratado'
                      ? 'Contratado'
                      : 'A contratar'
                }}
              </UiBadge>
            </template>

            <template #cell-estimado="{ row }">
              <span class="tabular-nums text-text-muted">
                {{ formatCentsToBRL(row.totais.estimado) }}
              </span>
            </template>

            <template #cell-final="{ row }">
              <template v-if="row.totais.contratado !== null">
                <span class="tabular-nums text-text">
                  {{ formatCentsToBRL(row.totais.contratado) }}
                </span>
                <span
                  v-if="desvio(row)"
                  class="ml-1.5 text-xs"
                  :class="desvio(row)?.economia ? 'text-success' : 'text-warning'"
                >
                  {{ desvio(row)?.texto }}
                </span>
              </template>
              <button
                v-else
                type="button"
                class="text-xs text-primary underline-offset-2 hover:underline"
                @click="abrirContratacao(row)"
              >
                registrar valor fechado
              </button>
            </template>

            <template #cell-pago="{ row }">
              <span class="tabular-nums text-text-muted">
                {{ row.totais.pago > 0 ? formatCentsToBRL(row.totais.pago) : '—' }}
              </span>
            </template>

            <template #cell-acoes="{ row }">
              <div class="flex items-center justify-end gap-1">
                <AdminRowAction
                  icon="lucide:pencil"
                  label="Editar gasto"
                  @click="editarDespesa(row)"
                />
                <AdminRowAction
                  icon="lucide:trash-2"
                  label="Excluir gasto"
                  @click="despesaParaExcluir = row"
                />
              </div>
            </template>

            <template #stacked="{ row }">
              <div class="flex flex-col gap-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-text">{{ row.descricao }}</span>
                  <UiBadge v-if="row.totais.contratado === null" tone="neutral">
                    A contratar
                  </UiBadge>
                </div>
                <span class="text-sm tabular-nums text-text-muted">
                  estimado {{ formatCentsToBRL(row.totais.estimado) }}
                  <template v-if="row.totais.contratado !== null">
                    · fechado {{ formatCentsToBRL(row.totais.contratado) }}
                  </template>
                </span>
                <div class="mt-1 flex items-center gap-1">
                  <UiButton
                    v-if="row.totais.contratado === null"
                    size="sm"
                    variant="outline"
                    @click="abrirContratacao(row)"
                  >
                    Registrar valor
                  </UiButton>
                  <AdminRowAction
                    icon="lucide:pencil"
                    label="Editar gasto"
                    @click="editarDespesa(row)"
                  />
                  <AdminRowAction
                    icon="lucide:trash-2"
                    label="Excluir gasto"
                    @click="despesaParaExcluir = row"
                  />
                </div>
              </div>
            </template>

            <template #section-footer="{ section }">
              <div class="flex flex-wrap items-center gap-1">
                <UiButton size="sm" variant="ghost" @click="novaDespesa(section.id)">
                  <Icon name="lucide:plus" class="h-4 w-4" />
                  Adicionar gasto
                </UiButton>
                <template v-if="section.id !== 'sem-categoria'">
                  <UiButton size="sm" variant="ghost" @click="editarCategoriaPorId(section.id)">
                    Editar categoria
                  </UiButton>
                  <UiButton size="sm" variant="ghost" @click="arquivarPorId(section.id)">
                    Arquivar
                  </UiButton>
                </template>
              </div>
            </template>
          </AdminTable>
        </AdminPanel>

        <!-- A ponte entre planejar e pagar é explícita, não adivinhada. -->
        <NuxtLink
          v-if="resumo.aPagar > 0"
          :to="`${base}/pagamentos`"
          class="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface-elevated px-4 py-3 transition-colors hover:bg-surface-muted/60 sm:px-5"
        >
          <Icon name="lucide:calendar-clock" class="h-4 w-4 shrink-0 text-text-muted" />
          <span class="text-sm text-text">
            {{ formatCentsToBRL(resumo.aPagar) }} a pagar do que já foi contratado
          </span>
          <span class="ml-auto text-xs text-text-muted">ver em Pagamentos</span>
        </NuxtLink>

        <AdminPanel v-if="arquivadas.length > 0">
          <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-text-muted hover:text-text"
              :aria-expanded="mostrarArquivadas"
              @click="mostrarArquivadas = !mostrarArquivadas"
            >
              <Icon
                :name="mostrarArquivadas ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                class="h-4 w-4"
              />
              {{ arquivadas.length }}
              {{ arquivadas.length === 1 ? 'categoria arquivada' : 'categorias arquivadas' }}
            </button>
          </div>

          <ul v-if="mostrarArquivadas" class="divide-y divide-border border-t border-border">
            <li
              v-for="categoria in arquivadas"
              :key="categoria.id"
              class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
            >
              <span class="min-w-0 flex-1 truncate text-sm text-text-muted">
                {{ categoria.nome }}
              </span>
              <span v-if="categoria.valor_previsto_centavos > 0" class="text-xs text-text-muted">
                orçado {{ formatCentsToBRL(categoria.valor_previsto_centavos) }}
              </span>
              <UiButton size="sm" variant="ghost" @click="restaurar(categoria.id)">
                Restaurar
              </UiButton>
            </li>
          </ul>
        </AdminPanel>
      </template>

      <AdminFinanceBudgetTotalModal
        v-model="tetoAberto"
        :teto-centavos="resumo.teto"
        :planejado-centavos="resumo.orcado"
        @salvar="salvarTeto"
      />
    </template>

    <AdminFinanceCategoryModal
      v-model="categoriaModalAberto"
      :categoria="
        categoriaEmEdicao?.categoriaId
          ? {
              id: categoriaEmEdicao.categoriaId,
              nome: categoriaEmEdicao.nome,
              valor_previsto_centavos: categoriaEmEdicao.orcado,
            }
          : null
      "
      @salvar="salvarCategoria"
    />

    <AdminFinanceExpenseModal
      v-model="despesaModalAberto"
      :despesa="despesaEmEdicao"
      :categorias="categoriasSimples?.data ?? []"
      :fornecedores="fornecedores?.data ?? []"
      :categoria-padrao="categoriaPadrao"
      @salvar="salvarDespesa"
    />

    <AdminFinanceContractModal
      v-model="contratoAberto"
      :fornecedor="null"
      :despesas="todasDespesas"
      :despesa-padrao="despesaDoContrato"
      @contratar="confirmarContratacao"
      @criar-gasto="criarGastoPeloContrato"
    />

    <UiModal
      :model-value="Boolean(despesaParaExcluir)"
      title="Excluir gasto"
      :description="`“${despesaParaExcluir?.descricao}” sai do orçamento, junto com as parcelas dele.`"
      @update:model-value="despesaParaExcluir = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="despesaParaExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
