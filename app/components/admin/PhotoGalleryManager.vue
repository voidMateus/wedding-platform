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
  initialValues: { caption: '', displayOrder: 0, focalX: 50, focalY: 50 },
})

const [caption] = defineField('caption')
const [displayOrder] = defineField('displayOrder')
const [focalX] = defineField('focalX')
const [focalY] = defineField('focalY')

const displayOrderText = computed({
  get: () => (displayOrder.value === undefined ? '' : String(displayOrder.value)),
  set: (value: string) => {
    displayOrder.value = value === '' ? undefined : Number(value)
  },
})

// Bridge para o formato {x,y} do AdminImageFocalPointPicker (CLAUDE.md,
// seção 22.2) — os campos do form continuam separados (focalX/focalY),
// mesmo padrão de bridging já usado para displayOrderText.
const focalPoint = computed({
  get: () => ({ x: focalX.value ?? 50, y: focalY.value ?? 50 }),
  set: (value: { x: number; y: number }) => {
    focalX.value = value.x
    focalY.value = value.y
  },
})

function focalStyle(photo: PhotoWithUrl) {
  return { objectPosition: `${photo.focal_x}% ${photo.focal_y}%` }
}

function openEditModal(photo: PhotoWithUrl) {
  editingPhoto.value = photo
  editErrorMessage.value = null
  resetForm({
    values: {
      caption: photo.caption ?? '',
      displayOrder: photo.display_order,
      focalX: photo.focal_x,
      focalY: photo.focal_y,
    },
  })
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
  <AdminSection title="Galeria" description="Fotos exibidas na seção Galeria do site público.">
    <template #actions>
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
    </template>

    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <UiSkeleton v-for="n in 4" :key="n" class="aspect-square w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      icon="lucide:image"
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
          :style="focalStyle(photo)"
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
        <AdminImageFocalPointPicker
          v-if="editingPhoto"
          v-model="focalPoint"
          :src="editingPhoto.url"
          :alt="editingPhoto.caption || 'Foto da galeria'"
          preview-aspect-class="aspect-square"
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
  </AdminSection>
</template>
