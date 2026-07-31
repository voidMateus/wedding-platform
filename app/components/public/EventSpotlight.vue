<script setup lang="ts">
import { EVENT_SEGMENT_ICONS, classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  segment: EventSegment
  id?: string
  tone?: 'default' | 'muted'
}

const { segment, id, tone = 'default' } = defineProps<Props>()

const icon = computed(() => EVENT_SEGMENT_ICONS[classifyEventSegmentTitle(segment.title)])

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const timeRange = computed(() => {
  const start = formatTime(segment.starts_at)
  const end = formatTime(segment.ends_at)
  if (start && end) return `${start} – ${end}`
  return start
})

const hasCoordinates = computed(
  () => segment.venue_latitude !== null && segment.venue_longitude !== null,
)

// Sempre um jeito de abrir no mapa externo, com ou sem coordenadas
// cadastradas — nunca um botão quebrado (mesmo princípio de coverImageUrl).
const externalMapsUrl = computed(() => {
  if (hasCoordinates.value) {
    return `https://www.google.com/maps/search/?api=1&query=${segment.venue_latitude},${segment.venue_longitude}`
  }
  const query = [segment.venue_name, segment.venue_address].filter(Boolean).join(', ')
  if (!query) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
})
</script>

<template>
  <PublicEditorialSection :id="id" :title="segment.title" :tone="tone">
    <div class="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full border border-secondary/40 bg-surface-elevated text-secondary shadow-sm"
      >
        <Icon :name="icon" class="h-6 w-6" />
      </span>
      <p v-if="timeRange" class="text-lg font-medium text-heading">{{ timeRange }}</p>
      <div v-if="segment.venue_name || segment.venue_address" class="flex flex-col gap-1 text-body">
        <p v-if="segment.venue_name" class="font-medium">{{ segment.venue_name }}</p>
        <p v-if="segment.venue_address" class="text-sm text-text-muted">{{ segment.venue_address }}</p>
      </div>

      <PublicVenueMap
        v-if="hasCoordinates"
        :latitude="segment.venue_latitude as number"
        :longitude="segment.venue_longitude as number"
        :label="segment.venue_name || segment.title"
        class="mt-2 w-full"
      />

      <UiButton v-if="externalMapsUrl" variant="secondary" :to="externalMapsUrl" target="_blank">
        Abrir no Google Maps
      </UiButton>
    </div>
  </PublicEditorialSection>
</template>
