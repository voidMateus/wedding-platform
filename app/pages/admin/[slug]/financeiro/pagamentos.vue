<!--
  Pagamentos — a vida financeira do que já foi contratado.

  Aqui não se planeja: cada linha é um valor com data para sair, e a pergunta é
  sempre a mesma — o que já pagamos, o que vence, o que passou. Marcar pago
  acontece na própria linha, porque é a ação mais repetida do módulo.

  **Contratar é o que traz o gasto para cá — não ter parcela definida não o
  esconde.** Quem fechou com o buffet e escolheu "defino depois" encontra o
  compromisso aqui como "Sem data", com o caminho para agendar; sumir até
  alguém lembrar de parcelar era o furo mais fácil de virar conta esquecida.

  Mesma mecânica de tabela do Modo Lista (AdminTable com filtro por coluna e
  formato empilhado no celular).
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { ROTULOS_FORMA_PAGAMENTO, type FormaPagamento } from '#shared/schemas/finance'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { AdminTableColumn } from '~/types/table'
import type { PagamentoListado } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const toast = useToast()

const { getPagamentos, atualizarParcela, excluirParcela, gerarParcelasDaDespesa } = useFinance()
const { data, status, error, refresh } = getPagamentos()

const hoje = hojeNoFusoDoEvento()
const pagamentos = computed(() => data.value?.data ?? [])

const SITUACOES = [
  { value: 'vencida', label: 'Vencido' },
  { value: 'a_vencer', label: 'A vencer' },
  { value: 'a_definir', label: 'Sem data' },
  { value: 'paga', label: 'Pago' },
] as const

const colunas = computed<AdminTableColumn<PagamentoListado>[]>(() => [
  {
    key: 'situacao',
    label: 'Estado',
    filter: { type: 'select', multiple: true, options: [...SITUACOES] },
  },
  {
    key: 'gasto',
    label: 'Gasto',
    filter: { type: 'text', placeholder: 'Buscar gasto ou fornecedor' },
  },
  { key: 'detalhes', label: 'Detalhes' },
  { key: 'valor', label: 'Valor', align: 'right', sort: 'numeric' },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const filters = useTableFilters(colunas)

const linhasFiltradas = computed(() => {
  const situacoes = filters.values.value.situacao ?? []
  const texto = (filters.values.value.gasto?.[0] ?? '').toLowerCase().trim()

  return pagamentos.value.filter((pagamento) => {
    if (situacoes.length > 0 && !situacoes.includes(pagamento.situacao)) return false
    if (texto) {
      const alvo =
        `${pagamento.despesa.descricao} ${pagamento.fornecedor?.nome ?? ''}`.toLowerCase()
      if (!alvo.includes(texto)) return false
    }
    return true
  })
})

// --- marcar pago ---
const pagamentoEmEdicao = ref<PagamentoListado | null>(null)
const dataDoPagamento = ref(hoje)
const formaDoPagamento = ref<FormaPagamento | ''>('')

function abrirBaixa(pagamento: PagamentoListado) {
  pagamentoEmEdicao.value = pagamento
  dataDoPagamento.value = hoje
  formaDoPagamento.value = (pagamento.forma_pagamento as FormaPagamento) ?? ''
}

async function confirmarBaixa() {
  const pagamento = pagamentoEmEdicao.value
  if (!pagamento) return
  try {
    await atualizarParcela(pagamento.id, {
      pagoEm: dataDoPagamento.value,
      formaPagamento: formaDoPagamento.value || null,
    })
    pagamentoEmEdicao.value = null
    toast.success('Pagamento registrado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível registrar o pagamento.'))
  }
}

async function desfazer(pagamento: PagamentoListado) {
  try {
    await atualizarParcela(pagamento.id, { pagoEm: null })
    toast.success('Pagamento desfeito.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível desfazer o pagamento.'))
  }
}

// --- agendar o que está sem data ---
const agendamento = ref<PagamentoListado | null>(null)
const quantidadeParcelas = ref('1')
const primeiroVencimento = ref(hoje)

function abrirAgendamento(pagamento: PagamentoListado) {
  agendamento.value = pagamento
  quantidadeParcelas.value = '1'
  primeiroVencimento.value = hoje
}

async function confirmarAgendamento() {
  const pagamento = agendamento.value
  if (!pagamento) return
  const quantidade = Number(quantidadeParcelas.value)

  try {
    await gerarParcelasDaDespesa(pagamento.despesa_id, {
      parcelamento:
        quantidade <= 1
          ? { modo: 'a_vista', venceEm: primeiroVencimento.value }
          : { modo: 'parcelado', quantidade, primeiroVencimento: primeiroVencimento.value },
      substituirEmAberto: false,
    })
    agendamento.value = null
    toast.success('Pagamento agendado.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível agendar o pagamento.'))
  }
}

