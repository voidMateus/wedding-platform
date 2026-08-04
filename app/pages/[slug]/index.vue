<script setup lang="ts">
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()

const { data: wedding, status: weddingStatus } = getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()

// Cada item do cronograma vira sua própria seção em destaque — substitui a
// antiga lista "Programação", redundante com estas seções quando só há
// Cerimônia/Recepção (feedback de produto: ter as duas era duplicar a mesma
// informação).
const resolvedSegments = computed(() => {
  const segments = segmentsResponse.value?.data ?? []
  return segments.map((segment) => resolveEventSegmentVenue(segment, segments))
})

// Segmentos que compartilham local via `same_venue_as` (ex.: Cerimônia e
// Recepção no mesmo endereço) viram um único card em vez de duas seções
// duplicadas mostrando o mesmo mapa/endereço (CLAUDE.md, §12.2).
const eventSegmentGroups = computed(() => groupEventSegmentsByVenue(resolvedSegments.value))

// Meta dinâmica por casamento (CLAUDE.md, seção 26) — essencial para o
// preview correto ao compartilhar o link no WhatsApp. Slug inexistente
// nunca deve ser indexado (não há conteúdo real por trás dele).
useSeoMeta({
  title: () => (wedding.value ? `${wedding.value.couple_names} — Casamento` : 'Casamento não encontrado'),
  description: () =>
    wedding.value
      ? `Confira as informações do nosso casamento e confirme presença.`
      : undefined,
  ogTitle: () => (wedding.value ? `${wedding.value.couple_names} — Casamento` : undefined),
  robots: () => (wedding.value ? undefined : 'noindex, nofollow'),
})
</script>

<template>
  <div>
    <div v-if="weddingStatus === 'pending'" class="flex flex-col items-center gap-4 px-4 py-20">
      <UiSkeleton class="h-10 w-64" />
      <UiSkeleton class="h-6 w-40" />
    </div>

    <UiEmptyState
      v-else-if="!wedding"
      title="Casamento não encontrado"
      description="Confira se o link está correto — o endereço deve terminar com o nome do casal."
      class="mx-auto max-w-md px-4 py-20"
    />

    <template v-else>
      <PublicHero :wedding="wedding" :segments="resolvedSegments" />
      <PublicStorySection :wedding="wedding" />
      <PublicSaveTheDateCard v-if="resolvedSegments.length" :event-date="wedding.event_date" />
      <div id="cronograma">
        <PublicEventSpotlight
          v-for="(group, index) in eventSegmentGroups"
          :key="group[0]!.id"
          :segments="group"
          :tone="index % 2 === 0 ? 'default' : 'muted'"
        />
      </div>
      <PublicDressCodeSection :wedding="wedding" />
      <PublicGuestManualSection />
      <PublicGiftsShowcaseSection />
      <PublicRsvpTeaserSection :wedding="wedding" />
      <PublicGallerySection />
      <PublicFaqSection />
    </template>
  </div>
</template>
