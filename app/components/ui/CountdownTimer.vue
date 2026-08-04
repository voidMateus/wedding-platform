<script setup lang="ts">
import { useNow } from '@vueuse/core'

interface Props {
  targetDateTime: string
  /**
   * Estilo visual (configurável via `theme_config.countdownStyle`, CLAUDE.md
   * Fase Premium Experience/PR2): 'cards' é o padrão histórico (caixas com
   * borda, autocontidas — sempre usa as próprias cores `text-primary`/
   * `text-text-muted`, funciona sobre qualquer fundo); 'inline' é tipográfico,
   * sem caixas, e por isso precisa herdar a cor de texto do contexto (ver
   * prop `inverted`).
   */
  variant?: 'cards' | 'inline'
  /** Só relevante para variant="inline" — usado sobre foto de capa (Hero), onde o texto precisa ser branco em vez da cor de heading padrão. */
  inverted?: boolean
}

const { targetDateTime, variant = 'cards', inverted = false } = defineProps<Props>()

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
    v-else-if="variant === 'inline'"
    v-motion
    :initial="{ opacity: 0, y: 16 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
    class="flex items-start justify-center gap-5 sm:gap-8"
  >
    <div v-for="unit in units" :key="unit.label" class="flex flex-col items-center gap-1">
      <span
        class="font-display text-3xl font-semibold tabular-nums sm:text-4xl"
        :class="inverted ? 'text-white' : 'text-primary'"
      >
        {{ String(unit.value).padStart(2, '0') }}
      </span>
      <span
        class="text-[11px] uppercase tracking-wide"
        :class="inverted ? 'text-white/70' : 'text-secondary'"
      >
        {{ unit.label }}
      </span>
    </div>
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
