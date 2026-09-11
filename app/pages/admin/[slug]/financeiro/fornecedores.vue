<!--
  Fornecedores: contato, estágio da negociação e a situação financeira
  DERIVADA das despesas ligadas a cada um.

  São duas colunas de estado diferentes de propósito. O estágio é escolha do
  casal ("estamos negociando"); a situação financeira é consequência dos fatos
  ("ainda devemos R$ 12.000"). Fundir as duas obrigaria alguém a lembrar de
  marcar "pago" — e a lista mentiria no dia em que esquecessem.

  A COTAÇÃO CONTINUA FORA DO ORÇAMENTO (três buffets concorrentes somariam três
  vezes o mesmo gasto), mas contratar não pode ser um beco sem saída: quem
  marca um fornecedor como contratado é levado direto a criar a despesa, com
  descrição, categoria e valor já preenchidos a partir da cotação.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { EstagioFornecedor, VendorContractInput, VendorInput } from '#shared/schemas/finance'
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { FornecedorComSituacao } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const toast = useToast()
const { listVendors, criarFornecedor, atualizarFornecedor, excluirFornecedor } = useVendors()
const { data, status, error, refresh } = listVendors()
const { listCategorias, getOrcamento, contratarFornecedor, atualizarFinanceiro } = useFinance()
const { data: categorias } = listCategorias()
const { data: orcamento } = getOrcamento()

/** Os gastos do orçamento — é um deles que a contratação preenche. */
const despesas = computed(() =>
  (orcamento.value?.categorias ?? []).flatMap((categoria) => categoria.despesas),
)

const filtroEstagio = ref<EstagioFornecedor | ''>('')
const filtroCategoria = ref('')

const SEM_CATEGORIA = 'sem-categoria'

const opcoesCategoria = computed(() => [
  { value: '', label: 'Todas as categorias' },
  ...(categorias.value?.data ?? []).map((categoria) => ({
    value: categoria.id,
    label: categoria.nome,
  })),
  { value: SEM_CATEGORIA, label: 'Sem categoria' },
])

const fornecedoresFiltrados = computed(() => {
  let lista = data.value?.data ?? []

  if (filtroEstagio.value) {
    lista = lista.filter((fornecedor) => fornecedor.estagio === filtroEstagio.value)
  }

  if (filtroCategoria.value === SEM_CATEGORIA) {
    lista = lista.filter((fornecedor) => !fornecedor.categoria_id)
  } else if (filtroCategoria.value) {
    lista = lista.filter((fornecedor) => fornecedor.categoria_id === filtroCategoria.value)
  }

  return lista
})

/**
 * A lista é agrupada por categoria, não uma fileira única: é assim que o casal
 * compara propostas — "quanto custa um buffet" é uma pergunta dentro de uma
 * categoria, e com os três concorrentes espalhados entre fotógrafos e bandas
 * ninguém compara nada.
 */
const grupos = computed(() => {
  const porCategoria = new Map<string, { nome: string; fornecedores: FornecedorComSituacao[] }>()

  for (const fornecedor of fornecedoresFiltrados.value) {
    const chave = fornecedor.categoria_id ?? SEM_CATEGORIA
    const grupo = porCategoria.get(chave) ?? {
      nome: fornecedor.categoria?.nome ?? 'Sem categoria',
      fornecedores: [],
    }
    grupo.fornecedores.push(fornecedor)
    porCategoria.set(chave, grupo)
  }

  // "Sem categoria" sempre por último: é o resto, não uma categoria de verdade.
  return [...porCategoria.entries()]
    .sort(([a, grupoA], [b, grupoB]) => {
      if (a === SEM_CATEGORIA) return 1
      if (b === SEM_CATEGORIA) return -1
      return grupoA.nome.localeCompare(grupoB.nome, 'pt-BR')
    })
    .map(([chave, grupo]) => ({ chave, ...grupo }))
})

/** Soma das cotações do grupo — comparação, nunca compromisso. */
function totalCotado(fornecedores: FornecedorComSituacao[]): number {
  return fornecedores.reduce(
    (total, fornecedor) => total + (fornecedor.valor_proposto_centavos ?? 0),
    0,
  )
}

