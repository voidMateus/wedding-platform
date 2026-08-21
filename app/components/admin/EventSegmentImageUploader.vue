<script setup lang="ts">
// Foto de local por item do cronograma (CLAUDE.md, "Fase Linguagem
// Visual") — sem ponto de foco (diferente de capa/história/galeria):
// não é uma foto central emocionalmente, mesmo tratamento simples
// (object-cover, centro) já usado pelas fotos de presente (GiftCard).
interface Props {
  modelValue: string | null
  segmentId: string
}

const { modelValue, segmentId } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { uploadEventSegmentImage, removeEventSegmentImage } = useEventSegmentImageUpload()

const { fileInput, isUploading, isRemoving, errorMessage, openFilePicker, handleFileChange, handleRemove } =
  useImageUploader({
    upload: (file) => uploadEventSegmentImage(segmentId, file),
    remove: () => removeEventSegmentImage(segmentId),
  })

async function onFileChange(event: Event) {
  const url = await handleFileChange(event)
  if (url !== undefined) emit('update:modelValue', url)
}

async function onRemove() {
  if (await handleRemove()) emit('update:modelValue', null)
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span class="text-sm font-medium text-text">Foto do local (opcional)</span>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChange"
    />

    <div v-if="!modelValue">
      <UiButton type="button" size="sm" variant="outline" :disabled="isUploading" @click="openFilePicker">
        {{ isUploading ? 'Enviando...' : 'Enviar foto' }}
      </UiButton>
    </div>

    <div v-else class="flex flex-col gap-2">
      <NuxtImg :src="modelValue" alt="Prévia da foto do local" class="aspect-video w-full rounded-md object-cover" />
      <div class="flex gap-2">
        <UiButton type="button" size="sm" variant="ghost" :disabled="isUploading" @click="openFilePicker">
          {{ isUploading ? 'Enviando...' : 'Trocar foto' }}
        </UiButton>
        <UiButton type="button" size="sm" variant="destructive" :disabled="isRemoving" @click="onRemove">
          Remover
        </UiButton>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
  </div>
</template>
