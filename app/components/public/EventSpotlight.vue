<script setup lang="ts">
import { classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  segment: EventSegment
  id?: string
  tone?: 'default' | 'muted'
}

const { segment, id, tone = 'default' } = defineProps<Props>()

// Só decide o texto do badge (ex.: "CERIMÔNIA") — sem coluna de tipo
// estruturada em event_segments (CLAUDE.md, seção 12), itens fora da
// classificação (chá de panela, coquetel...) caem no próprio título.
const badgeLabel = computed(() => {
  const kind = classifyEventSegmentTitle(segment.title)
  return kind === 'other' ? segment.title : segment.title.toUpperCase()
})

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

// Coordenadas são só um reforço de precisão — na maioria dos casos o
// próprio endereço em texto já geocodifica bem no embed do Google Maps
// (CLAUDE.md, seção 3). Preferidas quando existem, senão cai para o
// endereço; sem nenhum dos dois, nem mapa nem botão aparecem. Sem foto do
// local no card (event_segments não tem coluna de imagem — fora do escopo
// "só front" do redesign de referência, CLAUDE.md "Fase Vermelho Clássico").
const locationQuery = computed(() => {
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
  <PublicEditorialSection :id="id" :title="segment.title" :tone="tone">
    <div
      class="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-lg border border-border bg-surface-elevated p-6 shadow-md"
    >
      <span
        class="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
      >
        {{ badgeLabel }}
      </span>
      <p v-if="timeRange" class="text-sm font-medium text-text-muted">{{ timeRange }}</p>

      <div v-if="segment.venue_name || segment.venue_address" class="flex flex-col gap-1">
        <h3 v-if="segment.venue_name" class="font-display text-2xl font-semibold text-heading">
          {{ segment.venue_name }}
        </h3>
        <p v-if="segment.venue_address" class="flex items-start gap-1.5 text-sm text-text-muted">
          <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0" />
          {{ segment.venue_address }}
        </p>
      </div>

      <PublicVenueMap v-if="locationQuery" :query="locationQuery" :label="segment.venue_name || segment.title" />

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
  </PublicEditorialSection>
</template>
