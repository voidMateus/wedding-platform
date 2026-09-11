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
import {
  applyTableFilters,
  compareNumber,
  compareText,
  type ClientColumn,
} from '~/utils/table-rows'

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
const { corDaCategoria } = useCategoriaCores()
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
  { key: 'pago', label: 'Pago', align: 'right', sort: 'numeric' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

/**
 * De onde sai o valor de cada coluna, para filtrar e ordenar.
 *
 * Sem isto, declarar `sort` na coluna só desenhava o menu: a tabela nunca
 * reordena `rows` por conta própria, e quem clicava em "Maior a menor" via a
 * lista inalterada. Filtro que não filtra é pior que filtro ausente.
 */
const acessores: Record<string, ClientColumn<DespesaComParcelas>> = {
  gasto: {
    value: (despesa) => despesa.descricao,
    compare: compareText((despesa) => despesa.descricao),
  },
  estagio: { value: (despesa) => despesa.totais.estagio },
  estimado: { compare: compareNumber((despesa) => despesa.totais.estimado) },
  // Gasto ainda sem valor fechado ordena como zero — ele fica junto de quem
  // ainda não tem compromisso, que é onde o casal espera encontrá-lo.
  final: { compare: compareNumber((despesa) => despesa.totais.contratado ?? 0) },
  pago: { compare: compareNumber((despesa) => despesa.totais.pago) },
}

const filters = useTableFilters(colunas)

const recorteEstouro = computed(() => route.query.recorte === 'estouro')
const categoriaNaUrl = computed(() => route.query.categoria as string | undefined)

const temFiltroAtivo = computed(() => Object.keys(filters.values.value).length > 0)

// O recorte acontece DENTRO de cada categoria: a lista é uma árvore, e filtrar
// a planificação desmontaria os blocos.
const categoriasVisiveis = computed(() => {
  const base = recorteEstouro.value
    ? categorias.value.filter((categoria) => categoria.acimaDoOrcado > 0)
    : categorias.value

  return base
    .map((categoria) => ({
      ...categoria,
      despesas: applyTableFilters(categoria.despesas, colunas.value, acessores, {
        values: filters.values.value,
        sortKey: filters.sortKey.value,
        sortDirection: filters.sortDirection.value,
      }),
    }))
    .filter((categoria) => categoria.despesas.length > 0 || !temFiltroAtivo.value)
})

const linhas = computed(() => categoriasVisiveis.value.flatMap((categoria) => categoria.despesas))

/** Filete + fundo tingido do bloco, a partir do slot da categoria. */
function corDoBloco(categoria: { corIndice: number | null; corPersonalizada: string | null }) {
  // "Sem categoria" não tem linha no banco, então também não tem slot: um
  // filete colorido ali sugeriria uma categoria que não existe.
  if (categoria.corIndice === null) return {}
  const cor = corDaCategoria(categoria.corIndice, categoria.corPersonalizada)
  return { cor: cor.solida, corFundo: cor.fundo, corEstilo: 'barra' as const }
}

const secoes = computed<AdminTableSection<DespesaComParcelas>[]>(() =>
  categoriasVisiveis.value.map((categoria) => {
    // Dois números, não quatro: o teto e o que já foi comprometido contra ele.
    // A faixa antiga concatenava orçado, estimado, contratado e o estouro numa
    // só linha cinza — e a categoria estourada lia igual à saudável.
    const partes: string[] = []
    if (categoria.orcado > 0) {
      partes.push(
        `${formatCentsToBRL(categoria.estimado)} de ${formatCentsToBRL(categoria.orcado)}`,
      )
    } else {
      partes.push(`estimado ${formatCentsToBRL(categoria.estimado)}`)
    }

    return {
      id: categoria.categoriaId ?? 'sem-categoria',
      label: categoria.nome,
      level: 0 as const,
      meta: partes.join(' · '),
      badge:
        categoria.acimaDoOrcado > 0
          ? {
              label: `${formatCentsToBRL(categoria.acimaDoOrcado)} acima`,
              tone: 'danger' as const,
            }
          : undefined,
      icon: 'lucide:folder',
      // A cor da categoria é a mesma nas três telas do módulo: ela vem do slot
      // da linha (`cor_indice`) girado a partir da cor tema do casamento.
      ...corDoBloco(categoria),
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
  (todasCategorias.value?.data ?? [])
    .filter((categoria) => categoria.excluido_em)
    .map((categoria) => ({
      id: categoria.id,
      nome: categoria.nome,
      detalhe:
        categoria.valor_previsto_centavos > 0
          ? `orçado ${formatCentsToBRL(categoria.valor_previsto_centavos)}`
          : null,
    })),
)

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
    <!-- "Adicionar <entidade>" + lucide:plus é a forma canônica do CTA no
         admin; "Novo <entidade>" fica reservado ao título do modal que ele
         abre (DESIGN-SYSTEM §2). Categoria é estrutura, gasto é conteúdo —
         daí só um dos dois ser o botão cheio. -->
    <template #actions>
      <UiButton variant="ghost" @click="novaCategoria">
        <Icon name="lucide:folder-plus" class="h-4 w-4" />
        Adicionar categoria
      </UiButton>
      <UiButton @click="novaDespesa()">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar gasto
      </UiButton>
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
        <AdminFinanceTotalsHeader :resumo="resumo" :base="base" @editar-teto="tetoAberto = true" />

        <div
          v-if="recorteEstouro"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-4 py-2.5"
        >
          <span class="text-sm text-text">Mostrando só as categorias acima do orçado</span>
          <UiButton size="sm" variant="ghost" @click="router.replace({ query: {} })">
            Ver tudo
          </UiButton>
        </div>

        <AdminPanel title="Categorias e gastos" :meta="`${linhas.length} gastos`">
          <!-- A barra de filtros ativos mora DENTRO do painel: ela descreve o
               recorte da tabela logo abaixo, e solta criava uma faixa vazia
               entre o resumo e o painel sempre que nada estava filtrado. -->
          <template #headerActions>
            <AdminTableFilterBar
              :filters="filters"
              :columns="colunas"
              group-label="Filtros do orçamento"
            />
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
            row-clickable
            empty-label="Nenhum gasto com esses filtros."
            @toggle-section="alternarBloco"
            @row-click="editarDespesa"
          >
            <template #cell-gasto="{ row }">
              <div class="min-w-0">
                <button
                  type="button"
                  class="block max-w-full truncate text-left text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="editarDespesa(row)"
                >
                  {{ row.descricao }}
                </button>
                <span v-if="row.fornecedor" class="block truncate text-xs text-text-muted">
                  {{ row.fornecedor.nome }}
                </span>
              </div>
            </template>

            <!-- Tons pelo mapa da plataforma: "A contratar" é fato sem
                 valência (neutral), "Contratado" ainda tem dinheiro a sair
                 (warning, o mesmo de `a_pagar` do fornecedor) e "Quitado" é o
                 desfecho resolvido. `primary` é canal de identidade, nunca de
                 estado — e era a única variante sem preenchimento, o que
                 deixava o estado mais importante da coluna como o mais
                 apagado dos três. -->
            <template #cell-estagio="{ row }">
              <UiBadge
                :tone="
                  row.totais.estagio === 'quitado'
                    ? 'success'
                    : row.totais.estagio === 'contratado'
                      ? 'warning'
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
              <span class="num text-text-muted">
                {{ formatCentsToBRL(row.totais.estimado) }}
              </span>
            </template>

            <template #cell-final="{ row }">
              <template v-if="row.totais.contratado !== null">
                <span class="num text-text">
                  {{ formatCentsToBRL(row.totais.contratado) }}
                </span>
                <span
                  v-if="desvio(row)"
                  class="num ml-1.5 text-sm"
                  :class="desvio(row)?.economia ? 'text-success' : 'text-warning'"
                >
                  {{ desvio(row)?.texto }}
                </span>
              </template>
              <!-- Preencher o valor fechado é o gesto central do módulo: é ele
                   que transforma plano em compromisso e manda o gasto para
                   Pagamentos. Era o menor controle da tela, em 12px. -->
              <UiButton v-else size="sm" variant="outline" @click="abrirContratacao(row)">
                Registrar valor
              </UiButton>
            </template>

            <template #cell-pago="{ row }">
              <span class="num text-text-muted">
                {{ row.totais.pago > 0 ? formatCentsToBRL(row.totais.pago) : '—' }}
              </span>
            </template>

            <!-- Um controle por linha: editar é a própria linha (clicável),
                 como na lista de convidados. -->
            <template #cell-acoes="{ row }">
              <div class="flex items-center justify-end gap-1">
                <AdminRowAction
                  icon="lucide:trash-2"
                  label="Excluir gasto"
                  tone="danger"
                  @click="despesaParaExcluir = row"
                />
              </div>
            </template>

            <template #stacked="{ row }">
              <div class="flex flex-col gap-1 px-4 py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-medium text-text">{{ row.descricao }}</span>
                  <UiBadge v-if="row.totais.contratado === null" tone="neutral">
                    A contratar
                  </UiBadge>
                </div>
                <span class="num text-sm text-text-muted">
                  estimado {{ formatCentsToBRL(row.totais.estimado) }}
                  <template v-if="row.totais.contratado !== null">
                    · fechado {{ formatCentsToBRL(row.totais.contratado) }}
                  </template>
                </span>
                <!-- `size="md"` (40px) e não `sm`: no celular estes são o
                     único caminho para a ação, e `sm` fica abaixo do alvo de
                     toque confortável. -->
                <div class="mt-1 flex items-center gap-2">
                  <UiButton
                    v-if="row.totais.contratado === null"
                    variant="outline"
                    @click="abrirContratacao(row)"
                  >
                    Registrar valor
                  </UiButton>
                  <UiButton variant="ghost" @click="editarDespesa(row)">Editar</UiButton>
                  <AdminRowAction
                    icon="lucide:trash-2"
                    label="Excluir gasto"
                    tone="danger"
                    @click="despesaParaExcluir = row"
                  />
                </div>
              </div>
            </template>

            <!-- O rodapé do bloco continua a lista de dentro dele. As duas
                 ações da categoria viram ícones: rotuladas, elas repetiam três
                 botões de texto em cada categoria e viravam a coisa mais
                 pesada da tela. -->
            <template #section-footer="{ section }">
              <div class="flex flex-wrap items-center gap-1 px-4 py-2 md:pl-10">
                <UiButton size="sm" variant="ghost" @click="novaDespesa(section.id)">
                  <Icon name="lucide:plus" class="h-4 w-4" />
                  Adicionar gasto
                </UiButton>
                <template v-if="section.id !== 'sem-categoria'">
                  <AdminRowAction
                    icon="lucide:pencil"
                    :label="`Editar categoria ${section.label}`"
                    @click="editarCategoriaPorId(section.id)"
                  />
                  <AdminRowAction
                    icon="lucide:archive"
                    :label="`Arquivar categoria ${section.label}`"
                    @click="arquivarPorId(section.id)"
                  />
                </template>
              </div>
            </template>
          </AdminTable>
        </AdminPanel>

        <AdminArchivedList
          :itens="arquivadas"
          singular="categoria arquivada"
          plural="categorias arquivadas"
          @restaurar="restaurar"
        />
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
              cor_indice: categoriaEmEdicao.corIndice ?? 0,
              cor_personalizada: categoriaEmEdicao.corPersonalizada,
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
      <template #footer>
        <UiButton variant="ghost" @click="despesaParaExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Excluir</UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
