<!--
  Orçamento — a planilha, navegável em três níveis (categoria -> despesa ->
  parcelas).

  Os recortes chegam pela URL (`?categoria=`, `?vencimento=`, `?recorte=`)
  porque são o destino dos cliques da Visão geral: o bloco de atenção precisa
  levar exatamente às parcelas que ele contou, não a uma lista onde o casal
  procure de novo.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import {
  hojeNoFusoDoEvento,
  situacaoDaParcela,
  somarDias,
  DIAS_HORIZONTE_VENCIMENTO,
} from '#shared/utils/orcamento'
import type { BudgetCategoryInput, ExpenseInput } from '#shared/schemas/finance'
import type { CategoriaComDespesas, DespesaComParcelas, ParcelaDespesa } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const toast = useToast()

const {
  getOrcamento,
  listCategorias,
  criarCategoria,
  atualizarCategoria,
  excluirCategoria,
  criarDespesa,
  atualizarDespesa,
  excluirDespesa,
  gerarParcelasDaDespesa,
  atualizarParcela,
} = useFinance()

const { data: orcamento, status, error, refresh } = getOrcamento()
const { data: categoriasSimples } = listCategorias()
const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()

const hoje = hojeNoFusoDoEvento()
const limiteProximos = somarDias(hoje, DIAS_HORIZONTE_VENCIMENTO)

const categorias = computed<CategoriaComDespesas[]>(() => orcamento.value?.categorias ?? [])

/** Recorte vindo da Visão geral — some junto com o filtro quando limpo. */
const recorteVencimento = computed(() => route.query.vencimento as string | undefined)
const recorteEstouro = computed(() => route.query.recorte === 'estouro')
const categoriaNaUrl = computed(() => route.query.categoria as string | undefined)

const categoriasVisiveis = computed(() => {
  let lista = categorias.value

  if (recorteEstouro.value) {
    lista = lista.filter((categoria) => categoria.acimaDoPlanejado > 0)
  }

  if (recorteVencimento.value) {
    lista = lista
      .map((categoria) => ({
        ...categoria,
        despesas: categoria.despesas.filter((despesa) =>
          despesa.parcelas.some((parcela) => parcelaNoRecorte(parcela)),
        ),
      }))
      .filter((categoria) => categoria.despesas.length > 0)
  }

  return lista
})

function parcelaNoRecorte(parcela: ParcelaDespesa): boolean {
  const situacao = situacaoDaParcela(parcela, hoje)
  if (recorteVencimento.value === 'vencidos') return situacao === 'vencida'
  if (recorteVencimento.value === 'proximos') {
    return situacao === 'a_vencer' && parcela.vence_em <= limiteProximos
  }
  return true
}

const rotuloDoRecorte = computed(() => {
  if (recorteVencimento.value === 'vencidos') return 'Mostrando só o que está vencido'
  if (recorteVencimento.value === 'proximos') return 'Mostrando o que vence em 30 dias'
  if (recorteEstouro.value) return 'Mostrando só as categorias acima do planejado'
  return null
})

function limparRecorte() {
  router.replace({ query: {} })
}

// --- expansão ---
const abertas = ref(new Set<string>())

watch(
  [categoriaNaUrl, categorias],
  () => {
    if (categoriaNaUrl.value) {
      abertas.value = new Set([categoriaNaUrl.value])
      return
    }
    // Com recorte ativo, tudo aberto: quem clicou em "3 vencidos" quer ver as
    // três parcelas, não três cabeçalhos fechados.
    if (recorteVencimento.value || recorteEstouro.value) {
      abertas.value = new Set(
        categoriasVisiveis.value.map((categoria) => categoria.categoriaId ?? 'sem-categoria'),
      )
    }
  },
  { immediate: true },
)

function alternarCategoria(chave: string) {
  const proximas = new Set(abertas.value)
  if (proximas.has(chave)) proximas.delete(chave)
  else proximas.add(chave)
  abertas.value = proximas
}

// --- categoria ---
const categoriaModalAberto = ref(false)
const categoriaEmEdicao = ref<CategoriaComDespesas | null>(null)

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

async function arquivarCategoria(categoria: CategoriaComDespesas) {
  if (!categoria.categoriaId) return
  try {
    await excluirCategoria(categoria.categoriaId)
    toast.success('Categoria arquivada.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar a categoria.'))
  }
}

// --- despesa ---
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
        valorCentavos: input.valorCentavos,
        categoriaId: input.categoriaId,
        fornecedorId: input.fornecedorId,
        observacao: input.observacao,
      })
    } else {
      await criarDespesa(input)
    }
    despesaModalAberto.value = false
    toast.success('Despesa salva.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar a despesa.'))
  }
}

const despesaParaExcluir = ref<DespesaComParcelas | null>(null)

async function confirmarExclusao() {
  const despesa = despesaParaExcluir.value
  if (!despesa) return
  try {
    await excluirDespesa(despesa.id)
    despesaParaExcluir.value = null
    toast.success('Despesa excluída.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir a despesa.'))
  }
}

// --- parcelas ---
const parcelamentoAlvo = ref<DespesaComParcelas | null>(null)
const parcelamentoQuantidade = ref('2')
const parcelamentoData = ref(hoje)
const parcelamentoSubstitui = ref(false)

