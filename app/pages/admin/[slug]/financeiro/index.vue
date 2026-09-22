<!--
  Gastos — a lista do único objeto do Financeiro.

  O módulo tinha quatro telas (Orçamento, Fornecedores, Pagamentos, Documentos)
  porque foi desenhado em cima de VERBOS: planejar, cotar, pagar, anexar. Mas o
  casal não pensa em verbos — pensa em "o buffet". Com a vida de um gasto
  picada em quatro telas, cada uma precisava reapresentá-lo do zero (nome,
  categoria, cor, e o dinheiro dele de novo), e era daí que vinha a repetição.

  Aqui existe um substantivo só. Fornecedor, parcela, documento e categoria são
  atributos ou filhos do gasto — nunca telas irmãs. Categoria virou filtro e
  cor; fornecedor e documento vivem na ficha. A segunda tela do módulo é
  Pagamentos, e ela se justifica por ser outro EIXO (o tempo), não outro objeto.

  Cada linha mostra UM número, escolhido pela fase (shared/utils/orcamento.ts,
  `numeroDoGasto`). Antes eram cinco na mesma linha, e nenhum respondia "e daí?".
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { faseDoGasto, numeroDoGasto, type FaseDoGasto } from '#shared/utils/orcamento'
import type { ExpenseInput, RegistrarContratacaoInput } from '#shared/schemas/finance'
import type { AdminRowMenuItem } from '~/components/admin/AdminRowMenu.vue'
import type { AdminTableColumn } from '~/types/table'
import type {
  CategoriaComDespesas,
  DespesaComParcelas,
  DocumentoComVinculos,
  FornecedorComSituacao,
} from '~/types/finance'
import {
  applyTableFilters,
  compareNumber,
  compareText,
  type ClientColumn,
} from '~/utils/table-rows'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const toast = useToast()

const {
  getResumo,
  getOrcamento,
  listCategorias,
  definirTetoDoOrcamento,
  criarCategoriasSugeridas,
  criarDespesa,
  excluirDespesa,
  registrarContratacao,
} = useFinance()

const { data: resumo, status, error, refresh } = getResumo()
const { data: orcamento } = getOrcamento()
const { data: todasCategorias } = listCategorias()
const { corDaCategoria } = useCategoriaCores()
const { listVendors } = useVendors()
const { data: fornecedores } = listVendors()
const { listDocuments, atualizarDocumento, obterUrlDoDocumento } = useFinanceDocuments()
const { data: documentos } = listDocuments()

const categorias = computed<CategoriaComDespesas[]>(() => orcamento.value?.categorias ?? [])
const todasDespesas = computed(() => categorias.value.flatMap((categoria) => categoria.despesas))

// Só as ativas podem ser escolhidas num gasto novo — oferecer uma arquivada
// seria ressuscitá-la pela porta dos fundos.
const categoriasAtivas = computed(() =>
  (todasCategorias.value?.data ?? []).filter((categoria) => !categoria.excluido_em),
)

/**
 * A linha da lista: o gasto mais o que a fase dele exige para ser desenhada.
 *
 * As propostas entram aqui porque são elas que distinguem "ninguém cotou" de
 * "três preços na mesa esperando decisão" — a distinção que fazia falta e que
 * era o assunto inteiro da antiga tela de Fornecedores.
 */
interface GastoNaLista {
  /** O id do gasto — `AdminTable` identifica linha por ele. */
  id: string
  despesa: DespesaComParcelas
  fase: FaseDoGasto
  numero: { rotulo: string; valor: number }
  propostas: number
  categoriaId: string
  categoriaNome: string
  cor: string | null
}

const SEM_CATEGORIA = 'sem-categoria'

