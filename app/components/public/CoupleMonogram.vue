<script setup lang="ts">
// Selo do casal (CLAUDE.md, Fase Premium Experience — peça central da
// Assinatura Visual): iniciais derivadas de `couple_names`
// (shared/utils/couple-initials.ts) dentro de um anel duplo, SVG puro (sem
// lib nova). Puramente decorativo — o nome completo do casal já aparece
// como texto em outro lugar (Hero), então isso nunca é a única forma de
// identificar o casal, por isso aria-hidden.
import { getCoupleInitials } from '#shared/utils/couple-initials'

interface Props {
  coupleNames: string
  size?: 'sm' | 'md' | 'lg'
}

const { coupleNames, size = 'md' } = defineProps<Props>()

const initials = computed(() => getCoupleInitials(coupleNames))

const SIZE_CLASSES: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-32 w-32',
}
</script>

<template>
  <svg
    v-if="initials"
    viewBox="0 0 100 100"
    role="presentation"
    aria-hidden="true"
    class="shrink-0"
    :class="SIZE_CLASSES[size]"
  >
    <circle cx="50" cy="50" r="46" fill="none" class="stroke-secondary/50" stroke-width="1" />
    <circle cx="50" cy="50" r="40" fill="none" class="stroke-secondary/50" stroke-width="1" />
    <text
      x="50"
      y="52"
      text-anchor="middle"
      dominant-baseline="middle"
      class="fill-primary font-display"
      font-size="30"
      letter-spacing="2"
    >
      {{ initials }}
    </text>
  </svg>
</template>
