<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

const { wedding } = defineProps<Props>()

const theme = computed(() => (wedding.theme_config ?? {}) as Partial<ThemeConfig>)
const showCountdown = computed(() => theme.value.showCountdown ?? true)
const targetDateTime = computed(() =>
  resolveEventDateTime(wedding.event_date, wedding.event_time).toISOString(),
)
</script>

<template>
  <PublicEditorialSection
    v-if="showCountdown"
    id="contagem-regressiva"
    title="Estamos quase lá"
    tone="accent"
  >
    <div class="flex justify-center">
      <UiCountdownTimer :target-date-time="targetDateTime">
        <template #past>
          <p class="text-lg font-medium text-primary">O grande dia chegou!</p>
        </template>
      </UiCountdownTimer>
    </div>
  </PublicEditorialSection>
</template>