const gastos = computed<GastoNaLista[]>(() => {
  const porGasto = new Map<string, FornecedorComSituacao[]>()
  for (const fornecedor of fornecedores.value?.data ?? []) {
    if (fornecedor.excluido_em || !fornecedor.gasto) continue
    const lista = porGasto.get(fornecedor.gasto.id) ?? []
    lista.push(fornecedor)
    porGasto.set(fornecedor.gasto.id, lista)
  }

  return categorias.value.flatMap((categoria) =>
    categoria.despesas.map((despesa) => {
      const propostas = porGasto.get(despesa.id) ?? []
      const precos = propostas
        .map((fornecedor) => fornecedor.valor_proposto_centavos)
        .filter((valor): valor is number => typeof valor === 'number' && valor > 0)
      const fase = faseDoGasto(despesa.totais, propostas.length)

      return {
        id: despesa.id,
        despesa,
        fase,
        numero: numeroDoGasto(despesa.totais, fase, precos.length > 0 ? Math.min(...precos) : null),
        propostas: propostas.length,
        categoriaId: categoria.categoriaId ?? SEM_CATEGORIA,
        categoriaNome: categoria.nome,
        cor:
          categoria.corIndice === null
            ? null
            : corDaCategoria(categoria.corIndice, categoria.corPersonalizada).solida,
      }
    }),
  )
})

/**
 * Um vocabulário só para a fase — o mesmo no selo da linha, no filtro da coluna
 * e na ficha. O módulo já perdeu uma rodada inteira por chamar a mesma coisa de
 * "valor fechado" num lugar e "contratado" em outro.
 *
 * Já houve uma fileira de chips acima da tabela repetindo estas quatro opções,
 * com a contagem de cada uma. Ela saiu: era o MESMO filtro que o menu da coluna
 * "Situação" já oferece, e as contagens repetiam o agregado que a faixa do topo
 * já dá. Recorte visível continua garantido pela `AdminTableFilterBar`, que
 * desenha um chip removível por filtro ativo — era esse o problema que a
 * fileira tinha sido criada para resolver, e ele já tinha outra solução.
 */
const FASES = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'cotando', label: 'Em cotação' },
  { value: 'contratado', label: 'Contratado' },
  { value: 'quitado', label: 'Quitado' },
] as const

/**
 * O tom responde uma pergunta só: o dinheiro precisa se mexer?
 *
 * Planejado e em cotação compartilham o `neutral` de propósito — nos dois nada
 * saiu nem tem data para sair, e o que os distingue (ter ou não proposta na
 * mesa) o rótulo já diz. `primary` não entra: é canal de identidade, nunca de
 * estado (CLAUDE.md, seção 13).
 */
const TOM_DA_FASE: Record<FaseDoGasto, 'neutral' | 'warning' | 'success'> = {
  planejado: 'neutral',
  cotando: 'neutral',
  contratado: 'warning',
  quitado: 'success',
}

function rotuloDaFase(fase: FaseDoGasto): string {
  return FASES.find((item) => item.value === fase)?.label ?? fase
}

const opcoesDeCategoria = computed(() =>
  categorias.value.map((categoria) => ({
    value: categoria.categoriaId ?? SEM_CATEGORIA,
    label: categoria.nome,
  })),
)

