<!--
  Contratar: o momento em que a cotação vira compromisso.

  É a ponte entre as três telas. O casal escolhe a qual gasto PLANEJADO aquela
  proposta corresponde, confirma o valor fechado e diz como vai pagar — e, a
  partir daí, o gasto conta como contratado no Orçamento e as parcelas existem
  em Pagamentos.

  A lista oferece primeiro os gastos ainda sem valor fechado: contratar é
  justamente preencher um deles.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { VendorContractInput } from '#shared/schemas/finance'
import type { DespesaComParcelas, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  fornecedor: FornecedorComSituacao | null
  despesas: DespesaComParcelas[]
  /** Gasto já escolhido — quando a contratação começa pela linha dele no Orçamento. */
  despesaPadrao?: string | null
}

const { modelValue, fornecedor, despesas, despesaPadrao = null } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  contratar: [input: VendorContractInput]
  criarGasto: []
}>()

const despesaId = ref('')
const valor = ref<number | null>(null)
const modoParcelamento = ref<'depois' | 'a_vista' | 'parcelado'>('depois')
const quantidadeParcelas = ref('2')
const primeiroVencimento = ref('')
const erro = ref('')

/** Sem valor fechado primeiro: é o que se está contratando agora. */
const opcoesDespesa = computed(() => {
  const semContrato = despesas.filter((despesa) => despesa.valor_centavos === null)
  const comContrato = despesas.filter((despesa) => despesa.valor_centavos !== null)
  const rotular = (despesa: DespesaComParcelas) => {
    const categoria = despesa.categoria ? `${despesa.categoria.nome} · ` : ''
    const estimado =
      despesa.totais.estimado > 0 ? ` (${formatCentsToBRL(despesa.totais.estimado)})` : ''
    return { value: despesa.id, label: `${categoria}${despesa.descricao}${estimado}` }
  }
  return [...semContrato.map(rotular), ...comContrato.map(rotular)]
})

const despesaEscolhida = computed(() => despesas.find((despesa) => despesa.id === despesaId.value))

const previaDaParcela = computed(() => {
  const total = valor.value ?? 0
  const quantidade = Number(quantidadeParcelas.value)
  if (modoParcelamento.value !== 'parcelado' || total <= 0 || quantidade < 2) return ''
  return `${quantidade}x de aproximadamente ${formatCentsToBRL(Math.floor(total / quantidade))}`
})

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    despesaId.value = despesaPadrao ?? ''
    // A cotação é a melhor sugestão de valor que existe — e continua editável,
    // porque o preço fechado costuma diferir da proposta.
    valor.value = fornecedor?.valor_proposto_centavos ?? null
    modoParcelamento.value = 'depois'
    quantidadeParcelas.value = '2'
    primeiroVencimento.value = hojeNoFusoDoEvento()
  },
)

// Escolher o gasto sem valor sugere a estimativa dele quando não há cotação.
watch(despesaEscolhida, (despesa) => {
  if (valor.value === null && despesa) {
    valor.value = despesa.totais.estimado || null
  }
})

function submeter() {
  erro.value = ''
  if (!despesaId.value) {
    erro.value = 'Escolha a qual gasto esta contratação corresponde.'
    return
  }
  if (valor.value === null) {
    erro.value = 'Informe o valor fechado.'
    return
  }
  if (modoParcelamento.value !== 'depois' && !primeiroVencimento.value) {
    erro.value = 'Informe a data de vencimento.'
    return
  }

  emit('contratar', {
    despesaId: despesaId.value,
    valorCentavos: valor.value,
    parcelamento:
      modoParcelamento.value === 'depois'
        ? undefined
        : modoParcelamento.value === 'a_vista'
          ? { modo: 'a_vista', venceEm: primeiroVencimento.value }
          : {
              modo: 'parcelado',
              quantidade: Number(quantidadeParcelas.value),
              primeiroVencimento: primeiroVencimento.value,
            },
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="fornecedor ? `Contratar ${fornecedor.nome}` : 'Registrar contratação'"
    description="O valor fechado entra no orçamento como custo real, e o pagamento passa a aparecer em Pagamentos."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <template v-if="opcoesDespesa.length > 0">
        <UiSelect
          v-model="despesaId"
          label="Qual gasto?"
          :options="opcoesDespesa"
          placeholder="Escolha o gasto planejado"
          hint="É o gasto do orçamento que esta contratação preenche."
        />
        <p
          v-if="despesaEscolhida && despesaEscolhida.valor_centavos !== null"
          class="-mt-2 text-xs text-warning"
        >
          Este gasto já tem valor fechado ({{ formatCentsToBRL(despesaEscolhida.valor_centavos) }})
          — contratar de novo substitui o valor e as parcelas em aberto.
        </p>
      </template>

      <div v-else class="rounded-lg border border-dashed border-border px-4 py-5 text-center">
        <p class="text-sm text-text">Nenhum gasto no orçamento ainda.</p>
        <p class="mt-1 text-xs text-text-muted">
          Contratar preenche um gasto planejado — crie o gasto primeiro.
        </p>
        <UiButton size="sm" variant="outline" class="mt-3" @click="emit('criarGasto')">
          Criar gasto
        </UiButton>
      </div>

      <template v-if="opcoesDespesa.length > 0">
        <UiCurrencyInput v-model="valor" label="Valor fechado" />

        <UiSelect
          v-model="modoParcelamento"
          label="Como vai pagar"
          :options="[
            { value: 'depois', label: 'Defino depois' },
            { value: 'a_vista', label: 'À vista' },
            { value: 'parcelado', label: 'Parcelado' },
          ]"
        />

        <div v-if="modoParcelamento !== 'depois'" class="grid gap-4 sm:grid-cols-2">
          <UiInput
            v-if="modoParcelamento === 'parcelado'"
            v-model="quantidadeParcelas"
            label="Parcelas"
            type="number"
            :hint="previaDaParcela"
          />
          <UiDatePicker
            v-model="primeiroVencimento"
            :label="modoParcelamento === 'a_vista' ? 'Vencimento' : 'Primeiro vencimento'"
          />
        </div>

        <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>

        <div class="flex flex-wrap justify-end gap-2">
          <UiButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</UiButton>
          <UiButton type="submit">Confirmar contratação</UiButton>
        </div>
      </template>
    </form>
  </UiModal>
</template>
