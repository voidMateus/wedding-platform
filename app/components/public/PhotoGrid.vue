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
    ? 'grid grid-cols-2 gap-3 sm:grid-cols-4'
    : 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
)

/**
 * Retrato (3:4) na prévia da home, quadrado na galeria completa.
 *
 * O protótipo do convite usa retrato na fileira da home, e a razão é de
 * composição: quatro retratos lado a lado formam uma faixa alta que segura a
 * seção, enquanto quatro quadrados achatam a mesma largura numa tira sem
 * presença. Na galeria completa, com dezenas de fotos em cinco colunas, o
 * quadrado continua sendo o certo — ali o assunto é a quantidade.
 */
const aspectClass = computed(() => (props.variant === 'preview' ? 'aspect-[3/4]' : 'aspect-square'))

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
        class="group overflow-hidden rounded-lg bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="openLightbox(photo)"
      >
        <img
          :src="photo.url"
          :alt="photo.legenda || 'Foto da galeria'"
          class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          :class="aspectClass"
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
