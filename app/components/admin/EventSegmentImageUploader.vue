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

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const isRemoving = ref(false)
const errorMessage = ref<string | null>(null)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  errorMessage.value = null
  isUploading.value = true
  try {
    const { url } = await uploadEventSegmentImage(segmentId, file)
    emit('update:modelValue', url)
  } catch {
    errorMessage.value = 'Não foi possível enviar a foto. Verifique o formato (JPEG/PNG/WebP) e o tamanho (máx. 5MB).'
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

async function handleRemove() {
  errorMessage.value = null
  isRemoving.value = true
  try {
    await removeEventSegmentImage(segmentId)
    emit('update:modelValue', null)
  } catch {
    errorMessage.value = 'Não foi possível remover a foto.'
  } finally {
    isRemoving.value = false
  }
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
      @change="handleFileChange"
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
        <UiButton type="button" size="sm" variant="destructive" :disabled="isRemoving" @click="handleRemove">
          Remover
        </UiButton>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
  </div>
</template>
