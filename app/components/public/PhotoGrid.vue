<script setup lang="ts">
// Grade de fotos + lightbox reutilizável (Fase Galeria via Google Drive) —
// usada na prévia da home (GallerySection, variant="preview") e na página
// dedicada /{slug}/galeria (variant="full"). Imagens servidas direto do Google
// (photo.url = thumbnail do Drive), por isso <img loading="lazy">, não NuxtImg.
import type { PhotoWithUrl } from '~/types/photo'

interface Props {
  photos: PhotoWithUrl[]
  variant?: 'preview' | 'full'
}
const props = withDefaults(defineProps<Props>(), { variant: 'full' })

const gridClass = computed(() =>
  props.variant === 'preview'
    ? 'mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
)

const selectedPhoto = ref<PhotoWithUrl | null>(null)
const isLightboxOpen = ref(false)

function openLightbox(photo: PhotoWithUrl) {
  selectedPhoto.value = photo
  isLightboxOpen.value = true
}
</script>

<template>
  <div>
    <div :class="gridClass">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="group overflow-hidden rounded-xl shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="openLightbox(photo)"
      >
        <img
          :src="photo.url"
          :alt="photo.legenda || 'Foto da galeria'"
          class="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          :style="{ objectPosition: `${photo.foco_x}% ${photo.foco_y}%` }"
          loading="lazy"
        />
      </button>
    </div>

    <UiModal
      v-model="isLightboxOpen"
      size="lg"
      :title="selectedPhoto?.legenda || 'Foto da galeria'"
    >
      <img
        v-if="selectedPhoto"
        :src="selectedPhoto.url"
        :alt="selectedPhoto.legenda || 'Foto da galeria'"
        class="max-h-[70vh] w-full rounded-md object-contain"
        loading="lazy"
      />
    </UiModal>
  </div>
</template>
