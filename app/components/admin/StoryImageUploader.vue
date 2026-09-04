<!--
  Foto da seção "Nossa História". Mesma divisão do CoverImageUploader: aqui
  só a configuração (composables, alvo do ponto de foco, textos); a moldura
  é do `AdminSettingsUploadBox`.
-->
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

const {
  fileInput,
  isUploading,
  isRemoving,
  errorMessage,
  openFilePicker,
  handleFileChange,
  handleRemove,
} = useImageUploader({ upload: uploadStoryImage, remove: removeStoryImage })

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
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChange"
    />

    <AdminSettingsUploadBox
      label='Foto da seção "Nossa História"'
      hint="Independente da foto de capa. Formato retrato funciona melhor — sem ela, o texto aparece centralizado."
      :model-value="modelValue"
      :focal-point="localFocalPoint"
      preview-aspect-class="aspect-[4/5]"
      preview-alt="Prévia da foto da seção Nossa História"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @remove="onRemove"
      @update:focal-point="handleFocalPointChange"
    />
  </div>
</template>
