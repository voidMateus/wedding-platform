<script setup lang="ts">
// Marcos da história do casal — a fileira de cartões do protótipo do convite
// ("O começo" / "O caminho" / "A certeza").
//
// Convivem com o texto corrido em vez de substituí-lo: são duas formas de
// contar a mesma coisa, e qual serve depende do casal. Texto corrido é uma
// carta; marcos são uma linha do tempo. Com marcos preenchidos, a seção passa
// a desenhá-los — por isso a lista vazia não é um estado degradado, é o padrão.
//
// Mesmo formato de lista do AdminManualTopicsEditor: adicionar anexa no fim,
// remover tira o item, sem reordenar.
import type { StoryMilestone } from '#shared/wedding-content'

const MAX_MILESTONES = 6

interface Props {
  modelValue: StoryMilestone[]
}

const { modelValue } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: StoryMilestone[]] }>()

function updateMilestone(index: number, patch: Partial<StoryMilestone>) {
  emit(
    'update:modelValue',
    modelValue.map((milestone, i) => (i === index ? { ...milestone, ...patch } : milestone)),
  )
}

function addMilestone() {
  if (modelValue.length >= MAX_MILESTONES) return
  emit('update:modelValue', [...modelValue, { label: '', title: '', text: '' }])
}

function removeMilestone(index: number) {
  emit(
    'update:modelValue',
    modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <span class="text-sm font-medium text-text">Marcos da história</span>
      <p class="mt-0.5 text-xs leading-relaxed text-text-muted">
        Opcional. Preenchendo os marcos, a seção passa a mostrá-los em cartões, no lugar do texto
        acima. Três costuma ser o número certo.
      </p>
    </div>

    <div
      v-for="(milestone, index) in modelValue"
      :key="index"
      class="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div class="flex items-start justify-between gap-2">
        <span class="text-xs font-semibold tracking-wide text-text-muted uppercase">
          Marco {{ index + 1 }}
        </span>
        <UiButton
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Remover marco"
          @click="removeMilestone(index)"
        >
          <Icon name="lucide:trash-2" class="h-4 w-4" />
        </UiButton>
      </div>
      <UiInput
        :model-value="milestone.label"
        label="Rótulo"
        placeholder="Ex.: O começo"
        hint="Aparece pequeno, acima do título."
        @update:model-value="(value) => updateMilestone(index, { label: value })"
      />
      <UiInput
        :model-value="milestone.title"
        label="Título"
        placeholder="Ex.: Conversas que se estenderam"
        @update:model-value="(value) => updateMilestone(index, { title: value })"
      />
      <UiTextarea
        :model-value="milestone.text"
        label="Texto"
        :rows="2"
        @update:model-value="(value) => updateMilestone(index, { text: value })"
      />
    </div>

    <p v-if="!modelValue.length" class="text-sm text-text-muted">
      Nenhum marco — a seção usa a mensagem acima, em texto corrido.
    </p>

    <UiButton
      type="button"
      variant="outline"
      class="self-start"
      :disabled="modelValue.length >= MAX_MILESTONES"
      @click="addMilestone"
    >
      <Icon name="lucide:plus" class="h-4 w-4" />
      Adicionar marco
    </UiButton>
  </div>
</template>
