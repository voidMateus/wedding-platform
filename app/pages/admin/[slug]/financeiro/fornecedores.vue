<!--
  Fornecedores — onde o casal COTA e decide.

  A tela é organizada pelo GASTO que está sendo cotado, não por uma lista
  alfabética: "quanto custa refrigerante" é uma pergunta sobre o gasto
  Refrigerantes, e com as três propostas espalhadas entre buffet e banda a
  comparação — que é o motivo da tela existir — não acontece.

  Dentro de cada gasto, a proposta mais barata é destacada e cada linha mostra
  quanto ela difere da menor. Escolhida uma, "Contratar" leva o valor fechado
  para o Orçamento e o pagamento para Pagamentos.

  Mesma mecânica de tabela do Modo Lista de convidados (AdminTable com blocos
  recolhíveis, filtro por coluna e formato empilhado no celular): a governança
  do Design System não admite <table> escrito à mão.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { percentual, resumoDeCotacoes } from '#shared/utils/orcamento'
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { VendorContractInput, VendorInput } from '#shared/schemas/finance'
import type { AdminTableColumn, AdminTableSection } from '~/types/table'
import type {
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
const route = useRoute()
const router = useRouter()
const toast = useToast()

const { listVendors, criarFornecedor, atualizarFornecedor, arquivarFornecedor } = useVendors()
const { data, status, error, refresh } = listVendors()

const { listCategorias, getOrcamento, contratarFornecedor, atualizarDespesa } = useFinance()
const { data: todasCategorias } = listCategorias()

// Arquivada não é opção de cadastro — só as ativas vão para o seletor.
const categorias = computed(() => ({
  data: (todasCategorias.value?.data ?? []).filter((categoria) => !categoria.excluido_em),
}))
const { data: orcamento } = getOrcamento()

const { listDocuments, obterUrlDoDocumento, excluirDocumento } = useFinanceDocuments()
const { corDaCategoria } = useCategoriaCores()

/** Os gastos do orçamento — é um deles que cada cotação disputa. */
const despesas = computed(() =>
  (orcamento.value?.categorias ?? []).flatMap((categoria) => categoria.despesas),
)

// A listagem traz os dois estados; a tela é que separa quem está em uso de
// quem saiu de cena.
const fornecedores = computed(() =>
  (data.value?.data ?? []).filter((fornecedor) => !fornecedor.excluido_em),
)
const arquivados = computed(() =>
  (data.value?.data ?? []).filter((fornecedor) => fornecedor.excluido_em),
)

/**
 * O arquivado guarda o desfecho, não só o nome: "Studio X — R$ 5.500 — não
 * contratado" é a informação que o casal quer de volta seis meses depois.
 */
const arquivadosParaLista = computed(() =>
  arquivados.value.map((fornecedor) => ({
    id: fornecedor.id,
    nome: fornecedor.nome,
    detalhe: [
      fornecedor.valor_proposto_centavos
        ? formatCentsToBRL(fornecedor.valor_proposto_centavos)
        : null,
      ROTULOS_ESTAGIO_FORNECEDOR[fornecedor.estagio as keyof typeof ROTULOS_ESTAGIO_FORNECEDOR],
    ]
      .filter(Boolean)
      .join(' · '),
  })),
)

// --- tabela ---
const colunas = computed<AdminTableColumn<FornecedorComSituacao>[]>(() => [
  {
    key: 'nome',
    label: 'Fornecedor',
    filter: { type: 'text', placeholder: 'Buscar' },
    sort: 'alpha',
  },
  {
    key: 'estagio',
    // "Situação" e não "Estágio": é a mesma pergunta que a coluna do Orçamento
    // responde ("em que pé isto está?"), e o módulo fala uma língua só.
    label: 'Situação',
    filter: {
      type: 'select',
      multiple: true,
      options: ESTAGIOS_FORNECEDOR.map((valor) => ({
        value: valor,
        label: ROTULOS_ESTAGIO_FORNECEDOR[valor],
      })),
    },
  },
  // "Valor" e não "Cotação": a coluna mostra quanto este fornecedor cobra. Se
  // um dia ele tiver histórico de propostas, elas vivem dentro dele — e o
  // rótulo da coluna continua valendo.
  { key: 'cotacao', label: 'Valor', align: 'right', sort: 'numeric' },
  { key: 'contato', label: 'Contato' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const acessores: Record<string, ClientColumn<FornecedorComSituacao>> = {
  nome: {
    value: (fornecedor) => fornecedor.nome,
    compare: compareText((fornecedor) => fornecedor.nome),
  },
  estagio: { value: (fornecedor) => fornecedor.estagio },
  cotacao: { compare: compareNumber((fornecedor) => fornecedor.valor_proposto_centavos ?? 0) },
}

const filters = useTableFilters(colunas)

// A busca do painel e o filtro de texto da coluna "Fornecedor" são o mesmo
// estado, com duas portas de entrada — nunca dois recortes que podem divergir.
const buscaDraft = useDebouncedText(
  () => filters.valuesOf('nome')[0] ?? '',
  (valor) => filters.setText('nome', valor),
)

const linhasFiltradas = computed(() =>
  applyTableFilters(fornecedores.value, colunas.value, acessores, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

/**
 * Os quatro números do topo, do mesmo cálculo puro que as outras telas usam
 * (`shared/utils/orcamento.ts`) — nunca somado no template.
 */
const resumo = computed(() =>
  resumoDeCotacoes(
    despesas.value.map((despesa) => ({
      estimado: despesa.totais.estimado,
      contratado: despesa.totais.contratado,
      cotacoes: cotacoesDoGasto(despesa.id).map((f) => f.valor_proposto_centavos ?? 0),
    })),
  ),
)

function cotacoesDoGasto(despesaId: string): FornecedorComSituacao[] {
  return fornecedores.value.filter((fornecedor) => fornecedor.gasto?.id === despesaId)
}

const percentualContratado = computed(() =>
  percentual(resumo.value.contratado, resumo.value.estimado),
)

/** "R$ 1.100,00 abaixo" — a leitura que o casal faz do par estimado/contratado. */
const diferencaDoEstimado = computed(() => {
  if (resumo.value.contratado === 0 || resumo.value.estimado === 0) return null
  const diferenca = resumo.value.estimado - resumo.value.contratado
  if (diferenca === 0) return { texto: 'exatamente o estimado', abaixo: true }
  return diferenca > 0
    ? { texto: `${formatCentsToBRL(diferenca)} abaixo`, abaixo: true }
    : { texto: `${formatCentsToBRL(Math.abs(diferenca))} acima`, abaixo: false }
})

const SEM_GASTO = 'sem-gasto'
const PREFIXO_CATEGORIA = 'cat:'

/**
 * A tela é a lista de gastos do ORÇAMENTO, não a lista de cotações.
 *
 * Essa é a direção certa da seta: o casal planeja "Refrigerantes" em Bebidas e
 * vem para cá atrás de fornecedores de refrigerante. Montando os blocos a
 * partir das cotações existentes, o gasto recém-planejado não aparecia em
 * lugar nenhum — e o casal não tinha onde pendurar a primeira proposta.
 *
 * Dois níveis, como no pedido: a categoria (Bebidas) e, dentro dela, o gasto
 * (Refrigerantes) com os fornecedores que o disputam. Gasto sem ninguém
 * cotando aparece igual, vazio, com a linha "Adicionar fornecedor" — é
 * justamente o convite que faltava.
 */
/** Filete + fundo tingido do bloco, a partir do slot da categoria. */
function corDoBloco(categoria: { corIndice: number | null; corPersonalizada: string | null }) {
  // "Sem categoria" não tem linha no banco, então também não tem slot: um
  // filete colorido ali sugeriria uma categoria que não existe.
  if (categoria.corIndice === null) return {}
  const cor = corDaCategoria(categoria.corIndice, categoria.corPersonalizada)
  return { cor: cor.solida, corFundo: cor.fundo, corEstilo: 'barra' as const }
}

const secoes = computed<AdminTableSection<FornecedorComSituacao>[]>(() => {
  const porGasto = new Map<string, FornecedorComSituacao[]>()
  for (const fornecedor of linhasFiltradas.value) {
    const chave = fornecedor.gasto?.id ?? SEM_GASTO
    const lista = porGasto.get(chave) ?? []
    lista.push(fornecedor)
    porGasto.set(chave, lista)
  }

  // Sem ordenação escolhida, a mais barata vem primeiro: a tela existe para
  // comparar, e comparar com a mais cara no topo é olhar a lista errada. Quem
  // escolhe uma ordem no cabeçalho manda, e aí as linhas já chegaram ordenadas
  // de `applyTableFilters`.
  if (filters.sortKey.value === null) {
    for (const lista of porGasto.values()) {
      lista.sort(
        (a, b) => (a.valor_proposto_centavos ?? Infinity) - (b.valor_proposto_centavos ?? Infinity),
      )
    }
  }

  const blocos: AdminTableSection<FornecedorComSituacao>[] = []

  for (const categoria of categoriasDoOrcamento.value) {
    const idCategoria = `${PREFIXO_CATEGORIA}${categoria.categoriaId ?? 'sem-categoria'}`

    const gastos = categoria.despesas
      .map((despesa) => ({ despesa, cotacoes: porGasto.get(despesa.id) ?? [] }))
      // Com filtro ativo, gasto sem nenhum fornecedor correspondente sai: quem
      // filtrou está procurando uma proposta, não planejando.
      .filter(({ cotacoes }) => cotacoes.length > 0 || !temFiltroAtivo.value)
      // O recorte inverte a pergunta: mostra só o que ainda não tem ninguém.
      .filter(
        ({ despesa, cotacoes }) =>
          !recorteSemFornecedor.value ||
          (cotacoes.length === 0 && despesa.totais.contratado === null),
      )

    if (gastos.length === 0) continue

    const totalDeCotacoes = gastos.reduce((total, { cotacoes }) => total + cotacoes.length, 0)

    // A categoria só agrupa — daí `quiet`. Quem o casal procura é o gasto.
    blocos.push({
      id: idCategoria,
      label: categoria.nome,
      level: 0,
      emphasis: 'quiet',
      meta: `${gastos.length} ${gastos.length === 1 ? 'gasto' : 'gastos'} · ${totalDeCotacoes} ${
        totalDeCotacoes === 1 ? 'fornecedor' : 'fornecedores'
      }`,
      icon: 'lucide:folder',
      ...corDoBloco(categoria),
      rows: [],
    })

    if (recolhidos.value.includes(idCategoria)) continue

    for (const { despesa, cotacoes } of gastos) {
      blocos.push({
        id: despesa.id,
        label: despesa.descricao,
        level: 1,
        // O gasto é a entidade desta tela, não um subtítulo do agrupamento.
        emphasis: 'strong',
        description: resumoDoGasto(despesa),
        badge: seloDaDiferenca(despesa),
        rows: cotacoes,
      })
    }
  }

  // Os contatos que o casal guardou antes de decidir de que gasto precisa.
  // Fora do recorte: "gastos sem fornecedor" e "fornecedores sem gasto" são
  // perguntas opostas, e mostrar as duas juntas desmentiria o filtro.
  const semGasto = recorteSemFornecedor.value ? [] : (porGasto.get(SEM_GASTO) ?? [])
  if (semGasto.length > 0) {
    blocos.push({
      id: SEM_GASTO,
      label: 'Ainda sem gasto definido',
      level: 0,
      emphasis: 'strong',
      description: `${semGasto.length} ${
        semGasto.length === 1 ? 'fornecedor' : 'fornecedores'
      } que ainda não disputam um gasto do orçamento`,
      icon: 'lucide:help-circle',
      rows: semGasto,
    })
  }

  return blocos
})

/**
 * A linha de resumo do gasto — é ela que liga esta tela ao Orçamento.
 *
 * Só dinheiro: o que se planejou e, se já fechou, por quanto. A contagem de
 * fornecedores saiu daqui porque a própria tabela abaixo já responde isso — e
 * quando não há nenhum, quem responde é o estado vazio do bloco.
 */
function resumoDoGasto(despesa: DespesaComParcelas): string {
  const partes: string[] = []
  if (despesa.totais.estimado > 0) {
    partes.push(`Estimativa ${formatCentsToBRL(despesa.totais.estimado)}`)
  }
  if (despesa.totais.contratado !== null) {
    partes.push(`contratado ${formatCentsToBRL(despesa.totais.contratado)}`)
  }
  return partes.join(' · ')
}

/**
 * A diferença entre estimado e fechado vira selo, não mais um pedaço de texto
 * cinza: é a informação que conecta esta tela ao Orçamento, e ela tem valência
 * — economizar é bom, estourar não.
 */
function seloDaDiferenca(
  despesa: DespesaComParcelas,
): { label: string; tone: 'success' | 'warning' } | undefined {
  const diferenca = despesa.totais.desvioDoEstimado
  if (despesa.totais.contratado === null || diferenca === null || diferenca === 0) return undefined
  return diferenca < 0
    ? { label: `−${formatCentsToBRL(Math.abs(diferenca))}`, tone: 'success' }
    : { label: `+${formatCentsToBRL(diferenca)}`, tone: 'warning' }
}

/** Categorias do orçamento, só as que têm gasto — é delas que saem os blocos. */
const categoriasDoOrcamento = computed(() =>
  (orcamento.value?.categorias ?? []).filter((categoria) => categoria.despesas.length > 0),
)

const temFiltroAtivo = computed(() => Object.keys(filters.values.value).length > 0)

/** O indicador "Aguardando fornecedor" é o produtor deste recorte. */
const recorteSemFornecedor = computed(() => route.query.recorte === 'sem-fornecedor')

function alternarRecorteSemFornecedor() {
  router.replace({
    query: recorteSemFornecedor.value ? {} : { recorte: 'sem-fornecedor' },
  })
}

const recolhidos = ref<string[]>([])

function alternarBloco(id: string) {
  recolhidos.value = recolhidos.value.includes(id)
    ? recolhidos.value.filter((atual) => atual !== id)
    : [...recolhidos.value, id]
}

// "Recolher tudo" fecha as categorias, não os gastos: recolher a categoria já
// leva os gastos dela junto, e contar os dois níveis faria o botão trocar de
// rótulo com metade da tela ainda aberta.
const categoriasVisiveis = computed(() =>
  secoes.value.filter((secao) => secao.level === 0).map((secao) => secao.id),
)

const tudoRecolhido = computed(
  () =>
    categoriasVisiveis.value.length > 0 &&
    categoriasVisiveis.value.every((id) => recolhidos.value.includes(id)),
)

function alternarTudo() {
  recolhidos.value = tudoRecolhido.value ? [] : categoriasVisiveis.value
}

/** Menor cotação do bloco a que este fornecedor pertence. */
function menorCotacaoDoGasto(fornecedor: FornecedorComSituacao): number | null {
  const irmaos = fornecedores.value.filter(
    (outro) => (outro.gasto?.id ?? SEM_GASTO) === (fornecedor.gasto?.id ?? SEM_GASTO),
  )
  const valores = irmaos
    .map((f) => f.valor_proposto_centavos)
    .filter((valor): valor is number => typeof valor === 'number' && valor > 0)
  return valores.length > 1 ? Math.min(...valores) : null
}

/** Quanto esta proposta custa a mais que a mais barata do mesmo gasto. */
function diferencaParaMenor(fornecedor: FornecedorComSituacao): number | null {
  const menor = menorCotacaoDoGasto(fornecedor)
  if (menor === null || !fornecedor.valor_proposto_centavos) return null
  const diferenca = fornecedor.valor_proposto_centavos - menor
  return diferenca > 0 ? diferenca : null
}

function ehMaisBarato(fornecedor: FornecedorComSituacao): boolean {
  const menor = menorCotacaoDoGasto(fornecedor)
  return menor !== null && fornecedor.valor_proposto_centavos === menor
}

/** Contratado sem valor no orçamento: o dinheiro dele ainda não existe lá. */
function faltaLevarAoOrcamento(fornecedor: FornecedorComSituacao): boolean {
  return fornecedor.estagio === 'contratado' && fornecedor.contratadoCentavos === 0
}

// --- cadastro ---
const modalAberto = ref(false)
const emEdicao = ref<FornecedorComSituacao | null>(null)
const despesaPadrao = ref<string | null>(null)

function novoFornecedor(despesaId?: string) {
  emEdicao.value = null
  despesaPadrao.value = despesaId ?? null
  modalAberto.value = true
}

function editar(fornecedor: FornecedorComSituacao) {
  emEdicao.value = fornecedor
  despesaPadrao.value = null
  modalAberto.value = true
}

async function salvar(input: VendorInput) {
  try {
    if (emEdicao.value) {
      await atualizarFornecedor(emEdicao.value.id, input)
    } else {
      await criarFornecedor(input)
    }
    modalAberto.value = false
    toast.success('Fornecedor salvo.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o fornecedor.'))
  }
}

// --- contratar ---
const contratoAberto = ref(false)
const fornecedorDoContrato = ref<FornecedorComSituacao | null>(null)

function abrirContratacao(fornecedor: FornecedorComSituacao) {
  fornecedorDoContrato.value = fornecedor
  contratoAberto.value = true
}

async function confirmarContratacao(input: VendorContractInput) {
  const fornecedor = fornecedorDoContrato.value
  if (!fornecedor) return
  try {
    await contratarFornecedor(fornecedor.id, input)
    contratoAberto.value = false
    await refresh()
    toast.success('Contratado — o valor entrou no orçamento e o pagamento está em Pagamentos.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível registrar a contratação.'))
  }
}

// --- propostas anexadas ---
const propostasAbertas = ref<FornecedorComSituacao | null>(null)
const filtroDeDocumentos = computed(() => ({ fornecedorId: propostasAbertas.value?.id }))
const { data: propostas } = listDocuments(filtroDeDocumentos)

// Abrir e excluir precisam funcionar aqui como funcionam em Documentos: a
// lista desenha os controles, e handler vazio é controle que não responde.
async function abrirProposta(documento: DocumentoComVinculos) {
  try {
    const { url } = await obterUrlDoDocumento(documento.id)
    window.open(url, '_blank', 'noopener')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível abrir a proposta.'))
  }
}

async function excluirProposta(documento: DocumentoComVinculos) {
  try {
    await excluirDocumento(documento.id)
    await refresh()
    toast.success('Proposta excluída.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível excluir a proposta.'))
  }
}

// --- arquivar / restaurar ---
const paraArquivar = ref<FornecedorComSituacao | null>(null)
const desvinculando = ref(false)

/**
 * Os gastos do orçamento que apontam para este fornecedor.
 *
 * O servidor recusa arquivar enquanto existir algum — e recusava sem dizer
 * quais nem oferecer saída, num aviso que aparecia atrás da própria janela.
 * A janela passa a mostrar a lista e a resolver o impedimento.
 */
const gastosVinculados = computed(() => {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return []
  return despesas.value.filter((despesa) => despesa.fornecedor?.id === fornecedor.id)
})

/** Desfaz o vínculo e arquiva na sequência — o gasto continua intacto. */
async function desvincularEArquivar() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return

  desvinculando.value = true
  try {
    for (const despesa of gastosVinculados.value) {
      await atualizarDespesa(despesa.id, { fornecedorId: null })
    }
    await arquivarFornecedor(fornecedor.id, true)
    paraArquivar.value = null
    toast.success('Fornecedor arquivado. Os gastos continuaram no orçamento, agora sem ele.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível desvincular e arquivar.'))
  } finally {
    desvinculando.value = false
  }
}

async function confirmarArquivamento() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return
  try {
    await arquivarFornecedor(fornecedor.id, true)
    paraArquivar.value = null
    toast.success('Fornecedor arquivado. Dá para restaurar no fim desta página.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar o fornecedor.'))
  }
}

