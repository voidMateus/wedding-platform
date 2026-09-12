<!--
  Cadastro e edição de um gasto.

  Dois valores, de momentos diferentes: o CUSTO ESTIMADO é o do planejamento
  ("acho que o buffet sai por 12 mil") e o VALOR FECHADO é o do contrato. O
  segundo fica vazio até existir contrato — e é justamente esse vazio que faz o
  gasto aparecer como "a contratar" no orçamento em vez de virar compromisso
  antes da hora.

  Parcelamento só aparece quando há valor fechado: agendar a saída de uma
  estimativa colocaria em Pagamentos um dinheiro que ninguém prometeu pagar.
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
  /** Categoria pré-selecionada quando o gasto nasce dentro de uma categoria. */
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
const valorEstimado = ref<number | null>(null)
const valorFechado = ref<number | null>(null)
const categoriaId = ref('')
const fornecedorId = ref('')
const observacao = ref('')
const modoParcelamento = ref<'depois' | 'a_vista' | 'parcelado'>('depois')
const quantidadeParcelas = ref('2')
const primeiroVencimento = ref('')
const erro = ref('')
const salvando = ref(false)

const editando = computed(() => Boolean(despesa))
const temValorFechado = computed(() => valorFechado.value !== null && valorFechado.value > 0)

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
  const total = valorFechado.value ?? 0
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
    valorEstimado.value = despesa?.valor_estimado_centavos ?? null
    valorFechado.value = despesa?.valor_centavos ?? null
    categoriaId.value = despesa?.categoria_id ?? categoriaPadrao ?? ''
    fornecedorId.value = despesa?.fornecedor_id ?? ''
    observacao.value = despesa?.observacao ?? ''
    modoParcelamento.value = 'depois'
    quantidadeParcelas.value = '2'
    primeiroVencimento.value = hojeNoFusoDoEvento()
  },
)

function montarParcelamento(): ExpenseInput['parcelamento'] {
  if (editando.value || !temValorFechado.value || modoParcelamento.value === 'depois') {
    return undefined
  }
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
    erro.value = 'Descreva o gasto.'
    return
  }
  if (valorEstimado.value === null && valorFechado.value === null) {
    erro.value = 'Informe o custo estimado ou o valor já fechado.'
    return
  }
  if (
    temValorFechado.value &&
    modoParcelamento.value !== 'depois' &&
    !editando.value &&
    !primeiroVencimento.value
  ) {
    erro.value = 'Informe a data de vencimento.'
    return
  }

  salvando.value = true
  try {
    emit('salvar', {
      descricao: descricao.value.trim(),
      valorEstimadoCentavos: valorEstimado.value,
      valorCentavos: valorFechado.value,
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
    :title="editando ? 'Editar gasto' : 'Novo gasto'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <UiInput v-model="descricao" label="Gasto" placeholder="Buffet — 120 pessoas" />

      <div class="grid gap-4 sm:grid-cols-2">
        <UiCurrencyInput
          v-model="valorEstimado"
          label="Custo estimado"
          hint="O quanto vocês imaginam gastar."
        />
        <UiCurrencyInput
          v-model="valorFechado"
          label="Valor fechado"
          hint="Só depois de contratar."
        />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="categoriaId" label="Categoria" :options="opcoesCategoria" />
        <UiSelect v-model="fornecedorId" label="Fornecedor" :options="opcoesFornecedor" />
      </div>

      <template v-if="!editando && temValorFechado">
        <UiSelect
          v-model="modoParcelamento"
          label="Como vai pagar"
          :options="opcoesParcelamento"
          hint="Dá para definir depois — em Pagamentos."
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
    </form>

    <template #footer>
      <UiButton variant="ghost" :disabled="salvando" @click="emit('update:modelValue', false)">
        Cancelar
      </UiButton>
      <UiButton :disabled="salvando" @click="submeter">
        {{ editando ? 'Salvar' : 'Adicionar gasto' }}
      </UiButton>
    </template>
  </UiModal>
</template>
