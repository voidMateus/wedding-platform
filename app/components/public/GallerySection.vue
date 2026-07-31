<script setup lang="ts">
import type { PhotoWithUrl } from '~/types/photo'

const { getPublicPhotos } = usePublicPhotos()
const { data } = getPublicPhotos()

const photos = computed(() => data.value?.data ?? [])

const selectedPhoto = ref<PhotoWithUrl | null>(null)
const isLightboxOpen = ref(false)

function openLightbox(photo: PhotoWithUrl) {
  selectedPhoto.value = photo
  isLightboxOpen.value = true
}
</script>

<template>
  <PublicEditorialSection v-if="photos.length" id="galeria" title="Galeria" tone="muted">
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="group overflow-hidden rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="openLightbox(photo)"
      >
        <NuxtImg
          :src="photo.url"
          :alt="photo.caption || 'Foto da galeria'"
          class="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="sm:50vw md:33vw lg:25vw xl:25vw 2xl:25vw"
          loading="lazy"
        />
      </button>
    </div>

    <UiModal
      v-model="isLightboxOpen"
      size="lg"
      :title="selectedPhoto?.caption || 'Foto da galeria'"
    >
      <NuxtImg
        v-if="selectedPhoto"
        :src="selectedPhoto.url"
        :alt="selectedPhoto.caption || 'Foto da galeria'"
        class="max-h-[70vh] w-full rounded-md object-contain"
        sizes="sm:90vw md:90vw lg:90vw xl:90vw 2xl:90vw"
      />
    </UiModal>
  </PublicEditorialSection>
</template>