const paraExcluir = ref<PagamentoListado | null>(null)

async function confirmarExclusao() {
  const pagamento = paraExcluir.value
  if (!pagamento) return
  try {
    await excluirParcela(pagamento.id)
    paraExcluir.value = null
    toast.success('Parcela removida.')
  } catch (erro) {
    toast.error(getApiErrorMessage(erro, 'Não foi possível remover a parcela.'))
  }
}

const opcoesForma = [
  { value: '', label: 'Não informar' },
  ...Object.entries(ROTULOS_FORMA_PAGAMENTO).map(([value, label]) => ({ value, label })),
]

const indicadores = computed(() => {
  const resumo = data.value?.resumo
  if (!resumo) return []
  return [
    { chave: 'pago', label: 'Pago', bloco: resumo.pago, tone: 'text-text' },
    { chave: 'a-pagar', label: 'A pagar', bloco: resumo.aPagar, tone: 'text-text' },
    {
      chave: 'vencidos',
      label: 'Vencidos',
      bloco: resumo.vencidos,
      tone: resumo.vencidos.quantidade > 0 ? 'text-danger' : 'text-text',
    },
    {
      chave: 'proximos',
      label: 'Próximos 30 dias',
      bloco: resumo.proximos30Dias,
      tone: resumo.proximos30Dias.quantidade > 0 ? 'text-warning' : 'text-text',
    },
    {
      chave: 'sem-data',
      label: 'Sem data',
      bloco: resumo.semData,
      tone: resumo.semData.quantidade > 0 ? 'text-warning' : 'text-text',
    },
  ]
})
</script>

