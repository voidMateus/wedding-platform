<script setup lang="ts">
interface Props {
  padding?: 'none' | 'sm' | 'md'
  /** 'xl' = tratamento premium (raio/sombra maiores) — cartões de vitrine do site público (ex.: GiftCard). Default 'lg' cobre o resto da plataforma, incluindo todo o admin. */
  radius?: 'lg' | 'xl'
  elevation?: 'sm' | 'xl'
}

const { padding = 'md', radius = 'lg', elevation = 'sm' } = defineProps<Props>()

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
</script>

<template>
  <div
    class="border border-border bg-surface-elevated"
    :class="[radiusClasses[radius], elevationClasses[elevation], paddingClasses[padding]]"
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
