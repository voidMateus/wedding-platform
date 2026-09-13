<!--
  Como este dinheiro vai sair: entrada (opcional) + o restante.

  Entrada e forma do saldo são DUAS perguntas, não uma — "dei 10% para segurar a
  data" combina tanto com "o resto em maio" quanto com "o resto em 3x". Antes só
  existia parcelamento igual, e quem dava sinal criava as linhas na mão, uma a
  uma, em Pagamentos.

  O percentual é atalho de digitação, nunca o dado: o campo guarda CENTAVOS. Um
  contrato de R$ 7.333 com "10%" gravado obrigaria a decidir para que lado
  arredondar toda vez que alguém lesse a linha — e a entrada de verdade já saiu
  num valor exato.

  A prévia é gerada pelo MESMO `gerarParcelasComEntrada` que o servidor usa. Uma
  prévia calculada à parte é uma segunda implementação da regra, e é assim que
  tela e banco passam a discordar.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { formatDatePtBR } from '#shared/utils/format-date'
import { gerarParcelasComEntrada, percentualEmCentavos } from '#shared/utils/orcamento'
import type { ParcelamentoInput } from '#shared/schemas/finance'

interface Props {
  /** O total sobre o qual o plano incide — base dos percentuais e da prévia. */
  totalCentavos: number
  /** Data de referência para os campos nascerem preenchidos. */
  hoje: string
  /** Reinicia os campos quando o diálogo que contém isto reabre. */
  reiniciar: boolean
}

const { totalCentavos, hoje, reiniciar } = defineProps<Props>()

const emit = defineEmits<{
  /** `pronto` é falso quando falta preencher algo — quem submete decide o que fazer. */
  atualizar: [payload: { plano: ParcelamentoInput | undefined; pronto: boolean }]
}>()

const ATALHOS_DE_PERCENTUAL = [10, 20, 30, 50] as const

const modo = ref<'depois' | 'a_vista' | 'parcelado'>('depois')
const quantidade = ref('2')
const primeiroVencimento = ref('')
const temEntrada = ref(false)
const entradaValor = ref<number | null>(null)
const entradaVenceEm = ref('')

watch(
  () => reiniciar,
  (abriu) => {
    if (!abriu) return
    modo.value = 'depois'
    quantidade.value = '2'
    primeiroVencimento.value = hoje
    temEntrada.value = false
    entradaValor.value = null
    entradaVenceEm.value = hoje
  },
  { immediate: true },
)

const entrada = computed(() =>
  temEntrada.value && entradaValor.value && entradaValor.value > 0 && entradaVenceEm.value
    ? { valorCentavos: entradaValor.value, venceEm: entradaVenceEm.value }
    : null,
)

/** A entrada engoliu o contrato: não vai sobrar saldo para agendar. */
const entradaCobreTudo = computed(
  () => entrada.value !== null && entrada.value.valorCentavos >= totalCentavos,
)

const plano = computed<ParcelamentoInput | undefined>(() => {
  if (modo.value === 'depois') return { modo: 'depois' }
  if (modo.value === 'a_vista') {
    return { modo: 'a_vista', venceEm: primeiroVencimento.value, entrada: entrada.value }
  }
  return {
    modo: 'parcelado',
    quantidade: Number(quantidade.value),
    primeiroVencimento: primeiroVencimento.value,
    entrada: entrada.value,
  }
})

const pronto = computed(() => {
  if (temEntrada.value && !entrada.value) return false
  if (modo.value === 'depois') return true
  if (!primeiroVencimento.value) return false
  return modo.value !== 'parcelado' || Number(quantidade.value) >= 2
})

watch(
  [plano, pronto],
  () => {
    emit('atualizar', {
      plano: modo.value === 'depois' ? undefined : plano.value,
      pronto: pronto.value,
    })
  },
  { immediate: true },
)

/**
 * A prévia — o que o casal vai encontrar em Pagamentos, calculado pelo mesmo
 * gerador do servidor.
 */
