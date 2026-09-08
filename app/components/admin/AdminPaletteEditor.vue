<script setup lang="ts">
// Paleta do Manual dos Padrinhos — as "bolinhas de cor" do convite impresso
// (Fase Rebrand do Convite). Mesmo formato de lista do
// AdminManualTopicsEditor: adicionar anexa no fim, remover tira o item, sem
// reordenar.
//
// O nome é obrigatório e não é enfeite: no site ele fica escrito embaixo da
// bolinha, e é a única forma de a informação chegar a quem não distingue
// aquele tom — ou a quem vai procurar o tecido pelo nome numa loja.
//
// Essas cores não passam por validação de contraste, diferente de tudo mais
// que o casal escolhe no admin: aqui a cor não pinta a interface, ela É o
// conteúdo (ver contentPaletteSwatchSchema).
import type { PaletteSwatch } from '#shared/wedding-content'

const MAX_SWATCHES = 8
const DEFAULT_HEX = '#8b0000'

interface Props {
  modelValue: PaletteSwatch[]
}

const { modelValue } = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: PaletteSwatch[]] }>()

function updateSwatch(index: number, patch: Partial<PaletteSwatch>) {
  emit(
    'update:modelValue',
    modelValue.map((swatch, i) => (i === index ? { ...swatch, ...patch } : swatch)),
  )
}

function addSwatch() {
  if (modelValue.length >= MAX_SWATCHES) return
  emit('update:modelValue', [...modelValue, { name: '', hex: DEFAULT_HEX }])
}

function removeSwatch(index: number) {
  emit(
    'update:modelValue',
    modelValue.filter((_, i) => i !== index),
  )
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-medium text-text">Paleta de cores</span>

    <div
      v-for="(swatch, index) in modelValue"
      :key="index"
      class="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-end"
    >
      <UiInput
        class="flex-1"
        :model-value="swatch.name"
        label="Nome da cor"
        placeholder="Ex.: Vinho"
        @update:model-value="(value) => updateSwatch(index, { name: value })"
      />
      <UiColorPicker
        class="sm:w-44"
        :model-value="swatch.hex"
        label="Tom"
        @update:model-value="(value) => updateSwatch(index, { hex: value })"
      />
      <UiButton
        type="button"
        size="sm"
        variant="ghost"
        aria-label="Remover cor da paleta"
        class="self-start sm:mb-1"
        @click="removeSwatch(index)"
      >
        <Icon name="lucide:trash-2" class="h-4 w-4" />
      </UiButton>
    </div>

    <p v-if="!modelValue.length" class="text-sm text-text-muted">
      Nenhuma cor — a paleta não aparece no site enquanto a lista estiver vazia.
    </p>

    <UiButton
      type="button"
      variant="outline"
      class="self-start"
      :disabled="modelValue.length >= MAX_SWATCHES"
      @click="addSwatch"
    >
      <Icon name="lucide:plus" class="h-4 w-4" />
      Adicionar cor
    </UiButton>
  </div>
</template>
