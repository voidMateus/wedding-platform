<!--
  Cadastrar um gasto — três campos, e só.

  Tinha sete: custo estimado, valor fechado, categoria, fornecedor, como vai
  pagar, quantas parcelas, observação. Sete campos para dizer "quero registrar
  que vou ter um bolo" é um pedágio, e planejar é justamente o gesto que se
  repete trinta vezes.

  O que saiu, e para onde:

  - **Valor fechado e parcelamento** → "Registrar valor fechado", no menu da
    linha e na ficha. Preencher o custo final é o gesto que transforma plano em
    compromisso; ele tem ação própria, com a própria janela, e não precisava de
    um atalho escondido dentro do cadastro.
  - **Fornecedor e observação** → a ficha do gasto, onde já se editam no lugar.

  O caminho principal de planejamento nem passa por aqui: é a lista de gastos
  dentro da categoria, em Categorias, que se edita sem abrir nada. Este modal é
  o atalho de quem já sabe exatamente o que quer acrescentar.
-->
<script setup lang="ts">
import type { ExpenseInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento } from '~/types/finance'

interface Props {
  modelValue: boolean
  categorias: CategoriaOrcamento[]
  /** Categoria pré-selecionada quando o gasto nasce dentro de uma categoria. */
  categoriaPadrao?: string | null
}

const { modelValue, categorias, categoriaPadrao = null } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: ExpenseInput]
}>()

const descricao = ref('')
const valorEstimado = ref<number | null>(null)
const categoriaId = ref('')
const erro = ref('')
const salvando = ref(false)

const opcoesCategoria = computed(() => [
  { value: '', label: 'Sem categoria' },
  ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
])

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    descricao.value = ''
    valorEstimado.value = null
    categoriaId.value = categoriaPadrao ?? ''
  },
)

async function submeter() {
  erro.value = ''
  if (!descricao.value.trim()) {
    erro.value = 'Descreva o gasto.'
    return
  }

  salvando.value = true
  try {
    emit('salvar', {
      descricao: descricao.value.trim(),
      // Zero, nunca nulo: o schema exige estimado ou fechado, e zero é um
      // estado que o casal quer poder declarar — "vou ter, ainda não sei
      // quanto". É a mesma regra da edição no lugar.
      valorEstimadoCentavos: valorEstimado.value ?? 0,
      valorCentavos: null,
      categoriaId: categoriaId.value || null,
      fornecedorId: null,
      observacao: null,
    })
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Novo gasto"
    description="O valor fechado e o fornecedor entram depois, quando vocês contratarem."
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <UiInput v-model="descricao" label="Gasto" placeholder="Buffet — 120 pessoas" />
      <div class="grid gap-4 sm:grid-cols-2">
        <UiCurrencyInput v-model="valorEstimado" label="Custo estimado" />
        <UiSelect v-model="categoriaId" label="Categoria" :options="opcoesCategoria" />
      </div>
      <p v-if="erro" class="text-sm text-danger" role="alert">{{ erro }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" :disabled="salvando" @click="emit('update:modelValue', false)">
        Cancelar
      </UiButton>
      <UiButton :disabled="salvando" @click="submeter">Adicionar gasto</UiButton>
    </template>
  </UiModal>
</template>
