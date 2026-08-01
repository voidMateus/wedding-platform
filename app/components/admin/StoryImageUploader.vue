<script setup lang="ts">
interface Props {
  modelValue: string | null
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string | null]
}>()

const { uploadStoryImage, removeStoryImage } = useWeddingStoryUpload()

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
    const { url } = await uploadStoryImage(file)
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
    await removeStoryImage()
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
    <span class="text-sm font-medium text-text">Foto da seção "Nossa História" (opcional)</span>
    <p class="text-xs text-text-muted">
      Independente da foto de capa do topo do site — cada uma pode ser uma foto diferente.
    </p>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="handleFileChange"
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
      <img
        :src="modelValue"
        alt="Prévia da foto da seção Nossa História"
        class="h-40 w-full rounded-lg border border-border object-cover"
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
          @click="handleRemove"
        >
          Remover
        </UiButton>
      </div>
    </div>

    <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
  </div>
</template>
