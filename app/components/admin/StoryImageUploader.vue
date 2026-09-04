<!--
  Foto da seção "Nossa História". Mesma divisão do CoverImageUploader: aqui só
  a configuração (composables, proporção, textos); a moldura é do
  `AdminSettingsUploadBox` e o corte/rotação do
  `AdminSettingsImageEditorModal`.
-->
<script setup lang="ts">
/** 4/5 — a seção desenha a foto em retrato (`aspect-[4/5]`). */
const STORY_ASPECT_RATIO = 4 / 5

interface Props {
  modelValue: string | null
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
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

const isEditorOpen = ref(false)

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
}

/** Mesmo racional do CoverImageUploader: o corte passa a ser o enquadramento. */
async function onEditorConfirm(file: File) {
  errorMessage.value = null
  isUploading.value = true
  try {
    const { url } = await uploadStoryImage(file)
    await updateThemeFocalPoint({ target: 'story', x: 50, y: 50 })
    emit('update:modelValue', url)
    toast.success('Foto da seção atualizada.')
  } catch {
    errorMessage.value = 'Não foi possível salvar a foto editada. Tente novamente.'
  } finally {
    isUploading.value = false
  }
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
      preview-aspect-class="aspect-[4/5]"
      preview-alt="Prévia da foto da seção Nossa História"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @edit="isEditorOpen = true"
      @remove="onRemove"
    />

    <AdminSettingsImageEditorModal
      v-model:open="isEditorOpen"
      title='Editar foto da seção "Nossa História"'
      :src="modelValue"
      :aspect-ratio="STORY_ASPECT_RATIO"
      @confirm="onEditorConfirm"
    />
  </div>
</template>
