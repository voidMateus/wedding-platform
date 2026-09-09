<!--
  Imagem da seção "Dress Code" — a referência visual de traje que o casal
  quiser: uma foto de inspiração, um moodboard, uma paleta fotografada.

  Substituiu uma ilustração desenhada pela plataforma. Ela era a única arte do
  site que não vinha do casal e destoava de uma página feita de tipografia e
  filete; e, sendo genérica, aparecia igual em todo casamento.

  Mesma divisão dos outros enviadores: aqui só a configuração, a moldura é do
  `AdminSettingsUploadBox` e o corte é do `AdminSettingsImageEditorModal`.
-->
<script setup lang="ts">
/** 4/3 — a seção desenha a imagem em paisagem suave, acima dos cartões. */
const DRESS_CODE_ASPECT_RATIO = 4 / 3

interface Props {
  modelValue: string | null
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { uploadDressCodeImage, removeDressCodeImage } = useWeddingDressCodeUpload()
const toast = useToast()

const {
  fileInput,
  isUploading,
  isRemoving,
  errorMessage,
  openFilePicker,
  handleFileChange,
  handleRemove,
} = useImageUploader({ upload: uploadDressCodeImage, remove: removeDressCodeImage })

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
    const { url } = await uploadDressCodeImage(file)
    emit('update:modelValue', url)
    toast.success('Imagem do dress code atualizada.')
  } catch {
    errorMessage.value = 'Não foi possível salvar a imagem editada. Tente novamente.'
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
      label="Imagem do dress code"
      hint="Opcional. Uma referência de traje, moodboard ou paleta. Sem ela, a seção mostra só o texto e as sugestões."
      :model-value="modelValue"
      preview-aspect-class="aspect-[4/3]"
      preview-alt="Prévia da imagem do dress code"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @edit="isEditorOpen = true"
      @remove="onRemove"
    />

    <AdminSettingsImageEditorModal
      v-model:open="isEditorOpen"
      title="Editar imagem do dress code"
      :src="modelValue"
      :aspect-ratio="DRESS_CODE_ASPECT_RATIO"
      @confirm="onEditorConfirm"
    />
  </div>
</template>
