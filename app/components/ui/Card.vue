<script setup lang="ts">
interface Props {
  padding?: 'none' | 'sm' | 'md'
  /** 'lg' é o degrau reduzido, reservado a cartões densamente empilhados onde o raio/sombra grandes competiriam entre si. Default 'xl' (tratamento premium) cobre o resto da plataforma, público e admin. */
  radius?: 'lg' | 'xl'
  elevation?: 'sm' | 'xl'
  /**
   * 'default' preserva o comportamento atual (estático). 'interactive' ganha
   * hover no degrau médio da escala (radius-md/shadow-md) — para cards
   * clicáveis (stat tiles, itens de lista). 'highlight' dá ênfase visual
   * leve (fundo/borda na cor primária) para cards de destaque, sem virar um
   * CTA — ex.: prazo de RSVP no dashboard.
   */
  variant?: 'default' | 'interactive' | 'highlight'
}

const {
  padding = 'md',
  radius = 'xl',
  elevation = 'xl',
  variant = 'default',
} = defineProps<Props>()

const paddingClasses: Record<NonNullable<Props['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
}

const radiusClasses: Record<NonNullable<Props['radius']>, string> = {
  lg: 'rounded-lg',
  xl: 'rounded-xl',
}

const elevationClasses: Record<NonNullable<Props['elevation']>, string> = {
  sm: 'shadow-sm',
  xl: 'shadow-xl',
}

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  default: '',
  interactive: 'transition-brand hover:shadow-md hover:!border-primary/20 cursor-pointer',
  highlight: 'bg-primary/[0.03] !border-primary/20',
}
</script>

<template>
  <div
    class="border border-border bg-surface-elevated"
    :class="[
      radiusClasses[radius],
      elevationClasses[elevation],
      paddingClasses[padding],
      variantClasses[variant],
    ]"
  >
    <div v-if="$slots.header" class="mb-3 flex items-center justify-between gap-2">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-3 flex items-center justify-end gap-2">
      <slot name="footer" />
    </div>
  </div>
</template>