async function restaurar(id: string) {
  try {
    await arquivarFornecedor(id, false)
    toast.success('Fornecedor restaurado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível restaurar o fornecedor.'))
  }
}

/** (65) 99999-9999 — o número como o casal o lê, não como o banco o guarda. */
function telefoneLegivel(telefone: string | null): string | null {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  }
  return telefone
}

/** Link de WhatsApp: só dígitos, com o 55 quando o casal digitou só o DDD. */
function linkWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null
  const digitos = telefone.replace(/\D/g, '')
  if (digitos.length < 10) return null
  return `https://wa.me/${digitos.length <= 11 ? `55${digitos}` : digitos}`
}
</script>

<template>
  <AdminSection
    title="Fornecedores"
    description="Compare propostas, acompanhe negociações e organize as contratações."
  >
    <template #actions>
      <UiButton @click="novoFornecedor()">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar fornecedor
      </UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar os fornecedores"
      description="Tente novamente em alguns instantes."
    >
      <UiButton variant="outline" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <!-- O vazio de verdade é não ter o que cotar: sem gasto planejado, esta
         tela não tem assunto, e o caminho é o Orçamento. Com gastos, ela
         mostra todos eles esperando proposta — mesmo sem nenhuma cotação
         cadastrada ainda. -->
    <UiEmptyState
      v-else-if="despesas.length === 0"
      icon="lucide:store"
      title="Planeje um gasto primeiro"
      description="Cada fornecedor é uma proposta para um gasto do orçamento. Crie o gasto no Orçamento e ele aparece aqui, pronto para receber as propostas."
    >
      <UiButton :to="`/admin/${slug}/financeiro`">Ir para o orçamento</UiButton>
    </UiEmptyState>

    <template v-else>
      <!-- Quatro números que respondem "em que pé está a busca por
           fornecedor?" antes de o casal descer para a lista. Os dois primeiros
           são o mesmo dinheiro em momentos diferentes; o último é o que ainda
           depende de alguém procurar. -->
      <dl
        class="grid grid-cols-2 gap-px overflow-clip rounded-lg border border-border bg-border lg:grid-cols-4"
      >
        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
            Orçamento estimado
          </dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ formatCentsToBRL(resumo.estimado) }}
          </dd>
          <!-- A diferença entre o que se planejou e o que já se fechou é a
               leitura que o casal quer de imediato ("estamos abaixo do que
               planejamos"), e ela mora aqui porque é aqui que o estimado está. -->
          <dd v-if="diferencaDoEstimado" class="mt-0.5 text-xs text-text-muted">
            {{ formatCentsToBRL(resumo.contratado) }} contratado ·
            <span :class="diferencaDoEstimado.abaixo ? 'text-success' : 'text-warning'">
              {{ diferencaDoEstimado.texto }}
            </span>
          </dd>
          <dd v-else class="mt-0.5 text-xs text-text-muted">o que o orçamento prevê</dd>
        </div>

        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Em negociação</dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ formatCentsToBRL(resumo.emCotacao) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            <template v-if="resumo.propostasEmAvaliacao > 0">
              {{ resumo.propostasEmAvaliacao }}
              {{ resumo.propostasEmAvaliacao === 1 ? 'proposta' : 'propostas' }} em avaliação
            </template>
            <template v-else>nenhuma proposta em avaliação</template>
          </dd>
        </div>

        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Contratado</dt>
          <dd class="num mt-0.5 text-lg font-semibold text-text">
            {{ formatCentsToBRL(resumo.contratado) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            <template v-if="percentualContratado !== null">
              {{ percentualContratado }}% do estimado
            </template>
            <template v-else>já fechado</template>
          </dd>
        </div>

        <!-- Clicável: o indicador que gera ação vira o filtro dessa ação. -->
        <button
          type="button"
          class="px-4 py-3.5 text-left transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            recorteSemFornecedor
              ? 'bg-primary/10 ring-1 ring-inset ring-primary'
              : 'bg-surface-muted/70 hover:bg-surface-muted'
          "
          :aria-pressed="recorteSemFornecedor"
          @click="alternarRecorteSemFornecedor"
        >
          <span class="block text-xs font-semibold uppercase tracking-wide text-text">
            Aguardando fornecedor
          </span>
          <span
            class="num mt-0.5 block text-2xl font-semibold"
            :class="resumo.gastosSemFornecedor > 0 ? 'text-warning' : 'text-text'"
          >
            {{ resumo.gastosSemFornecedor }}
            {{ resumo.gastosSemFornecedor === 1 ? 'gasto' : 'gastos' }}
          </span>
          <span class="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
            <Icon v-if="recorteSemFornecedor" name="lucide:funnel" class="h-3 w-3" />
            {{ recorteSemFornecedor ? 'filtrando a lista' : 'nenhuma proposta recebida' }}
          </span>
        </button>
      </dl>

      <!-- "Fornecedores por gasto" explica, no próprio título, por que uma
           tela de fornecedores está listando gastos. -->
      <div
        v-if="recorteSemFornecedor"
        class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted/50 px-4 py-2.5"
      >
        <span class="flex items-center gap-2 text-sm text-text">
          <Icon name="lucide:funnel" class="h-4 w-4 shrink-0 text-text-muted" />
          Mostrando só os gastos que ainda não têm fornecedor
        </span>
        <UiButton size="sm" variant="ghost" @click="router.replace({ query: {} })">
          Ver todos os gastos
        </UiButton>
      </div>

      <AdminPanel
        title="Fornecedores por gasto"
        :meta="`${despesas.length} ${despesas.length === 1 ? 'gasto' : 'gastos'} · ${fornecedores.length} ${fornecedores.length === 1 ? 'fornecedor' : 'fornecedores'}`"
      >
        <template #headerActions>
          <UiInput
            v-model="buscaDraft"
            icon="lucide:search"
            tone="muted"
            placeholder="Buscar fornecedor..."
            aria-label="Buscar fornecedor"
            class="w-full sm:w-56"
          />
          <AdminTableFilterBar
            :filters="filters"
            :columns="colunas"
            group-label="Filtros de fornecedores"
            always-show-button
          />
          <UiButton variant="ghost" size="sm" @click="alternarTudo">
            <Icon
              :name="tudoRecolhido ? 'lucide:unfold-vertical' : 'lucide:fold-vertical'"
              class="h-4 w-4"
            />
            {{ tudoRecolhido ? 'Expandir tudo' : 'Recolher tudo' }}
          </UiButton>
        </template>

        <!-- Os rótulos de coluna moram dentro de cada bloco: no topo, eles
             descreviam linhas a três blocos de distância e faziam o nome do
             GASTO parecer o de um fornecedor. -->
        <AdminTable
          :columns="colunas"
          :rows="linhasFiltradas"
          :sections="secoes"
          :collapsed-ids="recolhidos"
          :filters="filters"
          column-header="section"
          empty-label="Nenhum fornecedor com esses filtros."
          @toggle-section="alternarBloco"
        >
          <template #cell-nome="{ row }">
            <div class="min-w-0">
              <span class="flex items-center gap-1.5">
                <span class="truncate text-text">{{ row.nome }}</span>
                <UiBadge v-if="ehMaisBarato(row)" tone="success">menor preço</UiBadge>
              </span>
              <UiBadge v-if="faltaLevarAoOrcamento(row)" tone="warning" class="mt-1">
                falta registrar no orçamento
              </UiBadge>
            </div>
          </template>

          <template #cell-estagio="{ row }">
            <UiBadge :tone="estagioFornecedorPresentation(row.estagio as never).tone">
              {{ estagioFornecedorPresentation(row.estagio as never).label }}
            </UiBadge>
          </template>

          <!-- A diferença para a mais barata é o número que decide a compra,
               e estava em 12px cinza — o mais apagado da célula. A proposta em
               PDF mora aqui, e não em "Contato": o anexo É a cotação. -->
          <template #cell-cotacao="{ row }">
            <div class="flex items-center justify-end gap-1.5">
              <div class="text-right">
                <span v-if="row.valor_proposto_centavos" class="num text-text">
                  {{ formatCentsToBRL(row.valor_proposto_centavos) }}
                </span>
                <span v-else class="text-text-muted">—</span>
                <span v-if="diferencaParaMenor(row)" class="num block text-sm text-warning">
                  +{{ formatCentsToBRL(diferencaParaMenor(row) ?? 0) }}
                </span>
                <!-- Só quando o contrato saiu por outro valor: repetir o mesmo
                     número duas vezes na mesma célula não informa nada. -->
                <span
                  v-else-if="
                    row.contratadoCentavos > 0 &&
                    row.contratadoCentavos !== row.valor_proposto_centavos
                  "
                  class="num block text-sm text-success"
                >
                  fechado por {{ formatCentsToBRL(row.contratadoCentavos) }}
                </span>
              </div>
              <AdminRowAction
                icon="lucide:paperclip"
                :count="row.totalDocumentos"
                :label="`Propostas anexadas de ${row.nome}`"
                @click="propostasAbertas = row"
              />
            </div>
          </template>

          <!-- Contato é para falar com alguém, então ele diz COM QUEM e por
               onde — não uma fileira de ícones sem rótulo. O número aparece
               escrito e é o próprio link do WhatsApp. -->
          <template #cell-contato="{ row }">
            <div class="min-w-0">
              <NuxtLink
                v-if="linkWhatsApp(row.telefone)"
                :to="linkWhatsApp(row.telefone) ?? undefined"
                target="_blank"
                class="flex items-center gap-1.5 text-sm text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name="lucide:message-circle" class="h-4 w-4 shrink-0 text-text-muted" />
                <span class="num truncate">{{ telefoneLegivel(row.telefone) }}</span>
              </NuxtLink>
              <a
                v-else-if="row.email"
                :href="`mailto:${row.email}`"
                class="flex items-center gap-1.5 text-sm text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <Icon name="lucide:mail" class="h-4 w-4 shrink-0 text-text-muted" />
                <span class="truncate">{{ row.email }}</span>
              </a>
              <span v-else class="text-sm text-text-muted">—</span>
              <span v-if="row.nome_contato" class="block truncate text-xs text-text-muted">
                falar com {{ row.nome_contato }}
              </span>
            </div>
          </template>

          <!-- "Contratar" com rótulo: é a ação mais consequente do módulo
               (fecha o valor, cria as parcelas, muda as três telas) e estava
               atrás de um ícone que ninguém reconhece — enquanto no celular a
               mesma ação já era um botão escrito. -->
          <template #cell-acoes="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UiButton
                v-if="row.estagio !== 'descartado' && row.contratadoCentavos === 0"
                size="sm"
                variant="outline"
                @click="abrirContratacao(row)"
              >
                Contratar
              </UiButton>
              <AdminRowAction icon="lucide:pencil" label="Editar fornecedor" @click="editar(row)" />
              <AdminRowAction
                icon="lucide:archive"
                label="Arquivar fornecedor"
                @click="paraArquivar = row"
              />
            </div>
          </template>

          <template #stacked="{ row }">
            <div class="flex flex-col gap-1 px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-text">{{ row.nome }}</span>
                <UiBadge v-if="ehMaisBarato(row)" tone="success">menor preço</UiBadge>
                <UiBadge :tone="estagioFornecedorPresentation(row.estagio as never).tone">
                  {{ estagioFornecedorPresentation(row.estagio as never).label }}
                </UiBadge>
              </div>
              <span v-if="row.valor_proposto_centavos" class="num text-sm text-text">
                {{ formatCentsToBRL(row.valor_proposto_centavos) }}
                <span v-if="diferencaParaMenor(row)" class="text-warning">
                  (+{{ formatCentsToBRL(diferencaParaMenor(row) ?? 0) }})
                </span>
              </span>
              <!-- Falar com o fornecedor é exatamente o que se faz COM o
                   celular na mão, e esta era a única largura em que WhatsApp,
                   e-mail e propostas não existiam. -->
              <div class="mt-1 flex flex-wrap items-center gap-2">
                <UiButton
                  v-if="row.estagio !== 'descartado' && row.contratadoCentavos === 0"
                  variant="outline"
                  @click="abrirContratacao(row)"
                >
                  Contratar
                </UiButton>
                <UiButton variant="ghost" @click="editar(row)">Editar</UiButton>
                <AdminRowAction
                  v-if="linkWhatsApp(row.telefone)"
                  icon="lucide:message-circle"
                  label="Abrir conversa no WhatsApp"
                  :to="linkWhatsApp(row.telefone) ?? undefined"
                />
                <AdminRowAction
                  v-if="row.email"
                  icon="lucide:mail"
                  label="Enviar e-mail"
                  :to="`mailto:${row.email}`"
                />
                <AdminRowAction
                  icon="lucide:paperclip"
                  :count="row.totalDocumentos"
                  :label="`Propostas anexadas de ${row.nome}`"
                  @click="propostasAbertas = row"
                />
                <AdminRowAction
                  icon="lucide:archive"
                  label="Arquivar fornecedor"
                  @click="paraArquivar = row"
                />
              </div>
            </div>
          </template>

          <!-- Só o bloco do gasto convida a cadastrar: a categoria é
               agrupamento, e fornecedor pertence a um gasto. Gasto sem ninguém
               ganha um estado vazio de verdade, em vez de uma frase pendurada
               no cabeçalho parecendo dado de tabela. -->
          <template #section-footer="{ section }">
            <div v-if="section.level === 1 || section.id === SEM_GASTO" class="px-4 py-2 md:pl-14">
              <p v-if="section.rows.length === 0" class="mb-1.5 text-sm text-text-muted">
                Ainda não há fornecedores cadastrados.
              </p>
              <UiButton
                size="sm"
                variant="ghost"
                @click="novoFornecedor(section.id === SEM_GASTO ? undefined : section.id)"
              >
                <Icon name="lucide:plus" class="h-4 w-4" />
                Adicionar fornecedor
              </UiButton>
            </div>
          </template>
        </AdminTable>
      </AdminPanel>

      <!-- "fornecedor arquivado", não "cotação arquivada": a proposta
           recusada continua sendo história útil do fornecedor. -->
      <AdminArchivedList
        :itens="arquivadosParaLista"
        singular="fornecedor arquivado"
        plural="fornecedores arquivados"
        @restaurar="restaurar"
      />
    </template>

    <AdminFinanceVendorModal
      v-model="modalAberto"
      :fornecedor="emEdicao"
      :categorias="categorias?.data ?? []"
      :despesas="despesas"
      :despesa-padrao="despesaPadrao"
      @salvar="salvar"
    />

    <AdminFinanceContractModal
      v-model="contratoAberto"
      :fornecedor="fornecedorDoContrato"
      :despesas="despesas"
      :despesa-padrao="fornecedorDoContrato?.gasto?.id ?? null"
      @contratar="confirmarContratacao"
      @criar-gasto="navigateTo(`/admin/${slug}/financeiro`)"
    />

    <UiModal
      :model-value="Boolean(propostasAbertas)"
      :title="`Propostas de ${propostasAbertas?.nome ?? ''}`"
      description="O PDF que o fornecedor mandou fica junto da cotação — e continua acessível em Documentos."
      @update:model-value="propostasAbertas = null"
    >
      <div class="flex flex-col gap-3">
        <AdminFinanceDocumentList
          v-if="(propostas?.data ?? []).length > 0"
          :documentos="propostas?.data ?? []"
          compacta
          @abrir="abrirProposta"
          @excluir="excluirProposta"
        />
        <p v-else class="text-sm text-text-muted">Nenhuma proposta anexada ainda.</p>
      </div>
      <template #footer>
        <UiButton variant="outline" :to="`/admin/${slug}/financeiro/documentos`">
          Anexar em Documentos
        </UiButton>
      </template>
    </UiModal>

    <!-- O impedimento é dito ANTES do botão, não depois: o servidor recusa
         arquivar fornecedor ligado a um gasto, e a tela mandava tentar para só
         então avisar — num toast que aparecia atrás desta mesma janela. -->
    <UiModal
      :model-value="Boolean(paraArquivar)"
      title="Arquivar fornecedor"
      :description="`“${paraArquivar?.nome}” sai da lista. Dá para restaurar depois, e o histórico das despesas continua.`"
      @update:model-value="paraArquivar = null"
    >
      <div v-if="gastosVinculados.length > 0" class="flex flex-col gap-3">
        <div class="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <Icon name="lucide:link" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p class="text-sm text-text">
            Este fornecedor é o contratado de
            {{ gastosVinculados.length }}
            {{ gastosVinculados.length === 1 ? 'gasto' : 'gastos' }} do orçamento. Arquivar exige
            desfazer esse vínculo primeiro.
          </p>
        </div>

        <ul class="flex flex-col gap-1">
          <li
            v-for="despesa in gastosVinculados"
            :key="despesa.id"
            class="flex flex-wrap items-baseline justify-between gap-x-3 rounded-md bg-surface-muted/60 px-3 py-2"
          >
            <span class="text-sm text-text">{{ despesa.descricao }}</span>
            <span v-if="despesa.totais.contratado !== null" class="num text-sm text-text-muted">
              {{ formatCentsToBRL(despesa.totais.contratado) }}
            </span>
          </li>
        </ul>

        <p class="text-sm text-text-muted">
          O gasto continua no orçamento com o valor fechado e as parcelas — só deixa de apontar para
          este fornecedor.
        </p>
      </div>

      <template #footer>
        <UiButton variant="ghost" @click="paraArquivar = null">Cancelar</UiButton>
        <UiButton
          v-if="gastosVinculados.length > 0"
          variant="destructive"
          :disabled="desvinculando"
          @click="desvincularEArquivar"
        >
          {{ desvinculando ? 'Desvinculando…' : 'Desvincular e arquivar' }}
        </UiButton>
        <UiButton v-else variant="destructive" @click="confirmarArquivamento">Arquivar</UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
