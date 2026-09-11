<!--
  Pagamentos — a vida financeira do que já foi contratado.

  Aqui não se planeja: cada linha é um valor com data para sair, e a pergunta é
  sempre a mesma — o que já pagamos, o que vence, o que passou. Marcar pago
  acontece na própria linha, porque é a ação mais repetida do módulo.

  Gasto ainda em planejamento não aparece: não há o que pagar num valor que
  ninguém fechou. É a separação que esta tela existe para manter.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { ROTULOS_FORMA_PAGAMENTO, type FormaPagamento } from '#shared/schemas/finance'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { PagamentoListado } from '~/types/finance'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()
const base = `/admin/${slug}/financeiro`
const route = useRoute()
const router = useRouter()
const toast = useToast()

const { getPagamentos, atualizarParcela, excluirParcela } = useFinance()

type Filtro = 'todos' | 'pagos' | 'pendentes' | 'vencidos'

const filtro = computed<Filtro>(() => {
  const valor = route.query.filtro
  return valor === 'pagos' || valor === 'pendentes' || valor === 'vencidos' ? valor : 'todos'
})

const { data, status, error, refresh } = getPagamentos(filtro)

const hoje = hojeNoFusoDoEvento()
const pagamentos = computed(() => data.value?.data ?? [])

const FILTROS: Array<{ valor: Filtro; label: string }> = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'pendentes', label: 'Pendentes' },
  { valor: 'vencidos', label: 'Vencidos' },
  { valor: 'pagos', label: 'Pagos' },
]

function aplicarFiltro(valor: Filtro) {
  router.replace({ query: valor === 'todos' ? {} : { filtro: valor } })
}

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

/** "3 de 4" só faz sentido quando o gasto tem mais de uma parcela. */
function rotuloDaParcela(pagamento: PagamentoListado): string | null {
  const total = pagamentos.value.filter((p) => p.despesa.id === pagamento.despesa.id).length
  return total > 1 ? `${pagamento.numero} de ${total}` : null
}
</script>