<template>
  <AdminSection title="Pagamentos" description="O que já saiu, o que vence e o que está atrasado.">
    <template #actions>
      <UiButton variant="outline" :to="base">Ir para o orçamento</UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-96 w-full" />

    <UiEmptyState
      v-else-if="error"
      icon="lucide:triangle-alert"
      title="Não foi possível carregar os pagamentos"
      description="Tente novamente em alguns instantes."
    >
      <UiButton variant="outline" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="pagamentos.length === 0"
      icon="lucide:receipt"
      title="Nenhum compromisso ainda"
      description="Assim que um gasto tiver valor fechado, ele aparece aqui — mesmo antes de você definir como vai pagar."
    >
      <UiButton :to="base">Ir para o orçamento</UiButton>
    </UiEmptyState>

    <template v-else-if="data">
      <!-- Os números são sempre do conjunto inteiro, nunca do recorte: o total
           de vencidos não pode mudar porque alguém filtrou por "pagos". -->
      <dl
        class="grid grid-cols-2 gap-px overflow-clip rounded-lg border border-border bg-border lg:grid-cols-5"
      >
        <div
          v-for="indicador in indicadores"
          :key="indicador.chave"
          class="bg-surface-elevated px-4 py-3.5"
        >
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
            {{ indicador.label }}
          </dt>
          <dd
            class="mt-0.5 font-display text-lg font-semibold tabular-nums"
            :class="indicador.tone"
          >
            {{ formatCentsToBRL(indicador.bloco.valor) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            {{ indicador.bloco.quantidade }}
            {{ indicador.bloco.quantidade === 1 ? 'lançamento' : 'lançamentos' }}
          </dd>
        </div>
      </dl>

      <AdminTableFilterBar
        :filters="filters"
        :columns="colunas"
        group-label="Filtros de pagamentos"
      />

      <AdminPanel title="Lançamentos" :meta="`${linhasFiltradas.length} de ${pagamentos.length}`">
        <AdminTable
          :columns="colunas"
          :rows="linhasFiltradas"
          :filters="filters"
          empty-label="Nenhum lançamento com esses filtros."
        >
          <template #cell-situacao="{ row }">
            <UiBadge :tone="situacaoParcelaPresentation(row.situacao).tone">
              {{ situacaoParcelaPresentation(row.situacao).label }}
            </UiBadge>
          </template>

          <template #cell-gasto="{ row }">
            <div class="min-w-0">
              <span class="block truncate text-text">{{ row.despesa.descricao }}</span>
              <span class="block truncate text-xs text-text-muted">
                <template v-if="row.categoria">{{ row.categoria.nome }}</template>
                <template v-if="row.categoria && row.fornecedor"> · </template>
                <template v-if="row.fornecedor">{{ row.fornecedor.nome }}</template>
              </span>
            </div>
          </template>

          <template #cell-detalhes="{ row }">
            <div class="text-xs text-text-muted">
              <p v-if="row.pago_em">
                Pago em {{ formatarVencimento(row.pago_em, hoje) }}
                <template v-if="row.forma_pagamento">
                  · {{ ROTULOS_FORMA_PAGAMENTO[row.forma_pagamento as FormaPagamento] }}
                </template>
              </p>
              <p v-if="row.vence_em">
                Vence em {{ formatarVencimento(row.vence_em, hoje) }}
                <template v-if="row.totalDeParcelas > 1">
                  · {{ row.numero }} de {{ row.totalDeParcelas }}
                </template>
              </p>
              <p v-else>Contratado, sem data de pagamento definida</p>
            </div>
          </template>

          <template #cell-valor="{ row }">
            <span class="font-medium tabular-nums text-text">
              {{ formatCentsToBRL(row.valor_centavos) }}
            </span>
          </template>

          <template #cell-acoes="{ row }">
            <div class="flex items-center justify-end gap-1">
              <UiButton
                v-if="row.tipo === 'a_definir'"
                size="sm"
                variant="outline"
                @click="abrirAgendamento(row)"
              >
                Agendar
              </UiButton>
              <UiButton
                v-else-if="!row.pago_em"
                size="sm"
                variant="outline"
                @click="abrirBaixa(row)"
              >
                Marcar pago
              </UiButton>
              <UiButton v-else size="sm" variant="ghost" @click="desfazer(row)">Desfazer</UiButton>
              <AdminRowAction
                v-if="row.tipo === 'parcela'"
                icon="lucide:trash-2"
                label="Remover parcela"
                @click="paraExcluir = row"
              />
            </div>
          </template>

          <template #stacked="{ row }">
            <div class="flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge :tone="situacaoParcelaPresentation(row.situacao).tone">
                  {{ situacaoParcelaPresentation(row.situacao).label }}
                </UiBadge>
                <span class="font-medium text-text">{{ row.despesa.descricao }}</span>
              </div>
              <span class="text-sm tabular-nums text-text">
                {{ formatCentsToBRL(row.valor_centavos) }}
              </span>
              <span class="text-xs text-text-muted">
                <template v-if="row.vence_em">
                  Vence em {{ formatarVencimento(row.vence_em, hoje) }}
                </template>
                <template v-else>Sem data definida</template>
              </span>
              <div class="mt-1 flex items-center gap-1">
                <UiButton
                  v-if="row.tipo === 'a_definir'"
                  size="sm"
                  variant="outline"
                  @click="abrirAgendamento(row)"
                >
                  Agendar
                </UiButton>
                <UiButton
                  v-else-if="!row.pago_em"
                  size="sm"
                  variant="outline"
                  @click="abrirBaixa(row)"
                >
                  Marcar pago
                </UiButton>
                <UiButton v-else size="sm" variant="ghost" @click="desfazer(row)">
                  Desfazer
                </UiButton>
              </div>
            </div>
          </template>
        </AdminTable>
      </AdminPanel>
    </template>

    <UiModal
      :model-value="Boolean(pagamentoEmEdicao)"
      title="Registrar pagamento"
      :description="`${pagamentoEmEdicao?.despesa.descricao ?? ''} — ${pagamentoEmEdicao ? formatCentsToBRL(pagamentoEmEdicao.valor_centavos) : ''}`"
      @update:model-value="pagamentoEmEdicao = null"
    >
      <form class="flex flex-col gap-4" @submit.prevent="confirmarBaixa">
        <UiDatePicker v-model="dataDoPagamento" label="Pago em" />
        <UiSelect v-model="formaDoPagamento" label="Forma de pagamento" :options="opcoesForma" />

        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="outline" @click="pagamentoEmEdicao = null">Cancelar</UiButton>
          <UiButton type="submit">Confirmar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal
      :model-value="Boolean(agendamento)"
      title="Agendar pagamento"
      :description="`${agendamento?.despesa.descricao ?? ''} — ${agendamento ? formatCentsToBRL(agendamento.valor_centavos) : ''} sem data definida`"
      @update:model-value="agendamento = null"
    >
      <form class="flex flex-col gap-4" @submit.prevent="confirmarAgendamento">
        <UiInput v-model="quantidadeParcelas" label="Em quantas vezes" type="number" />
        <UiDatePicker v-model="primeiroVencimento" label="Primeiro vencimento" />

        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="outline" @click="agendamento = null">Cancelar</UiButton>
          <UiButton type="submit">Agendar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal
      :model-value="Boolean(paraExcluir)"
      title="Remover parcela"
      description="A parcela sai do cronograma. O gasto e o valor contratado continuam no orçamento — o saldo volta a aparecer como sem data."
      @update:model-value="paraExcluir = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="paraExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Remover</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
