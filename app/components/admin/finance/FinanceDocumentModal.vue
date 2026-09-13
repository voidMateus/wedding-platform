<!--
  Documento: arquivo enviado OU link externo.

  As duas formas existem porque metade dos casais já guarda tudo no Drive, e
  obrigá-los a reenviar seria pedir trabalho para piorar o que já funciona; a
  outra metade não tem lugar nenhum, e para essa o upload é o serviço.

  O arquivo vai para um bucket privado — nunca uma URL pública, porque contrato
  tem CPF e valor.
-->
<script setup lang="ts">
import {
  TIPOS_DOCUMENTO,
  ROTULOS_TIPO_DOCUMENTO,
  type TipoDocumento,
} from '#shared/schemas/finance'
import type { DespesaComParcelas, FornecedorComSituacao } from '~/types/finance'

interface Props {
  modelValue: boolean
  fornecedores: FornecedorComSituacao[]
  despesas: DespesaComParcelas[]
  fornecedorPadrao?: string | null
  despesaPadrao?: string | null
}

const {
  modelValue,
  fornecedores,
  despesas,
  fornecedorPadrao = null,
  despesaPadrao = null,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  enviarArquivo: [
    payload: {
      arquivo: File
      titulo: string
      tipo: TipoDocumento
      fornecedorId: string | null
      despesaId: string | null
    },
  ]
  salvarLink: [
    payload: {
      titulo: string
      tipo: TipoDocumento
      urlExterna: string
      fornecedorId: string | null
      despesaId: string | null
    },
  ]
}>()

const origem = ref<'upload' | 'link'>('upload')
const titulo = ref('')
const tipo = ref<TipoDocumento>('contrato')
const fornecedorId = ref('')
const despesaId = ref('')
const urlExterna = ref('')
const arquivo = ref<File | null>(null)
const erro = ref('')

const opcoesTipo = TIPOS_DOCUMENTO.map((valor) => ({
  value: valor,
  label: ROTULOS_TIPO_DOCUMENTO[valor],
}))

const opcoesFornecedor = computed(() => [
  { value: '', label: 'Nenhum' },
  ...fornecedores.map((fornecedor) => ({ value: fornecedor.id, label: fornecedor.nome })),
])

const opcoesDespesa = computed(() => [
  { value: '', label: 'Nenhuma' },
  ...despesas.map((despesa) => ({ value: despesa.id, label: despesa.descricao })),
])

watch(
  () => modelValue,
  (aberto) => {
    if (!aberto) return
    erro.value = ''
    origem.value = 'upload'
    titulo.value = ''
    tipo.value = 'contrato'
    fornecedorId.value = fornecedorPadrao ?? ''
    despesaId.value = despesaPadrao ?? ''
    urlExterna.value = ''
    arquivo.value = null
  },
)

function aoEscolherArquivo(event: Event) {
  const input = event.target as HTMLInputElement
  const escolhido = input.files?.[0] ?? null
  arquivo.value = escolhido
  // O nome do arquivo é o melhor título padrão que existe, e continua editável.
  if (escolhido && !titulo.value.trim()) {
    titulo.value = escolhido.name.replace(/\.[^.]+$/, '')
  }
}

function submeter() {
  erro.value = ''
  const tituloFinal = titulo.value.trim()

  if (origem.value === 'upload') {
    if (!arquivo.value) {
      erro.value = 'Escolha um arquivo.'
      return
    }
    emit('enviarArquivo', {
      arquivo: arquivo.value,
      titulo: tituloFinal || arquivo.value.name,
      tipo: tipo.value,
      fornecedorId: fornecedorId.value || null,
      despesaId: despesaId.value || null,
    })
    return
  }

  if (!tituloFinal) {
    erro.value = 'Dê um nome ao documento.'
    return
  }
  if (!urlExterna.value.trim()) {
    erro.value = 'Informe o link do documento.'
    return
  }

  emit('salvarLink', {
    titulo: tituloFinal,
    tipo: tipo.value,
    urlExterna: urlExterna.value.trim(),
    fornecedorId: fornecedorId.value || null,
    despesaId: despesaId.value || null,
  })
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Novo documento"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submeter">
      <div class="flex gap-2">
        <UiChip
          label="Enviar arquivo"
          clickable
          :selected="origem === 'upload'"
          @click="origem = 'upload'"
        />
        <UiChip
          label="Link externo"
          clickable
          :selected="origem === 'link'"
          @click="origem = 'link'"
        />
      </div>

      <div v-if="origem === 'upload'" class="flex flex-col gap-1.5">
        <label for="documento-arquivo" class="text-sm font-medium text-text">Arquivo</label>
        <input
          id="documento-arquivo"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          class="block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:text-text"
          @change="aoEscolherArquivo"
        />
        <p class="text-xs text-text-muted">PDF, JPEG, PNG ou WebP, até 10MB.</p>
      </div>

      <UiInput
        v-else
        v-model="urlExterna"
        label="Link"
        placeholder="https://drive.google.com/..."
      />

      <UiInput v-model="titulo" label="Nome do documento" placeholder="Contrato do buffet" />
      <UiSelect v-model="tipo" label="Tipo" :options="opcoesTipo" />

      <div class="grid gap-4 sm:grid-cols-2">
        <UiSelect v-model="fornecedorId" label="Fornecedor" :options="opcoesFornecedor" />
        <UiSelect v-model="despesaId" label="Despesa" :options="opcoesDespesa" />
      </div>

      <p v-if="erro" class="text-sm text-danger">{{ erro }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancelar</UiButton>
      <UiButton @click="submeter">Adicionar documento</UiButton>
    </template>
  </UiModal>
</template>
