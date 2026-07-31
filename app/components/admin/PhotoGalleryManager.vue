<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { photoMetadataSchema } from '#shared/schemas/photos'
import type { PhotoWithUrl } from '~/types/photo'

const { listPhotos, uploadPhoto, updatePhoto, deletePhoto } = useWeddingPhotos()
const { data, status, refresh } = listPhotos()
const toast = useToast()

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)

function openFilePicker() {
  fileInput.value?.click()
}

async function handleFileChange(fileEvent: Event) {
  const input = fileEvent.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isUploading.value = true
  try {
    await uploadPhoto(file)
    await refresh()
    toast.success('Foto adicionada à galeria.')
  } catch {
    toast.error('Não foi possível enviar a foto. Verifique o formato (JPEG/PNG/WebP) e o tamanho (máx. 5MB).')
  } finally {
    isUploading.value = false
    input.value = ''
  }
}

// --- Edição de legenda/ordem (o arquivo em si não é editável — CLAUDE.md, seção 28) ---
const isEditModalOpen = ref(false)
const editingPhoto = ref<PhotoWithUrl | null>(null)
const editErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(photoMetadataSchema),
  initialValues: { caption: '', displayOrder: 0 },
})

const [caption] = defineField('caption')
const [displayOrder] = defineField('displayOrder')

const displayOrderText = computed({
  get: () => (displayOrder.value === undefined ? '' : String(displayOrder.value)),
  set: (value: string) => {
    displayOrder.value = value === '' ? undefined : Number(value)
  },
})

function openEditModal(photo: PhotoWithUrl) {
  editingPhoto.value = photo
  editErrorMessage.value = null
  resetForm({ values: { caption: photo.caption ?? '', displayOrder: photo.display_order } })
  isEditModalOpen.value = true
}

const onEditSubmit = handleSubmit(async (values) => {
  if (!editingPhoto.value) return
  editErrorMessage.value = null
  try {
    await updatePhoto(editingPhoto.value.id, values)
    isEditModalOpen.value = false
    await refresh()
    toast.success('Foto atualizada.')
  } catch {
    editErrorMessage.value = 'Não foi possível salvar as alterações.'
  }
})

// --- Exclusão ---
const deleteTarget = ref<PhotoWithUrl | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(photo: PhotoWithUrl) {
  deleteTarget.value = photo
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deletePhoto(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
    toast.success('Foto removida.')
  } catch {
    toast.error('Não foi possível remover a foto.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">Galeria</h1>
        <p class="mt-1 text-sm text-text-muted">Fotos exibidas na seção Galeria do site público.</p>
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        class="hidden"
        @change="handleFileChange"
      />
      <UiButton :disabled="isUploading" @click="openFilePicker">
        {{ isUploading ? 'Enviando...' : 'Adicionar foto' }}
      </UiButton>
    </div>

    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <UiSkeleton v-for="n in 4" :key="n" class="aspect-square w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhuma foto na galeria ainda"
      description="Envie fotos do casal para exibir na seção Galeria do site."
    >
      <UiButton :disabled="isUploading" @click="openFilePicker">Adicionar foto</UiButton>
    </UiEmptyState>

    <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <UiCard v-for="photo in data.data" :key="photo.id" padding="none" class="overflow-hidden">
        <NuxtImg
          :src="photo.url"
          :alt="photo.caption || 'Foto da galeria'"
          class="aspect-square w-full object-cover"
          sizes="200px"
        />
        <div class="flex flex-col gap-2 p-3">
          <p class="truncate text-sm text-text">{{ photo.caption || 'Sem legenda' }}</p>
          <p class="text-xs text-text-muted">Ordem: {{ photo.display_order }}</p>
          <div class="flex gap-2">
            <UiButton size="sm" variant="ghost" @click="openEditModal(photo)">Editar</UiButton>
            <UiButton size="sm" variant="destructive" @click="openDeleteModal(photo)">Excluir</UiButton>
          </div>
        </div>
      </UiCard>
    </div>

    <UiModal v-model="isEditModalOpen" title="Editar foto">
      <form class="flex flex-col gap-4" @submit="onEditSubmit">
        <NuxtImg
          v-if="editingPhoto"
          :src="editingPhoto.url"
          :alt="editingPhoto.caption || 'Foto da galeria'"
          class="h-40 w-full rounded-lg object-cover"
        />
        <UiInput v-model="caption" label="Legenda (opcional)" :error="errors.caption" />
        <UiInput
          v-model="displayOrderText"
          type="number"
          label="Ordem de exibição"
          :error="errors.displayOrder"
        />
        <p v-if="editErrorMessage" class="text-sm text-red-600" role="alert">{{ editErrorMessage }}</p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isEditModalOpen = false">Cancelar</UiButton>
          <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="isDeleteModalOpen" title="Excluir foto">
      <p class="text-sm text-text">Tem certeza que deseja excluir esta foto da galeria?</p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmDelete">Excluir</UiButton>
      </template>
    </UiModal>
  </div>
</template>
