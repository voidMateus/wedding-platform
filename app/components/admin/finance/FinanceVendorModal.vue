<!--
  Cadastro de fornecedor: contato, estágio e COTAÇÃO.

  A cotação não entra em nenhum total — três buffets concorrentes na mesma
  categoria somariam três vezes o mesmo gasto. O compromisso de verdade é uma
  despesa, e o formulário diz isso em vez de deixar o casal descobrir depois.
-->
<script setup lang="ts">
import { ESTAGIOS_FORNECEDOR, ROTULOS_ESTAGIO_FORNECEDOR } from '#shared/schemas/finance'
import type { EstagioFornecedor, VendorInput } from '#shared/schemas/finance'
import type { CategoriaOrcamento, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  fornecedor?: FornecedorComSituacao | null
  categorias: CategoriaOrcamento[]
}

const { modelValue, fornecedor = null, categorias } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  salvar: [input: VendorInput]
}>()

const nome = ref('')
const categoriaId = ref('')
const estagio = ref<EstagioFornecedor>('pesquisando')
const valorProposto = ref<number | null>(null)
const nomeContato = ref('')
const telefone = ref('')
const email = ref('')
const siteUrl = ref('')
const observacao = ref('')
const erro = ref('')

const editando = computed(() => Boolean(fornecedor))

const opcoesCategoria = computed(() => [
  { value: '', label: 'Sem categoria' },
  ...categorias.map((categoria) => ({ value: categoria.id, label: categoria.nome })),
])

const opcoesEstagio = ESTAGIOS_FORNECEDOR.map((valor) => ({
  value: valor,
  label: ROTULOS_ESTAGIO_FORNECEDOR[valor],
}))

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    nome.value = fornecedor?.nome ?? ''
    categoriaId.value = fornecedor?.categoria_id ?? ''
    estagio.value = (fornecedor?.estagio as EstagioFornecedor) ?? 'pesquisando'
    valorProposto.value = fornecedor?.valor_proposto_centavos ?? null
    nomeContato.value = fornecedor?.nome_contato ?? ''
    telefone.value = fornecedor?.telefone ?? ''
    email.value = fornecedor?.email ?? ''
    siteUrl.value = fornecedor?.site_url ?? ''
    observacao.value = fornecedor?.observacao ?? ''
  },
)

function submeter() {
  if (!nome.value.trim()) {
    erro.value = 'Informe o nome do fornecedor.'
    return
  }

  emit('salvar', {
    nome: nome.value.trim(),
    categoriaId: categoriaId.value || null,
    estagio: estagio.value,
    valorPropostoCentavos: valorProposto.value,
    nomeContato: nomeContato.value.trim() || null,
    telefone: telefone.value.trim() || null,
    email: email.value.trim(),
    siteUrl: siteUrl.value.trim(),
    observacao: observacao.value.trim() || null,
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="editando ? 'Editar fornecedor' : 'Novo fornecedor'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="nome" label="Nome" placeholder="Buffet Recanto" />
        <UiSelect v-model="categoriaId" label="Categoria" :options="opcoesCategoria" />
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="estagio" label="Estágio" :options="opcoesEstagio" />
        <UiCurrencyInput v-model="valorProposto" label="Cotação" />
      </div>

      <p class="text-xs text-text-muted">
        A cotação serve para comparar propostas — ela não entra no orçamento. O valor fechado vira
        uma despesa.
      </p>

      <div class="grid gap-4 sm:grid-cols-2">
        <UiInput v-model="nomeContato" label="Pessoa de contato" />
        <UiInput v-model="telefone" label="Telefone" type="tel" />
        <UiInput v-model="email" label="E-mail" type="email" />
        <UiInput v-model="siteUrl" label="Site" placeholder="https://" />
      </div>

      <UiTextarea v-model="observacao" label="Observação" :rows="2" />

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>

      <div class="flex flex-wrap justify-end gap-2">
        <UiButton variant="outline" @click="emit('update:modelValue', false)">Cancelar</UiButton>
        <UiButton type="submit">{{ editando ? 'Salvar' : 'Adicionar fornecedor' }}</UiButton>
      </div>
    </form>
  </UiModal>
</template>
