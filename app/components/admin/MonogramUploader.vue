<!--
  Monograma do casal (Fase Rebrand do Convite). Mesma divisão dos outros dois
  enviadores de imagem: aqui só a configuração; a moldura é do
  `AdminSettingsUploadBox`.

  Sem editor de corte, diferente da capa e da foto da história: um monograma é
  uma marca pronta, entregue no enquadramento em que deve ser usada. Abrir um
  editor de recorte aqui ofereceria uma decisão que não existe — e um corte
  acidental estragaria a arte.
-->
<script setup lang="ts">
interface Props {
  modelValue: string | null
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { uploadMonogramImage, removeMonogramImage } = useWeddingMonogramUpload()

const {
  fileInput,
  isUploading,
  isRemoving,
  errorMessage,
  openFilePicker,
  handleFileChange,
  handleRemove,
} = useImageUploader({ upload: uploadMonogramImage, remove: removeMonogramImage })

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
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
      label="Monograma"
      hint="Assina a capa, o menu e o rodapé. PNG ou WebP com fundo transparente, quadrado. Sem ele, usamos as iniciais de vocês."
      :model-value="modelValue"
      preview-aspect-class="aspect-square"
      preview-fit="contain"
      :editable="false"
      preview-alt="Prévia do monograma"
      :is-uploading="isUploading"
      :is-removing="isRemoving"
      :error-message="errorMessage"
      @pick="openFilePicker"
      @remove="onRemove"
    />
  </div>
</template>
