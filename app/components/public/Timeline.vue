<script setup lang="ts">
import type { EventSegment } from '~/types/event-segment'

interface Props {
  segments: EventSegment[]
}

defineProps<Props>()

function formatTime(value: string | null): string | null {
  if (!value) return null
  return new Date(value).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <section v-if="segments.length" class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
    <h2 class="text-center text-xl font-semibold text-text">Programação</h2>
    <ol class="flex flex-col gap-4">
      <li
        v-for="segment in segments"
        :key="segment.id"
        class="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
      >
        <div class="flex items-baseline justify-between gap-2">
          <span class="font-medium text-text">{{ segment.title }}</span>
          <span v-if="formatTime(segment.starts_at)" class="text-sm text-text-muted">
            {{ formatTime(segment.starts_at) }}
          </span>
        </div>
        <p v-if="segment.venue_name" class="text-sm text-text-muted">{{ segment.venue_name }}</p>
        <p v-if="segment.venue_address" class="text-sm text-text-muted">
          {{ segment.venue_address }}
        </p>
      </li>
    </ol>
  </section>
</template>
