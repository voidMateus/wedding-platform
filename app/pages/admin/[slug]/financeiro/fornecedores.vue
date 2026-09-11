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
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { VendorContractInput, VendorInput } from '#shared/schemas/finance'
import type { AdminTableColumn, AdminTableSection } from '~/types/table'
import type { FornecedorComSituacao } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const toast = useToast()

const { listVendors, criarFornecedor, atualizarFornecedor, arquivarFornecedor } = useVendors()
const { data, status, error, refresh } = listVendors()

const { listCategorias, getOrcamento, contratarFornecedor } = useFinance()
const { data: todasCategorias } = listCategorias()

// Arquivada não é opção de cadastro — só as ativas vão para o seletor.
const categorias = computed(() => ({
  data: (todasCategorias.value?.data ?? []).filter((categoria) => !categoria.excluido_em),
}))
const { data: orcamento } = getOrcamento()

const { listDocuments } = useFinanceDocuments()

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
    label: 'Estágio',
    filter: {
      type: 'select',
      multiple: true,
      options: ESTAGIOS_FORNECEDOR.map((valor) => ({
        value: valor,
        label: ROTULOS_ESTAGIO_FORNECEDOR[valor],
      })),
    },
  },
  { key: 'cotacao', label: 'Cotação', align: 'right', sort: 'numeric' },
  { key: 'contato', label: 'Contato' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const filters = useTableFilters(colunas)

const linhasFiltradas = computed(() => {
  const texto = (filters.values.value.nome?.[0] ?? '').toLowerCase().trim()
  const estagios = filters.values.value.estagio ?? []

  return fornecedores.value.filter((fornecedor) => {
    if (texto && !fornecedor.nome.toLowerCase().includes(texto)) return false
    if (estagios.length > 0 && !estagios.includes(fornecedor.estagio)) return false
    return true
  })
})

const SEM_GASTO = 'sem-gasto'

/**
 * Um bloco por gasto cotado, com a categoria no rótulo. Quem ainda não cota
 * gasto nenhum cai num bloco próprio no fim — é onde ficam os contatos que o
 * casal guardou antes de decidir o que vai precisar.
 */
const secoes = computed<AdminTableSection<FornecedorComSituacao>[]>(() => {
  const blocos = new Map<string, AdminTableSection<FornecedorComSituacao>>()

  for (const fornecedor of linhasFiltradas.value) {
    const chave = fornecedor.gasto?.id ?? SEM_GASTO
    const gasto = despesas.value.find((despesa) => despesa.id === fornecedor.gasto?.id)
    const categoria = gasto?.categoria?.nome ?? fornecedor.categoria?.nome

    const bloco = blocos.get(chave) ?? {
      id: chave,
      label: fornecedor.gasto?.descricao ?? 'Sem gasto definido',
      level: 0 as const,
      meta: categoria ?? undefined,
      icon: chave === SEM_GASTO ? 'lucide:help-circle' : 'lucide:receipt',
      rows: [] as FornecedorComSituacao[],
    }
    ;(bloco.rows as FornecedorComSituacao[]).push(fornecedor)
    blocos.set(chave, bloco)
  }

  return [...blocos.values()]
    .map((bloco) => {
      const cotacoes = bloco.rows
        .map((f) => f.valor_proposto_centavos)
        .filter((valor): valor is number => typeof valor === 'number' && valor > 0)
      const menor = cotacoes.length > 0 ? Math.min(...cotacoes) : null
      const gasto = despesas.value.find((despesa) => despesa.id === bloco.id)
      const partes: string[] = []
      if (bloco.meta) partes.push(bloco.meta)
      if (gasto && gasto.totais.estimado > 0) {
        partes.push(`estimado ${formatCentsToBRL(gasto.totais.estimado)}`)
      }
      if (cotacoes.length > 1 && menor !== null) {
        partes.push(`${cotacoes.length} cotações · menor ${formatCentsToBRL(menor)}`)
      }
      return { ...bloco, meta: partes.join(' · ') || undefined }
    })
    .sort((a, b) => {
      if (a.id === SEM_GASTO) return 1
      if (b.id === SEM_GASTO) return -1
      return a.label.localeCompare(b.label, 'pt-BR')
    })
})

const recolhidos = ref<string[]>([])

function alternarBloco(id: string) {
  recolhidos.value = recolhidos.value.includes(id)
    ? recolhidos.value.filter((atual) => atual !== id)
    : [...recolhidos.value, id]
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

// --- arquivar / restaurar ---
const paraArquivar = ref<FornecedorComSituacao | null>(null)
const mostrarArquivados = ref(false)

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
    description="Cote quantos quiser por gasto, compare e contrate."
    :meta="`${linhasFiltradas.length} ${linhasFiltradas.length === 1 ? 'cotação' : 'cotações'}`"
  >
    <template #actions>
      <UiButton @click="novoFornecedor()">Nova cotação</UiButton>
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

    <UiEmptyState
      v-else-if="fornecedores.length === 0"
      icon="lucide:store"
      title="Nenhuma cotação ainda"
      description="Cadastre as propostas que você recebeu para cada gasto do orçamento — elas ficam lado a lado para comparar, sem entrar na conta do orçamento."
    >
      <UiButton @click="novoFornecedor()">Nova cotação</UiButton>
    </UiEmptyState>

    <template v-else>
      <AdminTableFilterBar
        :filters="filters"
        :columns="colunas"
        group-label="Filtros de fornecedores"
      />

      <AdminPanel title="Cotações por gasto">
        <AdminTable
          :columns="colunas"
          :rows="linhasFiltradas"
          :sections="secoes"
          :collapsed-ids="recolhidos"
          :filters="filters"
          empty-label="Nenhum fornecedor com esses filtros."
          @toggle-section="alternarBloco"
        >
          <template #cell-nome="{ row }">
            <div class="min-w-0">
              <span class="flex items-center gap-1.5">
                <span class="truncate text-text">{{ row.nome }}</span>
                <UiBadge v-if="ehMaisBarato(row)" tone="success">menor preço</UiBadge>
              </span>
              <span v-if="row.nome_contato" class="block truncate text-xs text-text-muted">
                {{ row.nome_contato }}
              </span>
              <button
                v-if="faltaLevarAoOrcamento(row)"
                type="button"
                class="mt-0.5 text-xs text-warning underline-offset-2 hover:underline"
                @click="abrirContratacao(row)"
              >
                Contratado sem valor no orçamento — registrar
              </button>
            </div>
          </template>

          <template #cell-estagio="{ row }">
            <UiBadge :tone="estagioFornecedorPresentation(row.estagio as never).tone">
              {{ estagioFornecedorPresentation(row.estagio as never).label }}
            </UiBadge>
          </template>

          <template #cell-cotacao="{ row }">
            <div class="text-right">
              <span v-if="row.valor_proposto_centavos" class="tabular-nums text-text">
                {{ formatCentsToBRL(row.valor_proposto_centavos) }}
              </span>
              <span v-else class="text-text-muted">—</span>
              <span v-if="diferencaParaMenor(row)" class="block text-xs text-text-muted">
                +{{ formatCentsToBRL(diferencaParaMenor(row) ?? 0) }} que a menor
              </span>
              <span v-if="row.contratadoCentavos > 0" class="block text-xs text-success">
                fechado por {{ formatCentsToBRL(row.contratadoCentavos) }}
              </span>
            </div>
          </template>

          <template #cell-contato="{ row }">
            <div class="flex items-center gap-1">
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
                v-if="row.site_url"
                icon="lucide:external-link"
                label="Abrir site"
                :to="row.site_url"
              />
              <button
                type="button"
                class="text-xs text-text-muted underline-offset-2 hover:text-primary hover:underline"
                @click="propostasAbertas = row"
              >
                {{ row.totalDocumentos > 0 ? `${row.totalDocumentos} proposta(s)` : 'anexar' }}
              </button>
            </div>
          </template>

          <template #cell-acoes="{ row }">
            <div class="flex items-center justify-end gap-1">
              <AdminRowAction
                icon="lucide:file-signature"
                label="Contratar este fornecedor"
                @click="abrirContratacao(row)"
              />
              <AdminRowAction icon="lucide:pencil" label="Editar" @click="editar(row)" />
              <AdminRowAction icon="lucide:archive" label="Arquivar" @click="paraArquivar = row" />
            </div>
          </template>

          <template #stacked="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium text-text">{{ row.nome }}</span>
                <UiBadge v-if="ehMaisBarato(row)" tone="success">menor preço</UiBadge>
                <UiBadge :tone="estagioFornecedorPresentation(row.estagio as never).tone">
                  {{ estagioFornecedorPresentation(row.estagio as never).label }}
                </UiBadge>
              </div>
              <span v-if="row.valor_proposto_centavos" class="text-sm tabular-nums text-text">
                {{ formatCentsToBRL(row.valor_proposto_centavos) }}
                <span v-if="diferencaParaMenor(row)" class="text-xs text-text-muted">
                  (+{{ formatCentsToBRL(diferencaParaMenor(row) ?? 0) }})
                </span>
              </span>
              <div class="mt-1 flex items-center gap-1">
                <UiButton size="sm" variant="outline" @click="abrirContratacao(row)">
                  Contratar
                </UiButton>
                <AdminRowAction icon="lucide:pencil" label="Editar" @click="editar(row)" />
                <AdminRowAction
                  icon="lucide:archive"
                  label="Arquivar"
                  @click="paraArquivar = row"
                />
              </div>
            </div>
          </template>

          <template #section-footer="{ section }">
            <UiButton
              size="sm"
              variant="ghost"
              @click="novoFornecedor(section.id === SEM_GASTO ? undefined : section.id)"
            >
              <Icon name="lucide:plus" class="h-4 w-4" />
              Adicionar cotação
            </UiButton>
          </template>
        </AdminTable>
      </AdminPanel>

      <AdminPanel v-if="arquivados.length > 0">
        <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <button
            type="button"
            class="flex items-center gap-2 text-sm text-text-muted hover:text-text"
            :aria-expanded="mostrarArquivados"
            @click="mostrarArquivados = !mostrarArquivados"
          >
            <Icon
              :name="mostrarArquivados ? 'lucide:chevron-down' : 'lucide:chevron-right'"
              class="h-4 w-4"
            />
            {{ arquivados.length }}
            {{ arquivados.length === 1 ? 'fornecedor arquivado' : 'fornecedores arquivados' }}
          </button>
        </div>

        <ul v-if="mostrarArquivados" class="divide-y divide-border border-t border-border">
          <li
            v-for="fornecedor in arquivados"
            :key="fornecedor.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 sm:px-5"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-text-muted">
              {{ fornecedor.nome }}
            </span>
            <span v-if="fornecedor.valor_proposto_centavos" class="text-xs text-text-muted">
              cotado {{ formatCentsToBRL(fornecedor.valor_proposto_centavos) }}
            </span>
            <UiButton size="sm" variant="ghost" @click="restaurar(fornecedor.id)">
              Restaurar
            </UiButton>
          </li>
        </ul>
      </AdminPanel>
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
          @abrir="() => {}"
          @excluir="() => {}"
        />
        <p v-else class="text-sm text-text-muted">Nenhuma proposta anexada ainda.</p>

        <UiButton variant="outline" :to="`/admin/${slug}/financeiro/documentos`">
          Anexar em Documentos
        </UiButton>
      </div>
    </UiModal>

    <UiModal
      :model-value="Boolean(paraArquivar)"
      title="Arquivar fornecedor"
      :description="`“${paraArquivar?.nome}” sai da lista. Dá para restaurar depois, e o histórico das despesas continua.`"
      @update:model-value="paraArquivar = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="paraArquivar = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarArquivamento">Arquivar</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
