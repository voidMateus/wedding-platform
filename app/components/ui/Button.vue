<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  /** 'full' = formato pill (cápsula) — CTAs de destaque (Hero, navbar). */
  rounded?: 'md' | 'full'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  /** Quando definido, renderiza como NuxtLink (CTA de navegação) em vez de <button>. */
  to?: string
  /** Só relevante com `to` — ex.: "_blank" para links externos (mapa, redes sociais). */
  target?: string
}

const {
  variant = 'primary',
  size = 'md',
  rounded = 'md',
  disabled = false,
  type = 'button',
  to,
  target,
} = defineProps<Props>()

const roundedClasses: Record<NonNullable<Props['rounded']>, string> = {
  md: 'rounded-md',
  full: 'rounded-full',
}

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  secondary: 'bg-surface-muted text-text hover:bg-border',
  outline: 'border border-current bg-transparent text-primary hover:bg-primary/10',
  ghost: 'bg-transparent text-text hover:bg-surface-muted',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-colors [font-family:var(--font-button)]',
      roundedClasses[rounded],
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-colors [font-family:var(--font-button)]',
      roundedClasses[rounded],
      'disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      variantClasses[variant],
      sizeClasses[size],
    ]"
  >
    <slot />
  </button>
</template>
