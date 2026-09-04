<!--
  Foto de capa do site. Só a configuração: composables de upload/remoção,
  proporção e textos. A moldura (caixa tracejada quando vazia, prévia com
  ações quando preenchida) é do `AdminSettingsUploadBox` e o corte/rotação é
  do `AdminSettingsImageEditorModal`, ambos compartilhados com o
  StoryImageUploader.
-->
<script setup lang="ts">
/** 16/9 — a capa é desenhada em `aspect-video` no topo do site. */
const COVER_ASPECT_RATIO = 16 / 9

interface Props {
  modelValue: string | null
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
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

const isEditorOpen = ref(false)

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
}

/**
 * O recorte confirmado vira a nova foto: sobe pelo mesmo endpoint do envio
 * normal e o ponto de foco volta ao centro. Sem esse reset, um foco salvo
 * antes do corte deslocaria de novo uma imagem que já está enquadrada — o
 * corte passa a ser a única fonte de enquadramento.
 */
async function onEditorConfirm(file: File) {
  errorMessage.value = null
  isUploading.value = true
  try {
    const { url } = await uploadCoverImage(file)
    await updateThemeFocalPoint({ target: 'cover', x: 50, y: 50 })
    emit('update:modelValue', url)
    toast.success('Foto de capa atualizada.')
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
      label="Foto de capa"
      hint="Aparece no topo do site. Formato paisagem, ideal 2000×1200px — opcional, o site fica bonito com ou sem ela."
      :model-value="modelValue"
      preview-aspect-class="aspect-video"
      preview-alt="Prévia da foto de capa"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @edit="isEditorOpen = true"
      @remove="onRemove"
    />

    <AdminSettingsImageEditorModal
      v-model:open="isEditorOpen"
      title="Editar foto de capa"
      :src="modelValue"
      :aspect-ratio="COVER_ASPECT_RATIO"
      @confirm="onEditorConfirm"
    />
  </div>
</template>