function abrirParcelamento(despesa: DespesaComParcelas) {
  parcelamentoAlvo.value = despesa
  parcelamentoQuantidade.value = '2'
  parcelamentoData.value = hoje
  parcelamentoSubstitui.value = despesa.parcelas.some((parcela) => !parcela.pago_em)
}

const saldoParaParcelar = computed(() => {
  const despesa = parcelamentoAlvo.value
  if (!despesa) return 0
  return parcelamentoSubstitui.value ? despesa.totais.aPagar : despesa.totais.naoParcelado
})

async function gerarParcelas() {
  const despesa = parcelamentoAlvo.value
  if (!despesa) return
  const quantidade = Number(parcelamentoQuantidade.value)

  try {
    await gerarParcelasDaDespesa(despesa.id, {
      parcelamento:
        quantidade <= 1
          ? { modo: 'a_vista', venceEm: parcelamentoData.value }
          : { modo: 'parcelado', quantidade, primeiroVencimento: parcelamentoData.value },
      substituirEmAberto: parcelamentoSubstitui.value,
    })
    parcelamentoAlvo.value = null
    toast.success('Parcelas geradas.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível gerar as parcelas.'))
  }
}

async function alternarPagamento(parcela: ParcelaDespesa) {
  try {
    await atualizarParcela(parcela.id, { pagoEm: parcela.pago_em ? null : hoje })
    toast.success(parcela.pago_em ? 'Pagamento desfeito.' : 'Parcela marcada como paga.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível atualizar a parcela.'))
  }
}
</script>

<template>
  <AdminSection
    title="Orçamento"
    description="Categorias, despesas e parcelas — a planilha, sem a planilha."
  >
    <template #actions>
      <UiButton variant="outline" @click="novaCategoria">Nova categoria</UiButton>
      <UiButton @click="novaDespesa()">Nova despesa</UiButton>
    </template>

    <div
      v-if="rotuloDoRecorte"
      class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-4 py-2.5"
    >
      <span class="text-sm text-text">{{ rotuloDoRecorte }}</span>
      <UiButton size="sm" variant="ghost" @click="limparRecorte">Ver tudo</UiButton>
    </div>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar o orçamento.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

    <UiEmptyState
      v-else-if="categoriasVisiveis.length === 0"
      icon="lucide:list"
      :title="rotuloDoRecorte ? 'Nada neste recorte' : 'Nenhuma categoria ainda'"
      :description="
        rotuloDoRecorte
          ? 'Nenhuma despesa corresponde ao filtro atual.'
          : 'Crie a primeira categoria para começar a organizar os custos.'
      "
    >
      <UiButton v-if="rotuloDoRecorte" variant="outline" @click="limparRecorte">Ver tudo</UiButton>
      <UiButton v-else @click="novaCategoria">Nova categoria</UiButton>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-4">
      <AdminFinanceCategoryGroup
        v-for="categoria in categoriasVisiveis"
        :key="categoria.categoriaId ?? 'sem-categoria'"
        :categoria="categoria"
        :hoje="hoje"
        :aberta="abertas.has(categoria.categoriaId ?? 'sem-categoria')"
        @alternar="alternarCategoria(categoria.categoriaId ?? 'sem-categoria')"
        @editar-categoria="editarCategoria(categoria)"
        @excluir-categoria="arquivarCategoria(categoria)"
        @nova-despesa="novaDespesa(categoria)"
        @editar-despesa="editarDespesa"
        @excluir-despesa="despesaParaExcluir = $event"
        @parcelar="abrirParcelamento"
        @alternar-pagamento="alternarPagamento"
      />
    </div>

    <AdminFinanceCategoryModal
      v-model="categoriaModalAberto"
      :categoria="
        categoriaEmEdicao?.categoriaId
          ? {
              id: categoriaEmEdicao.categoriaId,
              nome: categoriaEmEdicao.nome,
              valor_previsto_centavos: categoriaEmEdicao.previsto,
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

    <UiModal
      :model-value="Boolean(despesaParaExcluir)"
      title="Excluir despesa"
      :description="`“${despesaParaExcluir?.descricao}” sai do orçamento, junto com as parcelas dela.`"
      @update:model-value="despesaParaExcluir = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="despesaParaExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
      </div>
    </UiModal>

    <UiModal
      :model-value="Boolean(parcelamentoAlvo)"
      title="Gerar parcelas"
      :description="`Vamos dividir ${formatCentsToBRL(saldoParaParcelar)} — o saldo em aberto desta despesa.`"
      @update:model-value="parcelamentoAlvo = null"
    >
      <form class="flex flex-col gap-4" @submit.prevent="gerarParcelas">
        <UiInput v-model="parcelamentoQuantidade" label="Quantas parcelas" type="number" />
        <UiDatePicker v-model="parcelamentoData" label="Primeiro vencimento" />

        <UiCheckbox
          v-if="parcelamentoAlvo?.parcelas.some((parcela) => !parcela.pago_em)"
          v-model="parcelamentoSubstitui"
          label="Substituir as parcelas em aberto"
        />
        <p class="text-xs text-text-muted">
          Parcelas já pagas nunca são alteradas — elas são um fato registrado.
        </p>

        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="outline" @click="parcelamentoAlvo = null">Cancelar</UiButton>
          <UiButton type="submit">Gerar</UiButton>
        </div>
      </form>
    </UiModal>
  </AdminSection>
</template>
