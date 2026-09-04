<!--
  Foto de capa do site. Só a configuração: composables de upload/remoção,
  alvo do ponto de foco e os textos. A moldura (caixa tracejada quando
  vazia, prévia com ponto de foco quando preenchida) é do
  `AdminSettingsUploadBox`, compartilhado com o StoryImageUploader.
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

const { uploadCoverImage, removeCoverImage } = useWeddingCoverUpload()
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
} = useImageUploader({ upload: uploadCoverImage, remove: removeCoverImage })

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
}

// Ponto de foco (CLAUDE.md, seção 22.2) — o picker emite a cada
// clique/arraste (potencialmente muitos eventos seguidos), então a
// persistência no servidor é debounced; a prévia em si já reage
// instantaneamente via localFocalPoint, sem esperar a rede.
const localFocalPoint = ref<FocalPoint>(focalPoint)
watch(
  () => focalPoint,
  (value) => {
    localFocalPoint.value = value
  },
)

const persistFocalPoint = useDebounceFn(async (value: FocalPoint) => {
  try {
    await updateThemeFocalPoint({ target: 'cover', x: value.x, y: value.y })
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
      label="Foto de capa"
      hint="Aparece no topo do site. Formato paisagem, ideal 2000×1200px — opcional, o site fica bonito com ou sem ela."
      :model-value="modelValue"
      :focal-point="localFocalPoint"
      preview-aspect-class="aspect-video"
      preview-alt="Prévia da foto de capa"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @remove="onRemove"
      @update:focal-point="handleFocalPointChange"
    />
  </div>
</template>
