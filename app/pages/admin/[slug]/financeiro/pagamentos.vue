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

// O gasto vem primeiro e o vencimento tem coluna própria: numa tela cujo
// assunto é "o que vence e o que está atrasado", a data era um texto de 12px
// dentro de uma coluna chamada "Detalhes" — rótulo que não diz nada.
const colunas = computed<AdminTableColumn<PagamentoListado>[]>(() => [
  {
    key: 'gasto',
    label: 'Gasto',
    filter: { type: 'text', placeholder: 'Buscar gasto ou fornecedor' },
  },
  { key: 'vencimento', label: 'Vencimento', sort: 'date' },
  { key: 'valor', label: 'Valor', align: 'right', sort: 'numeric' },
  {
    key: 'situacao',
    label: 'Estado',
    filter: { type: 'select', multiple: true, options: [...SITUACOES] },
  },
  { key: 'acoes', label: 'Ações', labelHidden: true, align: 'right' },
])

const acessores: Record<string, ClientColumn<PagamentoListado>> = {
  gasto: {
    value: (pagamento) => [pagamento.despesa.descricao, pagamento.fornecedor?.nome ?? ''],
    compare: compareText((pagamento) => pagamento.despesa.descricao),
  },
  // Sem data ordena por último nos dois sentidos seria mentira de ordenação;
  // aqui ela vai para o fim do crescente, que é onde "ainda não decidido"
  // pertence numa linha do tempo.
  vencimento: { compare: compareText((pagamento) => pagamento.vence_em ?? '9999-12-31') },
  valor: { compare: compareNumber((pagamento) => pagamento.valor_centavos) },
  situacao: { value: (pagamento) => pagamento.situacao },
}

const filters = useTableFilters(colunas)

