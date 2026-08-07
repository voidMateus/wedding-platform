<script setup lang="ts">
// Editor de lista dinamica dos topicos do Manual dos Convidados (CLAUDE.md,
// roadmap "Fase Mensagens Personalizaveis") - o casal pode adicionar/remover
// topicos, nao so reescrever os 4 padroes. Sem reordenar por drag-and-drop
// (escopo deliberadamente contido: adicionar sempre anexa no fim, remover
// tira o item, mesmo padrao ja usado em toggleHeroButton/RsvpInviteFlow
// para listas simples).
import { MANUAL_TOPIC_ICON_CATALOG } from '#shared/manual-topic-icons'
import type { ManualTopic } from '#shared/wedding-content'

const MAX_TOPICS = 12
const DEFAULT_ICON = MANUAL_TOPIC_ICON_CATALOG[0]!.icon

interface Props {
  modelValue: ManualTopic[]
}

const { modelValue } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: ManualTopic[]] }>()

const iconOptions = MANUAL_TOPIC_ICON_CATALOG.map((option) => ({ value: option.icon, label: option.label }))

function updateTopic(index: number, patch: Partial<ManualTopic>) {
  const next = modelValue.map((topic, i) => (i === index ? { ...topic, ...patch } : topic))
  emit('update:modelValue', next)
}

function addTopic() {
  if (modelValue.length >= MAX_TOPICS) return
  emit('update:modelValue', [...modelValue, { icon: DEFAULT_ICON, title: '', description: '' }])
}

function removeTopic(index: number) {
  emit(
    'update:modelValue',
    modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-for="(topic, index) in modelValue"
      :key="index"
      class="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="text-xs font-semibold uppercase tracking-wide text-text-muted">Tópico {{ index + 1 }}</span>
        <UiButton type="button" size="sm" variant="ghost" @click="removeTopic(index)">
          <Icon name="lucide:trash-2" class="h-4 w-4" />
        </UiButton>
      </div>
      <UiSelect
        :model-value="topic.icon"
        label="Ícone"
        :options="iconOptions"
        @update:model-value="(value) => updateTopic(index, { icon: value })"
      />
      <UiInput
        :model-value="topic.title"
        label="Título"
        @update:model-value="(value) => updateTopic(index, { title: value })"
      />
      <UiTextarea
        :model-value="topic.description"
        label="Descrição"
        :rows="2"
        @update:model-value="(value) => updateTopic(index, { description: value })"
      />
    </div>

    <p v-if="!modelValue.length" class="text-sm text-text-muted">
      Nenhum tópico — a seção "Manual dos Convidados" fica oculta no site enquanto a lista estiver vazia.
    </p>

    <UiButton type="button" variant="outline" :disabled="modelValue.length >= MAX_TOPICS" @click="addTopic">
      <Icon name="lucide:plus" class="h-4 w-4" />
      Adicionar tópico
    </UiButton>
  </div>
</template>
