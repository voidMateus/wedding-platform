<script setup lang="ts">
import { useNow } from '@vueuse/core'

interface Props {
  targetDateTime: string
  /** 'cards' (default, usado no dashboard admin) = caixas com borda/sombra; 'inline' = números soltos com separador, sensação de convite (Hero público). */
  variant?: 'cards' | 'inline'
}

const { targetDateTime, variant = 'cards' } = defineProps<Props>()

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
  { label: 'minutos', value: minutes.value },
  { label: 'segundos', value: seconds.value },
])
</script>

<template>
  <div v-if="isPast">
    <slot name="past">
      <p class="text-text-muted">O grande dia chegou!</p>
    </slot>
  </div>
  <div
    v-else-if="variant === 'inline'"
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    class="flex items-stretch gap-4 sm:gap-8"
  >
    <template v-for="(unit, index) in units" :key="unit.label">
      <span v-if="index > 0" data-test="countdown-separator" class="w-px self-stretch bg-secondary/30" aria-hidden="true" />
      <div class="flex flex-col items-center gap-1">
        <span class="font-display text-4xl font-semibold text-heading tabular-nums sm:text-5xl">
          {{ String(unit.value).padStart(2, '0') }}
        </span>
        <span class="text-[10px] uppercase tracking-[0.25em] text-text-muted">{{ unit.label }}</span>
      </div>
    </template>
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