const previa = computed(() => {
  if (modo.value === 'depois' || totalCentavos <= 0 || !primeiroVencimento.value) return ''

  const parcelas = gerarParcelasComEntrada(
    totalCentavos,
    entrada.value,
    modo.value === 'a_vista'
      ? { quantidade: 1, primeiroVencimento: primeiroVencimento.value }
      : {
          quantidade: Math.max(1, Number(quantidade.value) || 1),
          primeiroVencimento: primeiroVencimento.value,
        },
  )
  if (parcelas.length === 0) return ''

  const partes: string[] = []
  const saldo = entrada.value ? parcelas.slice(1) : parcelas

  if (entrada.value && parcelas[0]) {
    partes.push(
      `entrada de ${formatCentsToBRL(parcelas[0].valor_centavos)} em ${formatDatePtBR(parcelas[0].vence_em)}`,
    )
  }

  if (saldo.length === 1 && saldo[0]) {
    partes.push(
      `${formatCentsToBRL(saldo[0].valor_centavos)} em ${formatDatePtBR(saldo[0].vence_em)}`,
    )
  } else if (saldo.length > 1 && saldo[0]) {
    partes.push(
      `${saldo.length}x de aproximadamente ${formatCentsToBRL(saldo[0].valor_centavos)}, a partir de ${formatDatePtBR(saldo[0].vence_em)}`,
    )
  }

  return partes.join(', depois ')
})

function aplicarPercentual(percentual: number) {
  entradaValor.value = percentualEmCentavos(totalCentavos, percentual)
  if (!entradaVenceEm.value) entradaVenceEm.value = hoje
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- A entrada vem ANTES do resto porque é o que acontece primeiro na vida
         real: o sinal segura a data, e só então se combina o saldo. -->
    <UiCheckbox v-model="temEntrada" label="Teve entrada (sinal)" />

    <div v-if="temEntrada" class="flex flex-col gap-2 border-l-2 border-border pl-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiCurrencyInput v-model="entradaValor" label="Valor da entrada" />
        <UiDatePicker v-model="entradaVenceEm" label="Entrada paga em" />
      </div>

      <div v-if="totalCentavos > 0" class="flex flex-wrap items-center gap-1.5">
        <span class="text-xs text-text-muted">Atalhos:</span>
        <button
          v-for="percentual in ATALHOS_DE_PERCENTUAL"
          :key="percentual"
          type="button"
          class="rounded-md border border-border px-2 py-0.5 text-xs text-text-muted transition-brand hover:border-primary/40 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="aplicarPercentual(percentual)"
        >
          {{ percentual }}%
        </button>
      </div>

      <p v-if="entradaCobreTudo" class="text-xs text-warning">
        A entrada cobre o valor inteiro — não vai sobrar saldo para agendar.
      </p>
    </div>

    <UiSelect
      v-model="modo"
      :label="temEntrada ? 'Como vai pagar o restante' : 'Como vai pagar'"
      :options="[
        { value: 'depois', label: 'Defino depois' },
        { value: 'a_vista', label: 'Numa data só' },
        { value: 'parcelado', label: 'Parcelado' },
      ]"
    />

    <div v-if="modo !== 'depois'" class="grid gap-4 sm:grid-cols-2">
      <UiInput v-if="modo === 'parcelado'" v-model="quantidade" label="Parcelas" type="number" />
      <UiDatePicker
        v-model="primeiroVencimento"
        :label="modo === 'a_vista' ? 'Vencimento' : 'Primeiro vencimento'"
      />
    </div>

    <!-- Prévia e não só um total: a soma das parcelas PODE divergir do valor
         fechado, e é regra do módulo exibir a divergência em vez de bloqueá-la.
         Ver o plano antes de confirmar é a chance de perceber. -->
    <p v-if="previa" class="text-xs text-text-muted">Vai virar: {{ previa }}.</p>
  </div>
</template>