const colunas = computed<AdminTableColumn<GastoNaLista>[]>(() => [
  {
    key: 'gasto',
    label: 'Gasto',
    filter: { type: 'text', placeholder: 'Buscar gasto ou fornecedor' },
  },
  {
    key: 'categoria',
    label: 'Categoria',
    filter: { type: 'select', multiple: true, options: opcoesDeCategoria.value },
  },
  {
    key: 'fase',
    label: 'Situação',
    filter: { type: 'select', multiple: true, options: [...FASES] },
  },
  { key: 'valor', label: 'Valor', align: 'right', sort: 'numeric' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const acessores: Record<string, ClientColumn<GastoNaLista>> = {
  gasto: {
    value: (linha) => [linha.despesa.descricao, linha.despesa.fornecedor?.nome ?? ''],
    compare: compareText((linha) => linha.despesa.descricao),
  },
  categoria: { value: (linha) => linha.categoriaId },
  fase: { value: (linha) => linha.fase },
  // Ordenar pelo número que a linha MOSTRA, não por um campo invisível: a
  // lista precisa ficar ordenada do jeito que ela se lê.
  valor: { compare: compareNumber((linha) => linha.numero.valor) },
}

const filters = useTableFilters(colunas)

const linhas = computed(() =>
  applyTableFilters(gastos.value, colunas.value, acessores, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

// --- gastos ---
// O modal só CADASTRA. Editar acontece no lugar — na linha da categoria, em
// Categorias, e nos campos da própria ficha.
const despesaModalAberto = ref(false)

function novaDespesa() {
  despesaModalAberto.value = true
}

async function salvarDespesa(input: ExpenseInput) {
  try {
    await criarDespesa(input)
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

function abrirFicha(linha: GastoNaLista) {
  navigateTo(`${base}/gastos/${linha.despesa.id}`)
}

function acoesDaLinha(linha: GastoNaLista): AdminRowMenuItem[] {
  const fechado = linha.despesa.totais.contratado !== null
  return [
    { key: 'abrir', label: 'Abrir ficha', icon: 'lucide:arrow-right' },
    {
      key: 'contratar',
      label: 'Registrar valor fechado',
      icon: 'lucide:handshake',
      disabled: fechado,
      title: fechado ? 'Este gasto já tem valor fechado.' : undefined,
    },
    {
      key: 'excluir',
      label: 'Excluir gasto',
      icon: 'lucide:trash-2',
      tone: 'danger',
      separarAntes: true,
    },
  ]
}

function executarAcao(linha: GastoNaLista, acao: string) {
  if (acao === 'abrir') abrirFicha(linha)
  if (acao === 'contratar') abrirContratacao(linha.despesa)
  if (acao === 'excluir') despesaParaExcluir.value = linha.despesa
}

// --- contratar ---
const contratoAberto = ref(false)
const despesaDoContrato = ref<string | null>(null)

function abrirContratacao(despesa: DespesaComParcelas) {
  despesaDoContrato.value = despesa.id
  contratoAberto.value = true
}

async function confirmarContratacao(input: RegistrarContratacaoInput) {
  try {
    // O fornecedor vem DENTRO do input: quem o escolheu foi a modal, que
    // pergunta "com quem vocês fecharam" desde o item C5. Aqui se resolvia pelo
    // fornecedor já vinculado ao gasto — e quando não havia nenhum, a
    // contratação nascia sem contraparte.
    await registrarContratacao(input)
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

// --- teto do casamento ---
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

// A semeadura continua aqui porque pertence ao ESTADO VAZIO desta tela — é o
// primeiro gesto de quem abre o Financeiro. Criar, renomear e arquivar
// categoria mudou-se para /financeiro/categorias, que também é onde os totais
// por categoria passaram a viver.
const semeando = ref(false)

/**
 * Semear e **ir** — a ação leva para onde o trabalho continua.
 *
 * Antes ela criava as categorias, mostrava um toast e ficava em Gastos: o
 * estado vazio sumia (agora existem categorias), mas a lista continuava vazia,
 * e o casal clicava em "começar" para receber a mesma tela com zeros (rodada de
 * usabilidade de 20/09/2026, ponto 10). Não havia nada errado no dado — o erro
 * era o destino. Semear categorias é o começo do planejamento, e o planejamento
 * acontece em `/financeiro/categorias`.
 */
async function comecarComSugeridas() {
  semeando.value = true
  try {
    const criadas = await criarCategoriasSugeridas()
    toast.success(`${criadas.length} categorias criadas.`)
    await navigateTo(`${base}/categorias`)
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível criar as categorias.'))
  } finally {
    semeando.value = false
  }
}

/**
 * Documentos sem gasto nenhum.
 *
 * Com a tela de Documentos extinta, um documento sem vínculo ficaria sem lugar
 * no mundo — e perder acesso a dado por falta de tela é porta de mão única.
 * Eles aparecem aqui, discretos, com o caminho para ganhar um gasto.
 */
const documentosSoltos = computed(() =>
  (documentos.value?.data ?? []).filter(
    (documento) => !documento.despesa_id && !documento.fornecedor_id,
  ),
)

const soltosAbertos = ref(false)
const documentoParaVincular = ref<DocumentoComVinculos | null>(null)
const gastoDoVinculo = ref('')

async function abrirDocumento(documento: DocumentoComVinculos) {
  try {
    const { url } = await obterUrlDoDocumento(documento.id)
    window.open(url, '_blank', 'noopener')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível abrir o documento.'))
  }
}

function pedirVinculo(documento: DocumentoComVinculos) {
  documentoParaVincular.value = documento
  gastoDoVinculo.value = ''
}

async function confirmarVinculo() {
  const documento = documentoParaVincular.value
  if (!documento || !gastoDoVinculo.value) return
  try {
    await atualizarDocumento(documento.id, { despesaId: gastoDoVinculo.value })
    documentoParaVincular.value = null
    toast.success('Documento vinculado ao gasto.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível vincular o documento.'))
  }
}

const opcoesDeGasto = computed(() =>
  todasDespesas.value.map((despesa) => ({ value: despesa.id, label: despesa.descricao })),
)
</script>

<template>
  <AdminSection
    title="Gastos"
    description="Tudo o que o casamento vai custar — do que ainda é ideia ao que já foi pago."
  >
    <template #actions>
      <UiButton variant="ghost" :to="`${base}/categorias`">
        <Icon name="lucide:tags" class="h-4 w-4" />
        Categorias
      </UiButton>
      <UiButton @click="novaDespesa">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar gasto
      </UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar o financeiro"
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
          <UiButton variant="outline" :to="`${base}/categorias`">Criar do zero</UiButton>
        </div>
      </UiEmptyState>

      <template v-else>
        <AdminFinanceTotalsHeader :resumo="resumo" :slug="slug" @editar-teto="tetoAberto = true" />

        <AdminPanel title="Gastos" :meta="`${linhas.length} de ${gastos.length}`">
          <template #headerActions>
            <AdminTableFilterBar
              :filters="filters"
              :columns="colunas"
              group-label="Filtros dos gastos"
            />
          </template>

          <AdminTable
            :columns="colunas"
            :rows="linhas"
            :filters="filters"
            row-clickable
            empty-label="Nenhum gasto com esses filtros."
            @row-click="abrirFicha"
          >
            <template #cell-gasto="{ row }">
              <div class="min-w-0">
                <button
                  type="button"
                  class="block max-w-full truncate text-left text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="abrirFicha(row)"
                >
                  {{ row.despesa.descricao }}
                </button>
                <span
                  v-if="row.despesa.fornecedor || row.propostas > 0"
                  class="block truncate text-xs text-text-muted"
                >
                  <template v-if="row.despesa.fornecedor">
                    {{ row.despesa.fornecedor.nome }}
                  </template>
                  <template v-else>
                    {{ row.propostas }}
                    {{ row.propostas === 1 ? 'proposta' : 'propostas' }}
                  </template>
                </span>
              </div>
            </template>

            <!-- A categoria é atributo: ponto de cor e nome, do tamanho de um
                 atributo. Ela já foi o bloco que envolvia estas linhas, e era
                 essa promoção que fazia a tela parecer uma árvore. -->
            <template #cell-categoria="{ row }">
              <span class="flex min-w-0 items-center gap-1.5 text-sm text-text-muted">
                <span
                  v-if="row.cor"
                  aria-hidden="true"
                  class="h-2 w-2 shrink-0 rounded-full"
                  :style="{ backgroundColor: row.cor }"
                />
                <span class="truncate">{{ row.categoriaNome }}</span>
              </span>
            </template>

            <template #cell-fase="{ row }">
              <UiBadge :tone="TOM_DA_FASE[row.fase]">{{ rotuloDaFase(row.fase) }}</UiBadge>
            </template>

            <!-- UM número. O rótulo embaixo dele muda com a fase, porque o que
                 a linha precisa dizer muda com a fase: quanto acho que custa,
                 qual a melhor proposta, quanto ainda devo, quanto custou. -->
            <template #cell-valor="{ row }">
              <div class="flex flex-col items-end leading-tight">
                <span class="num font-medium text-text">
                  {{ formatCentsToBRL(row.numero.valor) }}
                </span>
                <span class="text-xs text-text-muted">{{ row.numero.rotulo }}</span>
              </div>
            </template>

            <template #cell-acoes="{ row }">
              <div class="flex items-center justify-end">
                <AdminRowMenu
                  :items="acoesDaLinha(row)"
                  :label="`Ações de ${row.despesa.descricao}`"
                  @select="executarAcao(row, $event)"
                />
              </div>
            </template>

            <template #stacked="{ row }">
              <button
                type="button"
                class="flex w-full flex-col gap-1 px-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="abrirFicha(row)"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <UiBadge :tone="TOM_DA_FASE[row.fase]">{{ rotuloDaFase(row.fase) }}</UiBadge>
                  <span class="font-medium text-text">{{ row.despesa.descricao }}</span>
                </div>
                <span class="flex items-center gap-1.5 text-xs text-text-muted">
                  <span
                    v-if="row.cor"
                    aria-hidden="true"
                    class="h-2 w-2 shrink-0 rounded-full"
                    :style="{ backgroundColor: row.cor }"
                  />
                  {{ row.categoriaNome }}
                </span>
                <span class="num text-sm text-text">
                  {{ formatCentsToBRL(row.numero.valor) }}
                  <span class="text-xs text-text-muted">{{ row.numero.rotulo }}</span>
                </span>
              </button>
            </template>
          </AdminTable>
        </AdminPanel>

        <!-- Discreto de propósito: é resíduo da tela extinta, não uma seção. -->
        <div v-if="documentosSoltos.length > 0" class="text-sm">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="soltosAbertos = !soltosAbertos"
          >
            <Icon
              :name="soltosAbertos ? 'lucide:chevron-down' : 'lucide:chevron-right'"
              class="h-4 w-4"
            />
            {{ documentosSoltos.length }}
            {{ documentosSoltos.length === 1 ? 'documento sem gasto' : 'documentos sem gasto' }}
          </button>

          <ul v-if="soltosAbertos" class="mt-2 flex flex-col divide-y divide-border">
            <li
              v-for="documento in documentosSoltos"
              :key="documento.id"
              class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2"
            >
              <button
                type="button"
                class="min-w-0 flex-1 truncate text-left text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="abrirDocumento(documento)"
              >
                {{ documento.titulo }}
              </button>
              <UiButton size="sm" variant="ghost" @click="pedirVinculo(documento)">
                Vincular a um gasto
              </UiButton>
            </li>
          </ul>
        </div>
      </template>

      <AdminFinanceBudgetTotalModal
        v-model="tetoAberto"
        :teto-centavos="resumo.teto"
        :planejado-centavos="resumo.orcado"
        @salvar="salvarTeto"
      />
    </template>

    <AdminFinanceExpenseModal
      v-model="despesaModalAberto"
      :categorias="categoriasAtivas"
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
      :model-value="Boolean(documentoParaVincular)"
      title="Vincular documento"
      :description="`Escolha o gasto a que “${documentoParaVincular?.titulo ?? ''}” pertence.`"
      @update:model-value="documentoParaVincular = null"
    >
      <UiSelect
        v-model="gastoDoVinculo"
        label="Gasto"
        :options="[{ value: '', label: 'Escolha…' }, ...opcoesDeGasto]"
      />
      <template #footer>
        <UiButton variant="ghost" @click="documentoParaVincular = null">Cancelar</UiButton>
        <UiButton :disabled="!gastoDoVinculo" @click="confirmarVinculo">Vincular</UiButton>
      </template>
    </UiModal>

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
