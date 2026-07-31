<script setup lang="ts">
import { EVENT_SEGMENT_ICONS, classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

interface Props {
  segments: EventSegment[]
}

defineProps<Props>()

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function iconFor(title: string): string {
  return EVENT_SEGMENT_ICONS[classifyEventSegmentTitle(title)]
}
</script>

<template>
  <section v-if="segments.length" id="cronograma" class="bg-surface-muted px-4 py-20 sm:py-28">
    <div class="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
      <UiSectionDivider />
      <h2 class="font-display text-3xl font-semibold text-heading sm:text-4xl">Programação</h2>
    </div>
    <ol class="relative mx-auto mt-10 flex max-w-lg flex-col gap-8">
      <div
        class="absolute bottom-5 left-[1.375rem] top-5 w-px bg-secondary/30"
        aria-hidden="true"
      />
      <li
        v-for="(segment, index) in segments"
        :key="segment.id"
        v-motion
        :initial="{ opacity: 0, x: -16 }"
        :visible-once="{ opacity: 1, x: 0, transition: { duration: 400, delay: index * 80 } }"
        class="flex gap-4"
      >
        <span
          class="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-secondary/40 bg-surface-elevated text-secondary shadow-sm"
        >
          <Icon :name="iconFor(segment.title)" class="h-5 w-5" />
        </span>
        <div class="flex flex-1 flex-col gap-1 rounded-lg border border-border bg-surface-elevated p-4 shadow-sm">
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-medium text-text">{{ segment.title }}</span>
            <span v-if="formatTime(segment.starts_at)" class="text-sm text-text-muted">
              {{ formatTime(segment.starts_at) }}
            </span>
          </div>
          <p v-if="segment.venue_name" class="text-sm text-text-muted">{{ segment.venue_name }}</p>
          <p v-if="segment.venue_address" class="text-sm text-text-muted">{{ segment.venue_address }}</p>
        </div>
      </li>
    </ol>
  </section>
</template>
