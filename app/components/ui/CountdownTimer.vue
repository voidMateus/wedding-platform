<script setup lang="ts">
import { useNow } from '@vueuse/core'

interface Props {
  targetDateTime: string
}

const { targetDateTime } = defineProps<Props>()

const now = useNow({ interval: 1000 })

const target = computed(() => new Date(targetDateTime))
const diffMs = computed(() => Math.max(0, target.value.getTime() - now.value.getTime()))
const isPast = computed(() => target.value.getTime() - now.value.getTime() <= 0)

const days = computed(() => Math.floor(diffMs.value / (1000 * 60 * 60 * 24)))
const hours = computed(() => Math.floor((diffMs.value / (1000 * 60 * 60)) % 24))
const minutes = computed(() => Math.floor((diffMs.value / (1000 * 60)) % 60))
const seconds = computed(() => Math.floor((diffMs.value / 1000) % 60))

const units = computed(() => [
  { label: 'dias', value: days.value },
  { label: 'horas', value: hours.value },
  { label: 'min', value: minutes.value },
  { label: 'seg', value: seconds.value },
])
</script>

<template>
  <div v-if="isPast">
    <slot name="past">
      <p class="text-text-muted">O grande dia chegou!</p>
    </slot>
  </div>
  <div
    v-else
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    class="flex gap-3 sm:gap-4"
  >
    <div
      v-for="unit in units"
      :key="unit.label"
      class="flex w-16 flex-col items-center gap-1 rounded-lg border border-border bg-surface px-2 py-3 shadow-sm sm:w-20"
    >
      <span class="font-display text-2xl font-semibold text-primary tabular-nums sm:text-3xl">
        {{ String(unit.value).padStart(2, '0') }}
      </span>
      <span class="text-xs uppercase tracking-wide text-text-muted">{{ unit.label }}</span>
    </div>
  </div>
</template>
