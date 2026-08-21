<script setup lang="ts">
import type { PhotoWithUrl } from '~/types/photo'

interface Props {
  photos: PhotoWithUrl[]
  status: 'idle' | 'pending' | 'success' | 'error'
  isSyncing: boolean
}

const { photos } = defineProps<Props>()

const emit = defineEmits<{
  reorder: [orderedIds: string[]]
  edit: [photo: PhotoWithUrl]
  sync: []
}>()

// Cópia local mutável da lista (a grade arrasta contra ela); ressincroniza
// sempre que o fetch atualiza (após refresh/sync).
const localPhotos = ref<PhotoWithUrl[]>([])
watch(
  () => photos,
  (value) => (localPhotos.value = [...value]),
  { immediate: true },
)

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function onDragStart(index: number) {
  dragIndex.value = index
}
function onDragOver(index: number) {
  if (dragIndex.value !== null) overIndex.value = index
}
function onDragEnd() {
  dragIndex.value = null
  overIndex.value = null
}
function onDrop(targetIndex: number) {
  const from = dragIndex.value
  onDragEnd()
  if (from === null || from === targetIndex) return

  const list = [...localPhotos.value]
  const [moved] = list.splice(from, 1)
  if (!moved) return
  list.splice(targetIndex, 0, moved)
  localPhotos.value = list // otimista

  emit(
    'reorder',
    list.map((photo) => photo.id),
  )
}

function focalStyle(photo: PhotoWithUrl) {
  return { objectPosition: `${photo.foco_x}% ${photo.foco_y}%` }
}
</script>

<template>
  <div
    v-if="status === 'pending'"
    class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
  >
    <UiSkeleton v-for="n in 8" :key="n" class="aspect-square w-full rounded-lg" />
  </div>

  <UiEmptyState
    v-else-if="!photos.length"
    icon="lucide:image"
    title="Nenhuma foto sincronizada ainda"
    description="Adicione fotos à pasta do Google Drive e clique em Sincronizar agora."
  >
    <UiButton :disabled="isSyncing" @click="$emit('sync')">Sincronizar agora</UiButton>
  </UiEmptyState>

  <div v-else>
    <p class="mb-3 text-xs text-text-muted">
      Arraste as fotos para reordenar. Passe o mouse sobre uma foto para editar.
    </p>
    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      <div
        v-for="(photo, index) in localPhotos"
        :key="photo.id"
        draggable="true"
        :title="photo.legenda || undefined"
        class="group relative cursor-move overflow-hidden rounded-lg border border-border transition-brand"
        :class="{
          'opacity-40': dragIndex === index,
          'ring-2 ring-primary': overIndex === index && dragIndex !== index,
        }"
        @dragstart="onDragStart(index)"
        @dragover.prevent="onDragOver(index)"
        @drop="onDrop(index)"
        @dragend="onDragEnd"
      >
        <img
          :src="photo.url"
          :alt="photo.legenda || 'Foto da galeria'"
          class="aspect-square w-full object-cover"
          :style="focalStyle(photo)"
          loading="lazy"
          draggable="false"
        />
        <span
          class="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium leading-none text-white"
        >
          {{ photo.ordem_exibicao }}
        </span>
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-brand group-hover:pointer-events-auto group-hover:opacity-100"
        >
          <UiButton size="sm" variant="secondary" @click="emit('edit', photo)">Editar</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
