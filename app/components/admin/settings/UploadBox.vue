<!--
  Caixa de envio de foto da tela de Configurações — a "moldura" do modelo:
  vazia, é um retângulo de borda tracejada com rótulo, orientação de formato
  e um único botão; preenchida, vira a prévia com o seletor de ponto de foco
  e as ações de trocar/remover.

  É só apresentação: quem tem os composables de upload e o alvo do ponto de
  foco são os chamadores (`AdminCoverImageUploader`/
  `AdminStoryImageUploader`), que antes eram dois arquivos ~95% idênticos —
  toda a diferença real entre eles é rótulo, proporção da prévia e qual par
  upload/remove usar.

  A borda tracejada só existe no estado vazio, de propósito: tracejado
  comunica "espaço a preencher"; com a foto lá, ele viraria ruído em volta
  de um conteúdo que já está resolvido.
-->
<script setup lang="ts">
interface FocalPoint {
  x: number
  y: number
}

interface Props {
  label: string
  /** Orientação de formato/proporção ("Aparece no topo do site. Ideal 2000×1200px."). */
  hint: string
  modelValue: string | null
  focalPoint: FocalPoint
  /** Classe de proporção da prévia (`aspect-video` na capa, `aspect-[4/5]` na história). */
  previewAspectClass: string
  previewAlt: string
  isUploading: boolean
  isRemoving: boolean
  errorMessage: string | null
}

defineProps<Props>()

const emit = defineEmits<{
  /** Abrir o seletor de arquivos do sistema. */
  pick: []
  remove: []
  'update:focalPoint': [value: FocalPoint]
}>()
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-md border p-4 transition-brand"
    :class="
      modelValue
        ? 'border-border bg-surface-muted/30'
        : 'border-dashed border-border bg-surface-muted/30'
    "
  >
    <div>
      <p class="text-sm font-medium text-text">{{ label }}</p>
      <p class="mt-0.5 text-xs leading-relaxed text-text-muted">{{ hint }}</p>
    </div>

    <template v-if="modelValue">
      <UiImageFocalPointPicker
        :model-value="focalPoint"
        :src="modelValue"
        :alt="previewAlt"
        :preview-aspect-class="previewAspectClass"
        @update:model-value="(value) => emit('update:focalPoint', value)"
      />
      <div class="flex flex-wrap gap-2">
        <UiButton
          type="button"
          size="sm"
          variant="ghost"
          :disabled="isUploading"
          @click="emit('pick')"
        >
          <Icon name="lucide:upload-cloud" class="h-4 w-4" />
          {{ isUploading ? 'Enviando...' : 'Trocar imagem' }}
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="destructive"
          :disabled="isRemoving"
          @click="emit('remove')"
        >
          Remover
        </UiButton>
      </div>
    </template>

    <UiButton
      v-else
      type="button"
      size="sm"
      variant="ghost"
      class="self-start"
      :disabled="isUploading"
      @click="emit('pick')"
    >
      <Icon name="lucide:upload-cloud" class="h-4 w-4" />
      {{ isUploading ? 'Enviando...' : 'Enviar imagem' }}
    </UiButton>

    <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>
  </div>
</template>
