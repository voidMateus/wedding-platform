<script setup lang="ts">
import { anchorForEventSegmentTitle, classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  /** Um ou mais segmentos que compartilham local (CLAUDE.md, §12.2) — o primeiro é sempre o dono dos dados de local/mapa. */
  segments: EventSegment[]
}

const { segments } = defineProps<Props>()

const primary = computed(() => segments[0]!)

function badgeLabelFor(segment: EventSegment): string {
  const kind = classifyEventSegmentTitle(segment.title)
  return kind === 'other' ? segment.title : segment.title.toUpperCase()
}

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function timeRangeFor(segment: EventSegment): string | null {
  const start = formatTime(segment.starts_at)
  const end = formatTime(segment.ends_at)
  if (start && end) return `${start} – ${end}`
  return start
}

const sectionTitle = computed(() => segments.map((s) => s.title).join(' e '))

// Âncoras internas (#cerimonia/#recepcao) — mantidas para compatibilidade
// com links diretos já compartilhados, mesmo que o card não seja mais uma
// seção própria (agora vive dentro de "O Grande Dia", ver GrandeDiaSection).
const anchorIds = computed(() => {
  const seen = new Set<string>()
  for (const segment of segments) {
    const anchor = anchorForEventSegmentTitle(segment.title)
    if (anchor) seen.add(anchor)
  }
  return [...seen]
})

const locationQuery = computed(() => {
  const segment = primary.value
  if (segment.venue_latitude !== null && segment.venue_longitude !== null) {
    return `${segment.venue_latitude},${segment.venue_longitude}`
  }
  const address = [segment.venue_name, segment.venue_address].filter(Boolean).join(', ')
  return address || null
})

const externalMapsUrl = computed(() =>
  locationQuery.value
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery.value)}`
    : null,
)
</script>

<template>
  <div class="flex w-full flex-col gap-4 rounded-lg border border-border bg-surface-elevated p-6 shadow-md">
    <span v-for="anchorId in anchorIds" :id="anchorId" :key="anchorId" aria-hidden="true" class="sr-only" />

    <div v-for="segment in segments" :key="segment.id" class="flex flex-col gap-1">
      <span
        class="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
      >
        {{ badgeLabelFor(segment) }}
      </span>
      <p v-if="timeRangeFor(segment)" class="text-sm font-medium text-text-muted">{{ timeRangeFor(segment) }}</p>
    </div>

    <div v-if="primary.venue_name || primary.venue_address" class="flex flex-col gap-1">
      <h3 v-if="primary.venue_name" class="font-display text-2xl font-semibold text-heading">
        {{ primary.venue_name }}
      </h3>
      <p v-if="primary.venue_address" class="flex items-start gap-1.5 text-sm text-text-muted">
        <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0" />
        {{ primary.venue_address }}
      </p>
    </div>

    <PublicVenueMap v-if="locationQuery" :query="locationQuery" :label="primary.venue_name || sectionTitle" />

    <UiButton
      v-if="externalMapsUrl"
      variant="outline"
      rounded="full"
      size="sm"
      class="self-start"
      :to="externalMapsUrl"
      target="_blank"
    >
      <Icon name="lucide:external-link" class="h-4 w-4" />
      Abrir no Google Maps
    </UiButton>
  </div>
</template>
