<script setup lang="ts">
// "Nossos Momentos" — pequena prévia de fotos ao final da home (pedido do
// usuário), não a galeria completa. Ideia registrada para uma fase futura:
// em vez de upload direto (Supabase Storage, como hoje), sincronizar com um
// link de álbum do Google Drive — fotógrafos costumam entregar o material
// assim. Não implementado nesta fase (escolha explícita do usuário) — a
// prévia continua lendo de `photos` normalmente.
import type { PhotoWithUrl } from '~/types/photo'

const PREVIEW_PHOTO_LIMIT = 8

const { getPublicPhotos } = usePublicPhotos()
const { data } = getPublicPhotos()

const photos = computed(() => data.value?.data ?? [])
const previewPhotos = computed(() => photos.value.slice(0, PREVIEW_PHOTO_LIMIT))

const selectedPhoto = ref<PhotoWithUrl | null>(null)
const isLightboxOpen = ref(false)

function openLightbox(photo: PhotoWithUrl) {
  selectedPhoto.value = photo
  isLightboxOpen.value = true
}
</script>

<template>
  <PublicEditorialSection v-if="photos.length" id="nossos-momentos" eyebrow="Registros" title="Nossos Momentos">
    <div class="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      <button
        v-for="photo in previewPhotos"
        :key="photo.id"
        type="button"
        class="group overflow-hidden rounded-xl shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="openLightbox(photo)"
      >
        <NuxtImg
          :src="photo.url"
          :alt="photo.caption || 'Foto da galeria'"
          class="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          :style="{ objectPosition: `${photo.focal_x}% ${photo.focal_y}%` }"
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