/** Contratado sem despesa: o dinheiro dele ainda não existe no orçamento. */
function faltaLevarAoOrcamento(fornecedor: FornecedorComSituacao): boolean {
  return fornecedor.estagio === 'contratado' && fornecedor.totalDespesas === 0
}

const modalAberto = ref(false)
const emEdicao = ref<FornecedorComSituacao | null>(null)
const paraArquivar = ref<FornecedorComSituacao | null>(null)

// --- contratar: a ponte entre cotar e pagar ---
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

function novoFornecedor() {
  emEdicao.value = null
  modalAberto.value = true
}

function editar(fornecedor: FornecedorComSituacao) {
  emEdicao.value = fornecedor
  modalAberto.value = true
}

async function salvar(input: VendorInput) {
  try {
    const salvo = emEdicao.value
      ? await atualizarFornecedor(emEdicao.value.id, input)
      : await criarFornecedor(input)
    modalAberto.value = false
    await Promise.all([refresh(), atualizarFinanceiro()])
    toast.success('Fornecedor salvo.')

    // Contratou? O passo seguinte é sempre o mesmo — e deixar o casal
    // descobrir sozinho que precisa ir até o Orçamento criar a despesa é como
    // um fornecedor contratado fica meses fora da conta.
    const jaTemDespesa = emEdicao.value ? emEdicao.value.totalDespesas > 0 : false
    if (input.estagio === 'contratado' && !jaTemDespesa) {
      // A lista recarregada já traz os campos derivados; se a ida e volta ainda
      // não chegou, o recém-salvo basta — o modal só usa id, nome, categoria e
      // cotação, e todos vêm da própria resposta da gravação.
      const atualizado = (data.value?.data ?? []).find((f) => f.id === salvo.id)
      abrirContratacao(
        atualizado ?? {
          ...salvo,
          categoria: null,
          situacaoFinanceira: 'sem_despesa',
          contratadoCentavos: 0,
          aPagarCentavos: 0,
          totalDespesas: 0,
        },
      )
    }
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar o fornecedor.'))
  }
}

async function confirmarArquivamento() {
  const fornecedor = paraArquivar.value
  if (!fornecedor) return
  try {
    await excluirFornecedor(fornecedor.id)
    paraArquivar.value = null
    toast.success('Fornecedor arquivado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível arquivar o fornecedor.'))
  }
}

