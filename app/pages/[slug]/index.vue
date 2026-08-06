<script setup lang="ts">
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()

const { data: wedding, status: weddingStatus } = getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()

// Repassado a Hero como prop (em vez de useRoute() direto) — mantém o
// componente testável com @vue/test-utils puro. Presentes não usa mais
// token de convite (CLAUDE.md §18.2/4.5), então GiftsShowcaseSection não
// precisa mais deste valor.
const route = useRoute()
const code = computed(() => (typeof route.query.code === 'string' ? route.query.code : undefined))

// Todo item do cronograma alimenta a seção única "O Grande Dia"
// (GrandeDiaSection) — substitui a antiga lista "Programação" e a versão
// anterior com uma seção própria por item (feedback de produto: nome fixo
// e previsível é melhor que título dinâmico por segmento). A classificação
// por palavra-chave (shared/utils/event-segment-keywords.ts) só decide o
// ícone/badge de cada card e as âncoras internas de compatibilidade
// (#cerimonia/#recepcao).
const resolvedSegments = computed(() => {
  const segments = segmentsResponse.value?.data ?? []
  return segments.map((segment) => resolveEventSegmentVenue(segment, segments))
})

// Cerimônia/Recepção no mesmo endereço viram um único card dentro de "O
// Grande Dia" (CLAUDE.md, §12.2) — sem duplicar mapa/endereço; endereços
// diferentes viram dois cards lado a lado na mesma seção.
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
      <PublicHero :wedding="wedding" :segments="resolvedSegments" :code="code" />
      <PublicWelcomeSection />
      <PublicStorySection :wedding="wedding" />
      <PublicGrandeDiaSection :groups="eventSegmentGroups" :event-date="wedding.event_date" />
      <PublicDressCodeSection :wedding="wedding" />
      <PublicGuestManualSection />
      <PublicRsvpTeaserSection :wedding="wedding" />
      <PublicGiftsShowcaseSection />
      <PublicFaqSection />
      <PublicGallerySection />
    </template>
  </div>
</template>
