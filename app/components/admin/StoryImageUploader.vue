<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'

interface FocalPoint {
  x: number
  y: number
}

interface Props {
  modelValue: string | null
  focalPoint: FocalPoint
}

const { modelValue, focalPoint } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
  'update:focalPoint': [value: FocalPoint]
}>()

const { uploadStoryImage, removeStoryImage } = useWeddingStoryUpload()
const { updateThemeFocalPoint } = useWeddingThemeFocalPoint()
const toast = useToast()

const { fileInput, isUploading, isRemoving, errorMessage, openFilePicker, handleFileChange, handleRemove } =
  useImageUploader({ upload: uploadStoryImage, remove: removeStoryImage })

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
}

// Ponto de foco (CLAUDE.md, seção 22.2) — mesma persistência debounced do
// CoverImageUploader.vue.
const localFocalPoint = ref<FocalPoint>(focalPoint)
watch(
  () => focalPoint,
  (value) => {
    localFocalPoint.value = value
  },
)

const persistFocalPoint = useDebounceFn(async (value: FocalPoint) => {
  try {
    await updateThemeFocalPoint({ target: 'story', x: value.x, y: value.y })
    emit('update:focalPoint', value)
  } catch {
    toast.error('Não foi possível salvar o enquadramento.')
  }
}, 400)

function handleFocalPointChange(value: FocalPoint) {
  localFocalPoint.value = value
  persistFocalPoint(value)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium text-text">Foto da seção "Nossa História" (opcional)</span>
    <p class="text-xs text-text-muted">
      Independente da foto de capa do topo do site — cada uma pode ser uma foto diferente.
    </p>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChange"
    />

    <UiEmptyState
      v-if="!modelValue"
      title="Nenhuma foto da história ainda"
      description="Opcional — sem foto, o texto aparece centralizado, sem uma versão 'menos completa' do layout."
    >
      <UiButton type="button" size="sm" :disabled="isUploading" @click="openFilePicker">
        {{ isUploading ? 'Enviando...' : 'Enviar foto' }}
      </UiButton>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-2">
      <UiImageFocalPointPicker
        :model-value="localFocalPoint"
        :src="modelValue"
        alt="Prévia da foto da seção Nossa História"
        preview-aspect-class="aspect-[4/5]"
        @update:model-value="handleFocalPointChange"
      />
      <div class="flex gap-2">
        <UiButton
          type="button"
          size="sm"
          variant="ghost"
          :disabled="isUploading"
          @click="openFilePicker"
        >
          {{ isUploading ? 'Enviando...' : 'Trocar foto' }}
        </UiButton>
        <UiButton
          type="button"
          size="sm"
          variant="destructive"
          :disabled="isRemoving"
          @click="onRemove"
        >
          Remover
        </UiButton>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
  </div>
</template>