function limparFiltros() {
  filtroEstagio.value = ''
  filtroCategoria.value = ''
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
    description="Quem você está pesquisando, negociando e já contratou."
    :meta="`${fornecedoresFiltrados.length} ${fornecedoresFiltrados.length === 1 ? 'fornecedor' : 'fornecedores'}`"
  >
    <template #actions>
      <UiButton @click="novoFornecedor">Novo fornecedor</UiButton>
    </template>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap gap-2">
        <UiChip
          label="Todos"
          clickable
          :selected="filtroEstagio === ''"
          @click="filtroEstagio = ''"
        />
        <UiChip
          v-for="estagio in ESTAGIOS_FORNECEDOR"
          :key="estagio"
          :label="ROTULOS_ESTAGIO_FORNECEDOR[estagio]"
          clickable
          :selected="filtroEstagio === estagio"
          @click="filtroEstagio = estagio"
        />
      </div>

      <div class="sm:w-56">
        <UiSelect
          v-model="filtroCategoria"
          :options="opcoesCategoria"
          aria-label="Filtrar por categoria"
        />
      </div>
    </div>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar os fornecedores.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

    <UiEmptyState
      v-else-if="fornecedoresFiltrados.length === 0"
      icon="lucide:store"
      :title="
        (data?.data ?? []).length === 0 ? 'Nenhum fornecedor por aqui' : 'Nada com esses filtros'
      "
      :description="
        (data?.data ?? []).length === 0
          ? 'Cadastre quem você está cotando — a proposta fica registrada sem virar despesa.'
          : 'Nenhum fornecedor corresponde ao estágio e à categoria escolhidos.'
      "
    >
      <UiButton v-if="(data?.data ?? []).length === 0" @click="novoFornecedor">
        Novo fornecedor
      </UiButton>
      <UiButton v-else variant="outline" @click="limparFiltros">Limpar filtros</UiButton>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-4">
      <AdminPanel
        v-for="grupo in grupos"
        :key="grupo.chave"
        :title="grupo.nome"
        :meta="
          totalCotado(grupo.fornecedores) > 0
            ? `${grupo.fornecedores.length} · ${formatCentsToBRL(totalCotado(grupo.fornecedores))} em cotações`
            : `${grupo.fornecedores.length}`
        "
      >
        <ul class="divide-y divide-border">
          <li
            v-for="fornecedor in grupo.fornecedores"
            :key="fornecedor.id"
            class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5"
          >
            <div class="min-w-0 flex-1">
              <span class="truncate text-sm font-medium text-text">{{ fornecedor.nome }}</span>
              <p v-if="fornecedor.nome_contato" class="truncate text-xs text-text-muted">
                {{ fornecedor.nome_contato }}
              </p>
              <!--
                O aviso só existe para o estado que o produto considera
                incompleto: contratado é compromisso, e compromisso mora no
                orçamento.
              -->
              <button
                v-if="faltaLevarAoOrcamento(fornecedor)"
                type="button"
                class="mt-0.5 text-xs text-warning underline-offset-2 hover:underline"
                @click="abrirContratacao(fornecedor)"
              >
                Contratado, mas ainda não está no orçamento — registrar valor
              </button>
            </div>

            <UiBadge :tone="estagioFornecedorPresentation(fornecedor.estagio as never).tone">
              {{ estagioFornecedorPresentation(fornecedor.estagio as never).label }}
            </UiBadge>

            <div class="text-right text-sm tabular-nums">
              <p v-if="fornecedor.contratadoCentavos > 0" class="text-text">
                {{ formatCentsToBRL(fornecedor.contratadoCentavos) }}
              </p>
              <p v-else-if="fornecedor.valor_proposto_centavos" class="text-text-muted">
                {{ formatCentsToBRL(fornecedor.valor_proposto_centavos) }}
                <span class="text-xs">cotado</span>
              </p>
              <p class="text-xs text-text-muted">
                {{ situacaoFornecedorPresentation(fornecedor.situacaoFinanceira).label }}
                <template v-if="fornecedor.aPagarCentavos > 0">
                  · {{ formatCentsToBRL(fornecedor.aPagarCentavos) }}
                </template>
              </p>
            </div>

            <div class="flex items-center gap-1">
              <AdminRowAction
                icon="lucide:file-signature"
                label="Registrar contratação"
                @click="abrirContratacao(fornecedor)"
              />
              <AdminRowAction
                v-if="linkWhatsApp(fornecedor.telefone)"
                icon="lucide:message-circle"
                label="Abrir conversa no WhatsApp"
                :to="linkWhatsApp(fornecedor.telefone) ?? undefined"
              />
              <AdminRowAction
                v-if="fornecedor.email"
                icon="lucide:mail"
                label="Enviar e-mail"
                :to="`mailto:${fornecedor.email}`"
              />
              <AdminRowAction icon="lucide:pencil" label="Editar" @click="editar(fornecedor)" />
              <AdminRowAction
                icon="lucide:archive"
                label="Arquivar"
                @click="paraArquivar = fornecedor"
              />
            </div>
          </li>
        </ul>
      </AdminPanel>
    </div>

    <AdminFinanceVendorModal
      v-model="modalAberto"
      :fornecedor="emEdicao"
      :categorias="categorias?.data ?? []"
      @salvar="salvar"
    />

    <AdminFinanceContractModal
      v-model="contratoAberto"
      :fornecedor="fornecedorDoContrato"
      :despesas="despesas"
      @contratar="confirmarContratacao"
      @criar-gasto="navigateTo(`/admin/${slug}/financeiro`)"
    />

    <UiModal
      :model-value="Boolean(paraArquivar)"
      title="Arquivar fornecedor"
      :description="`“${paraArquivar?.nome}” sai da lista. O histórico das despesas continua.`"
      @update:model-value="paraArquivar = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="paraArquivar = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarArquivamento">Arquivar</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