const linhasFiltradas = computed(() =>
  applyTableFilters(pagamentos.value, colunas.value, acessores, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

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

/**
 * Dois níveis, não cinco números iguais.
 *
 * Em cima, o que pede decisão nesta semana — vencido, vencendo, e o
 * contratado que ninguém agendou. Embaixo, o acumulado, que é contexto e não
 * muda o que o casal faz hoje. Com os cinco no mesmo tamanho, "Pago" disputava
 * atenção com "Vencidos", e só a cor do número os separava.
 */
const atencao = computed(() => {
  const resumo = data.value?.resumo
  if (!resumo) return []
  return [
    {
      chave: 'vencidos',
      label: 'Vencidos',
      bloco: resumo.vencidos,
      tone: resumo.vencidos.quantidade > 0 ? 'text-danger' : 'text-text',
      destacado: resumo.vencidos.quantidade > 0,
    },
    {
      chave: 'proximos',
      label: 'Próximos 30 dias',
      bloco: resumo.proximos30Dias,
      tone: resumo.proximos30Dias.quantidade > 0 ? 'text-warning' : 'text-text',
      destacado: false,
    },
    {
      chave: 'sem-data',
      label: 'Sem data',
      bloco: resumo.semData,
      tone: resumo.semData.quantidade > 0 ? 'text-warning' : 'text-text',
      destacado: false,
    },
  ]
})

const acumulado = computed(() => {
  const resumo = data.value?.resumo
  if (!resumo) return []
  return [
    { chave: 'pago', label: 'Pago', bloco: resumo.pago },
    { chave: 'a-pagar', label: 'A pagar', bloco: resumo.aPagar },
  ]
})

function rotuloDeLancamentos(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'lançamento' : 'lançamentos'}`
}
</script>

<template>
  <!-- Sem CTA no cabeçalho: aqui não se cria lançamento, ele nasce de uma
       contratação no Orçamento. O menu da seção já diz onde estamos e leva de
       volta — o link "Ir para o orçamento" ocupava a posição do CTA primário
       para repetir o que a navegação já faz. -->
  <AdminSection title="Pagamentos" description="O que já saiu, o que vence e o que está atrasado.">
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
      <div class="flex flex-col gap-px overflow-clip rounded-lg border border-border bg-border">
        <dl class="grid grid-cols-1 gap-px bg-border sm:grid-cols-3">
          <div
            v-for="indicador in atencao"
            :key="indicador.chave"
            class="bg-surface-elevated px-4 py-3.5"
          >
            <dt
              class="text-xs font-semibold uppercase tracking-wide"
              :class="indicador.destacado ? 'text-danger' : 'text-text'"
            >
              {{ indicador.label }}
            </dt>
            <dd class="num mt-0.5 text-2xl font-semibold" :class="indicador.tone">
              {{ formatCentsToBRL(indicador.bloco.valor) }}
            </dd>
            <dd class="mt-0.5 text-xs text-text-muted">
              {{ rotuloDeLancamentos(indicador.bloco.quantidade) }}
            </dd>
          </div>
        </dl>

        <!-- O acumulado é uma linha de rodapé, não mais dois cartões: em cartão
             ele repetia o peso dos de cima e ainda desalinhava as réguas, por
             serem três colunas contra duas. -->
        <dl class="flex flex-wrap items-baseline gap-x-6 gap-y-1 bg-surface-elevated px-4 py-2.5">
          <div
            v-for="indicador in acumulado"
            :key="indicador.chave"
            class="flex items-baseline gap-1.5"
          >
            <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
              {{ indicador.label }}
            </dt>
            <dd class="num text-sm font-medium text-text">
              {{ formatCentsToBRL(indicador.bloco.valor) }}
            </dd>
            <dd class="text-xs text-text-muted">
              · {{ rotuloDeLancamentos(indicador.bloco.quantidade) }}
            </dd>
          </div>
        </dl>
      </div>

      <AdminPanel title="Lançamentos" :meta="`${linhasFiltradas.length} de ${pagamentos.length}`">
        <template #headerActions>
          <AdminTableFilterBar
            :filters="filters"
            :columns="colunas"
            group-label="Filtros de pagamentos"
          />
        </template>

        <AdminTable
          :columns="colunas"
          :rows="linhasFiltradas"
          :filters="filters"
          empty-label="Nenhum lançamento com esses filtros."
        >
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

          <!-- A data em 14px e sem a palavra "Vence em" repetida linha a linha:
               o cabeçalho da coluna já disse o que ela é. Embaixo fica só o que
               varia — a parcela, ou a forma de pagamento do que já saiu. -->
          <template #cell-vencimento="{ row }">
            <div class="min-w-0">
              <span v-if="row.vence_em" class="num block text-sm text-text">
                {{ formatarVencimento(row.vence_em, hoje) }}
              </span>
              <span v-else class="block text-sm text-text-muted">Sem data</span>
              <span v-if="row.pago_em" class="block truncate text-xs text-text-muted">
                pago em {{ formatarVencimento(row.pago_em, hoje) }}
                <template v-if="row.forma_pagamento">
                  · {{ ROTULOS_FORMA_PAGAMENTO[row.forma_pagamento as FormaPagamento] }}
                </template>
              </span>
              <span
                v-else-if="row.vence_em && row.totalDeParcelas > 1"
                class="block text-xs text-text-muted"
              >
                parcela {{ row.numero }} de {{ row.totalDeParcelas }}
              </span>
              <span v-else-if="!row.vence_em" class="block text-xs text-text-muted">
                contratado, falta definir
              </span>
            </div>
          </template>

          <template #cell-valor="{ row }">
            <span class="num font-medium text-text">
              {{ formatCentsToBRL(row.valor_centavos) }}
            </span>
          </template>

          <template #cell-situacao="{ row }">
            <UiBadge :tone="situacaoParcelaPresentation(row.situacao).tone">
              {{ situacaoParcelaPresentation(row.situacao).label }}
            </UiBadge>
          </template>

          <!-- Só "Agendar" fica em `outline`: é o furo que esta tela existe
               para fechar. "Marcar pago" em ghost porque aparece em quase toda
               linha — com borda na cor do tema, a coluna de ações virava a
               coisa mais colorida da página. -->
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
              <UiButton v-else-if="!row.pago_em" size="sm" variant="ghost" @click="abrirBaixa(row)">
                Marcar pago
              </UiButton>
              <AdminRowAction
                v-else
                icon="lucide:undo-2"
                label="Desfazer pagamento"
                @click="desfazer(row)"
              />
              <!-- Desabilitado, não escondido: a linha sem parcela não tem o
                   que remover, e sumir com o ícone na ponta deixava a borda
                   direita da tabela serrilhada, linha a linha. -->
              <AdminRowAction
                icon="lucide:trash-2"
                :label="
                  row.tipo === 'parcela' ? 'Remover parcela' : 'Sem parcela para remover ainda'
                "
                :disabled="row.tipo !== 'parcela'"
                tone="danger"
                @click="paraExcluir = row"
              />
            </div>
          </template>

          <template #stacked="{ row }">
            <div class="flex flex-col gap-1 px-4 py-3">
              <div class="flex flex-wrap items-center gap-2">
                <UiBadge :tone="situacaoParcelaPresentation(row.situacao).tone">
                  {{ situacaoParcelaPresentation(row.situacao).label }}
                </UiBadge>
                <span class="font-medium text-text">{{ row.despesa.descricao }}</span>
              </div>
              <span class="num text-sm text-text">
                {{ formatCentsToBRL(row.valor_centavos) }}
                <template v-if="row.vence_em">
                  · vence em {{ formatarVencimento(row.vence_em, hoje) }}
                </template>
                <template v-else>· sem data definida</template>
              </span>
              <div class="mt-1 flex items-center gap-2">
                <UiButton
                  v-if="row.tipo === 'a_definir'"
                  variant="outline"
                  @click="abrirAgendamento(row)"
                >
                  Agendar
                </UiButton>
                <UiButton v-else-if="!row.pago_em" variant="outline" @click="abrirBaixa(row)">
                  Marcar pago
                </UiButton>
                <UiButton v-else variant="ghost" @click="desfazer(row)">Desfazer</UiButton>
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
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="pagamentoEmEdicao = null">Cancelar</UiButton>
        <UiButton @click="confirmarBaixa">Confirmar</UiButton>
      </template>
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
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="agendamento = null">Cancelar</UiButton>
        <UiButton @click="confirmarAgendamento">Agendar</UiButton>
      </template>
    </UiModal>

    <UiModal
      :model-value="Boolean(paraExcluir)"
      title="Remover parcela"
      description="A parcela sai do cronograma. O gasto e o valor contratado continuam no orçamento — o saldo volta a aparecer como sem data."
      @update:model-value="paraExcluir = null"
    >
      <template #footer>
        <UiButton variant="ghost" @click="paraExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Remover</UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
