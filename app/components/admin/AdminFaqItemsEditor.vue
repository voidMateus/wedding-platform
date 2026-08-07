<script setup lang="ts">
// Editor de lista dinamica do FAQ (CLAUDE.md, roadmap "Fase Mensagens
// Personalizaveis") - o casal pode adicionar/remover perguntas, nao so
// reescrever as 5 padrao. Mesmo padrao de AdminManualTopicsEditor.vue (sem
// reordenar por drag-and-drop).
import type { FaqItem } from '#shared/wedding-content'

const MAX_ITEMS = 20

interface Props {
  modelValue: FaqItem[]
}

const { modelValue } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: FaqItem[]] }>()

function updateItem(index: number, patch: Partial<FaqItem>) {
  const next = modelValue.map((item, i) => (i === index ? { ...item, ...patch } : item))
  emit('update:modelValue', next)
}

function addItem() {
  if (modelValue.length >= MAX_ITEMS) return
  emit('update:modelValue', [...modelValue, { question: '', answer: '' }])
}

function removeItem(index: number) {
  emit(
    'update:modelValue',
    modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(item, index) in modelValue"
      :key="index"
      class="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-muted">Pergunta {{ index + 1 }}</span>
        <UiButton type="button" size="sm" variant="ghost" @click="removeItem(index)">
          <Icon name="lucide:trash-2" class="h-4 w-4" />
        </UiButton>
      </div>
      <UiInput
        :model-value="item.question"
        label="Pergunta"
        @update:model-value="(value) => updateItem(index, { question: value })"
      />
      <UiTextarea
        :model-value="item.answer"
        label="Resposta"
        :rows="2"
        @update:model-value="(value) => updateItem(index, { answer: value })"
      />
    </div>

    <p v-if="!modelValue.length" class="text-sm text-text-muted">
      Nenhuma pergunta — a seção "Perguntas Frequentes" fica oculta no site enquanto a lista estiver vazia.
    </p>

    <UiButton type="button" variant="outline" :disabled="modelValue.length >= MAX_ITEMS" @click="addItem">
      <Icon name="lucide:plus" class="h-4 w-4" />
      Adicionar pergunta
    </UiButton>
  </div>
</template>
