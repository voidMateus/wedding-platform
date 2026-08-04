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
  primary: 'bg-primary text-primary-foreground hover:opacity-90 hover:shadow-md',
  secondary: 'bg-surface-muted text-text hover:bg-border',
  outline: 'border border-primary/25 bg-surface-elevated/70 text-primary backdrop-blur-sm hover:bg-primary/10',
  ghost: 'bg-transparent text-text hover:bg-surface-muted',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

// CTAs em pill (rounded="full") — convenção do site público — têm uma
// identidade única de "convite de luxo": rótulo uppercase tracked pequeno
// (mesma linguagem em todo o site, Fase Linguagem Visual), leve "lift" no
// hover/active e, quando também primary, uma sombra colorida (glow) na cor
// do tema. Botões `rounded="md"` (padrão do admin/formulários) ficam de
// fora — o admin prioriza escaneabilidade sobre decoração (CLAUDE.md, §21).
const pillClasses = computed(() =>
  rounded === 'full'
    ? [
        '!text-xs font-semibold uppercase tracking-[0.16em]',
        'hover:scale-[1.03] active:scale-95',
        variant === 'primary'
          ? 'shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]'
          : '',
      ]
    : [],
)
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] transition-brand [font-family:var(--font-button)]',
      roundedClasses[rounded],
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      variantClasses[variant],
      sizeClasses[size],
      pillClasses,
    ]"
  >
    <slot />
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-all active:scale-[0.98] transition-brand [font-family:var(--font-button)]',
      roundedClasses[rounded],
      'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      variantClasses[variant],
      sizeClasses[size],
      pillClasses,
    ]"
  >
    <slot />
  </button>
</template>