<template>
  <AdminSection title="Pagamentos" description="O que já saiu, o que vence e o que está atrasado.">
    <template #actions>
      <UiButton variant="outline" :to="base">Ir para o orçamento</UiButton>
    </template>

    <UiSkeleton v-if="status === 'pending'" class="h-40 w-full" />

    <AdminPanel v-else-if="error">
      <div class="flex flex-col items-start gap-3 p-5">
        <p class="text-sm text-danger">Não foi possível carregar os pagamentos.</p>
        <UiButton variant="outline" size="sm" @click="refresh()">Tentar de novo</UiButton>
      </div>
    </AdminPanel>

    <template v-else-if="data">
      <!-- Os quatro números são sempre do conjunto inteiro, nunca do recorte:
           o total de vencidos não pode mudar porque alguém filtrou por "pagos". -->
      <dl
        class="grid grid-cols-2 gap-px overflow-clip rounded-lg border border-border bg-border lg:grid-cols-4"
      >
        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Pago</dt>
          <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums text-text">
            {{ formatCentsToBRL(data.resumo.pago.valor) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            {{ data.resumo.pago.quantidade }}
            {{ data.resumo.pago.quantidade === 1 ? 'parcela' : 'parcelas' }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">A pagar</dt>
          <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums text-text">
            {{ formatCentsToBRL(data.resumo.aPagar.valor) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            {{ data.resumo.aPagar.quantidade }}
            {{ data.resumo.aPagar.quantidade === 1 ? 'parcela' : 'parcelas' }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Vencidos</dt>
          <dd
            class="mt-0.5 font-display text-xl font-semibold tabular-nums"
            :class="data.resumo.vencidos.quantidade > 0 ? 'text-danger' : 'text-text'"
          >
            {{ formatCentsToBRL(data.resumo.vencidos.valor) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            {{ data.resumo.vencidos.quantidade }}
            {{ data.resumo.vencidos.quantidade === 1 ? 'parcela' : 'parcelas' }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-4 py-3.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
            Próximos 30 dias
          </dt>
          <dd
            class="mt-0.5 font-display text-xl font-semibold tabular-nums"
            :class="data.resumo.proximos30Dias.quantidade > 0 ? 'text-warning' : 'text-text'"
          >
            {{ formatCentsToBRL(data.resumo.proximos30Dias.valor) }}
          </dd>
          <dd class="mt-0.5 text-xs text-text-muted">
            {{ data.resumo.proximos30Dias.quantidade }}
            {{ data.resumo.proximos30Dias.quantidade === 1 ? 'parcela' : 'parcelas' }}
          </dd>
        </div>
      </dl>

      <div class="flex flex-wrap gap-2">
        <UiChip
          v-for="opcao in FILTROS"
          :key="opcao.valor"
          :label="opcao.label"
          clickable
          :selected="filtro === opcao.valor"
          @click="aplicarFiltro(opcao.valor)"
        />
      </div>

      <UiEmptyState
        v-if="pagamentos.length === 0"
        icon="lucide:receipt"
        :title="filtro === 'todos' ? 'Nenhum pagamento ainda' : 'Nada neste recorte'"
        :description="
          filtro === 'todos'
            ? 'Assim que um gasto tiver valor fechado e parcelas, ele aparece aqui com vencimento e estado.'
            : 'Nenhuma parcela corresponde a este filtro.'
        "
      >
        <UiButton v-if="filtro === 'todos'" :to="base">Ir para o orçamento</UiButton>
        <UiButton v-else variant="outline" @click="aplicarFiltro('todos')">Ver todos</UiButton>
      </UiEmptyState>

      <AdminPanel
        v-else
        :meta="`${pagamentos.length} ${pagamentos.length === 1 ? 'parcela' : 'parcelas'}`"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[40rem] text-sm">
            <thead>
              <tr class="border-b border-border text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" class="px-4 py-2.5 text-left font-medium sm:px-5">Estado</th>
                <th scope="col" class="px-4 py-2.5 text-left font-medium">Gasto</th>
                <th scope="col" class="px-4 py-2.5 text-left font-medium">Detalhes</th>
                <th scope="col" class="px-4 py-2.5 text-right font-medium">Valor</th>
                <th scope="col" class="w-px px-4 py-2.5 sm:px-5">
                  <span class="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="pagamento in pagamentos" :key="pagamento.id">
                <td class="px-4 py-3 sm:px-5">
                  <UiBadge :tone="situacaoParcelaPresentation(pagamento.situacao).tone">
                    {{ situacaoParcelaPresentation(pagamento.situacao).label }}
                  </UiBadge>
                </td>

                <th scope="row" class="px-4 py-3 text-left font-normal">
                  <span class="block truncate text-text">{{ pagamento.despesa.descricao }}</span>
                  <span class="block truncate text-xs text-text-muted">
                    <template v-if="pagamento.categoria">{{ pagamento.categoria.nome }}</template>
                    <template v-if="pagamento.categoria && pagamento.fornecedor"> · </template>
                    <template v-if="pagamento.fornecedor">{{ pagamento.fornecedor.nome }}</template>
                  </span>
                </th>

                <td class="px-4 py-3 text-xs text-text-muted">
                  <p v-if="pagamento.pago_em">
                    Pago em {{ formatarVencimento(pagamento.pago_em, hoje) }}
                    <template v-if="pagamento.forma_pagamento">
                      · {{ ROTULOS_FORMA_PAGAMENTO[pagamento.forma_pagamento as FormaPagamento] }}
                    </template>
                  </p>
                  <p>
                    Vence em {{ formatarVencimento(pagamento.vence_em, hoje) }}
                    <template v-if="rotuloDaParcela(pagamento)">
                      · {{ rotuloDaParcela(pagamento) }}
                    </template>
                  </p>
                </td>

                <td class="px-4 py-3 text-right font-medium tabular-nums text-text">
                  {{ formatCentsToBRL(pagamento.valor_centavos) }}
                </td>

                <td class="px-4 py-3 sm:px-5">
                  <div class="flex items-center justify-end gap-1">
                    <UiButton
                      v-if="!pagamento.pago_em"
                      size="sm"
                      variant="outline"
                      @click="abrirBaixa(pagamento)"
                    >
                      Marcar pago
                    </UiButton>
                    <UiButton v-else size="sm" variant="ghost" @click="desfazer(pagamento)">
                      Desfazer
                    </UiButton>
                    <AdminRowAction
                      icon="lucide:trash-2"
                      label="Remover parcela"
                      @click="paraExcluir = pagamento"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </AdminPanel>
    </template>

    <UiModal
      :model-value="Boolean(pagamentoEmEdicao)"
      title="Registrar pagamento"
      :description="`${pagamentoEmEdicao?.despesa.descricao} — ${pagamentoEmEdicao ? formatCentsToBRL(pagamentoEmEdicao.valor_centavos) : ''}`"
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
      :model-value="Boolean(paraExcluir)"
      title="Remover parcela"
      description="A parcela sai do cronograma de pagamentos. O gasto e o valor contratado continuam no orçamento."
      @update:model-value="paraExcluir = null"
    >
      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="paraExcluir = null">Cancelar</UiButton>
        <UiButton variant="destructive" @click="confirmarExclusao">Remover</UiButton>
      </div>
    </UiModal>
  </AdminSection>
</template>
