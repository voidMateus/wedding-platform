<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const formattedDate = computed(() =>
  new Date(`${wedding.event_date}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }),
)

const showCountdown = computed(() => {
  const theme = (wedding.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.showCountdown ?? true
})

const targetDateTime = computed(() =>
  resolveEventDateTime(wedding.event_date, wedding.event_time).toISOString(),
)
</script>

<template>
  <section class="flex flex-col items-center gap-4 px-4 py-20 text-center">
    <p class="text-sm uppercase tracking-widest text-text-muted">Vamos nos casar</p>
    <h1 class="font-display text-4xl font-semibold text-text sm:text-5xl">
      {{ wedding.couple_names }}
    </h1>
    <p class="text-lg text-text-muted">{{ formattedDate }}</p>
    <UiCountdownTimer v-if="showCountdown" :target-date-time="targetDateTime" class="mt-4">
      <template #past>
        <p class="text-lg font-medium text-primary">O grande dia chegou!</p>
      </template>
    </UiCountdownTimer>
  </section>
</template>
