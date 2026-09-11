<!--
  Orçamento — onde o casal PLANEJA.

  A tela responde, de cima para baixo: quanto temos, quanto reservamos por
  categoria, quanto achamos que cada coisa vai custar e o que já foi fechado.
  Pagamento não mora aqui: parcela, vencimento e "marcar pago" são a tela de
  Pagamentos, e foi misturar as duas coisas que deixou o casal sem lugar para
  planejar (rodada de 2026-09-11).
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type {
  BudgetCategoryInput,
  ExpenseInput,
  VendorContractInput,
} from '#shared/schemas/finance'
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
  listCategoriasComArquivadas,
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
const { data: categoriasSimples } = listCategorias()
const { data: todasCategorias } = listCategoriasComArquivadas()
const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()

const categorias = computed<CategoriaComDespesas[]>(() => orcamento.value?.categorias ?? [])
const todasDespesas = computed(() => categorias.value.flatMap((categoria) => categoria.despesas))

const recorteEstouro = computed(() => route.query.recorte === 'estouro')
const categoriaNaUrl = computed(() => route.query.categoria as string | undefined)

const categoriasVisiveis = computed(() =>
  recorteEstouro.value
    ? categorias.value.filter((categoria) => categoria.acimaDoOrcado > 0)
    : categorias.value,
)

// --- expansão ---
const abertas = ref(new Set<string>())

watch(
  [categoriaNaUrl, categorias],
  () => {
    if (categoriaNaUrl.value) abertas.value = new Set([categoriaNaUrl.value])
  },
  { immediate: true },
)

function alternarCategoria(chave: string) {
  const proximas = new Set(abertas.value)
  if (proximas.has(chave)) proximas.delete(chave)
  else proximas.add(chave)
  abertas.value = proximas
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

async function arquivar(categoria: CategoriaComDespesas) {
  if (!categoria.categoriaId) return
  try {
    await arquivarCategoria(categoria.categoriaId, true)
    toast.success('Categoria arquivada. Dá para restaurar no fim desta página.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar a categoria.'))
  }
}

/** Categorias fora de uso — a lista de onde elas voltam. */
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

function novaDespesa(categoria?: CategoriaComDespesas) {
  despesaEmEdicao.value = null
  categoriaPadrao.value = categoria?.categoriaId ?? null
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

// --- registrar o valor fechado direto da linha do gasto ---
const contratoAberto = ref(false)
const despesaDoContrato = ref<string | null>(null)

function abrirContratacao(despesa: DespesaComParcelas) {
  despesaDoContrato.value = despesa.id
  contratoAberto.value = true
}

async function confirmarContratacao(input: VendorContractInput) {
  const despesa = todasDespesas.value.find((d) => d.id === input.despesaId)
  try {
    // Com fornecedor vinculado, contratar é o fluxo completo (estágio +
    // parcelas). Sem fornecedor, é só registrar o valor fechado — o fornecedor
    // é opcional em todo o módulo, e exigir um aqui inventaria burocracia.
    if (despesa?.fornecedor) {
      await contratarFornecedor(despesa.fornecedor.id, input)
    } else {
      await atualizarDespesa(input.despesaId, { valorCentavos: input.valorCentavos })
    }
    contratoAberto.value = false
    toast.success('Valor fechado registrado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível registrar a contratação.'))
  }
}

function criarGastoPeloContrato() {
  contratoAberto.value = false
  novaDespesa()
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

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar o orçamento.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

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

        <div class="flex flex-col gap-4">
          <AdminFinanceCategoryGroup
            v-for="categoria in categoriasVisiveis"
            :key="categoria.categoriaId ?? 'sem-categoria'"
            :categoria="categoria"
            :aberta="abertas.has(categoria.categoriaId ?? 'sem-categoria')"
            @alternar="alternarCategoria(categoria.categoriaId ?? 'sem-categoria')"
            @editar-categoria="editarCategoria(categoria)"
            @arquivar-categoria="arquivar(categoria)"
            @nova-despesa="novaDespesa(categoria)"
            @editar-despesa="editarDespesa"
            @excluir-despesa="despesaParaExcluir = $event"
            @contratar-despesa="abrirContratacao"
          />
        </div>

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
