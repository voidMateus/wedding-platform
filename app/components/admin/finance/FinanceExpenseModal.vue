<!--
  Cadastro e edição de despesa.

  O parcelamento só aparece na CRIAÇÃO: mudar o parcelamento de uma despesa que
  já tem parcela paga é renegociação, e isso acontece na própria linha da
  despesa (que sabe o que já foi pago), nunca escondido num formulário de
  edição que reescreveria o histórico.

  "Defino depois" é um caminho completo, não um estado incompleto: "fechei o
  buffet, o pagamento a gente combina" é o começo normal de uma despesa.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import type { ExpenseInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento, DespesaComParcelas, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  despesa?: DespesaComParcelas | null
  categorias: CategoriaOrcamento[]
  fornecedores: FornecedorComSituacao[]
  /** Categoria pré-selecionada quando o cadastro nasce dentro de uma categoria. */
  categoriaPadrao?: string | null
}

const {
  modelValue,
  despesa = null,
  categorias,
  fornecedores,
  categoriaPadrao = null,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: ExpenseInput]
}>()

const descricao = ref('')
const valorCentavos = ref<number | null>(null)
const categoriaId = ref('')
const fornecedorId = ref('')
const observacao = ref('')
const modoParcelamento = ref<'depois' | 'a_vista' | 'parcelado'>('depois')
const quantidadeParcelas = ref('2')
const primeiroVencimento = ref('')
const erro = ref('')
const salvando = ref(false)

const editando = computed(() => Boolean(despesa))

const opcoesCategoria = computed(() => [
  { value: '', label: 'Sem categoria' },
  ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
])

const opcoesFornecedor = computed(() => [
  { value: '', label: 'Sem fornecedor' },
  ...fornecedores.map((fornecedor) => ({ value: fornecedor.id, label: fornecedor.nome })),
])

const opcoesParcelamento = [
  { value: 'depois', label: 'Defino depois' },
  { value: 'a_vista', label: 'À vista' },
  { value: 'parcelado', label: 'Parcelado' },
]

const previaDaParcela = computed(() => {
  const total = valorCentavos.value ?? 0
  const quantidade = Number(quantidadeParcelas.value)
  if (modoParcelamento.value !== 'parcelado' || total <= 0 || quantidade < 2) return ''
  return `${quantidade}x de aproximadamente ${formatCentsToBRL(Math.floor(total / quantidade))}`
})

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    descricao.value = despesa?.descricao ?? ''
    valorCentavos.value = despesa?.valor_centavos ?? null
    categoriaId.value = despesa?.categoria_id ?? categoriaPadrao ?? ''
    fornecedorId.value = despesa?.fornecedor_id ?? ''
    observacao.value = despesa?.observacao ?? ''
    modoParcelamento.value = 'depois'
    quantidadeParcelas.value = '2'
    primeiroVencimento.value = hojeNoFusoDoEvento()
  },
)

function montarParcelamento(): ExpenseInput['parcelamento'] {
  if (editando.value || modoParcelamento.value === 'depois') return undefined
  if (modoParcelamento.value === 'a_vista') {
    return { modo: 'a_vista', venceEm: primeiroVencimento.value }
  }
  return {
    modo: 'parcelado',
    quantidade: Number(quantidadeParcelas.value),
    primeiroVencimento: primeiroVencimento.value,
  }
}

async function submeter() {
  erro.value = ''
  if (!descricao.value.trim()) {
    erro.value = 'Descreva a despesa.'
    return
  }
  if (valorCentavos.value === null) {
    erro.value = 'Informe o valor da despesa.'
    return
  }
  if (modoParcelamento.value !== 'depois' && !editando.value && !primeiroVencimento.value) {
    erro.value = 'Informe a data de vencimento.'
    return
  }

  salvando.value = true
  try {
    emit('salvar', {
      descricao: descricao.value.trim(),
      valorCentavos: valorCentavos.value,
      categoriaId: categoriaId.value || null,
      fornecedorId: fornecedorId.value || null,
      observacao: observacao.value.trim() || null,
      parcelamento: montarParcelamento(),
    })
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="editando ? 'Editar despesa' : 'Nova despesa'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <UiInput v-model="descricao" label="Descrição" placeholder="Buffet — 120 pessoas" />
      <UiCurrencyInput v-model="valorCentavos" label="Valor contratado" />

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="categoriaId" label="Categoria" :options="opcoesCategoria" />
        <UiSelect v-model="fornecedorId" label="Fornecedor" :options="opcoesFornecedor" />
      </div>

      <template v-if="!editando">
        <UiSelect
          v-model="modoParcelamento"
          label="Como vai pagar"
          :options="opcoesParcelamento"
          hint="Dá para definir depois — a despesa existe mesmo sem parcelas."
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
      </template>

      <UiTextarea v-model="observacao" label="Observação" :rows="2" />

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>

      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" :disabled="salvando" @click="emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="salvando">
          {{ editando ? 'Salvar' : 'Adicionar despesa' }}
        </UiButton>
      </div>
    </form>
  </UiModal>
</template>
