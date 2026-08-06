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
  rounded = 'full',
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
  // Borda sutil sempre visível (não só no hover) — um ghost puramente
  // transparente, empilhado sobre uma linha de tabela/card que já tem o
  // mesmo tom de fundo, lê como texto solto, sem affordance de botão.
  ghost: 'border border-border/60 bg-transparent text-text hover:border-border hover:bg-surface-muted',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeClasses: Record<NonNullable<Props['size']>, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

// Único ponto de divergência visual deliberado entre admin e site público
// (o resto do Design System é 100% compartilhado, CLAUDE.md §21): o "lift"
// de hover (hover:scale) faz sentido para os poucos CTAs de destaque do
// site público, mas vira ruído numa tela do admin com dezenas de botões
// pill lado a lado — o admin injeta essa flag no layout para suprimir só
// essa parte da animação, mantendo pill/uppercase/glow idênticos.
const isAdminContext = inject(ADMIN_UI_CONTEXT_KEY, false)

// CTAs em pill (rounded="full", agora o default da plataforma inteira) têm
// uma identidade única de "convite de luxo": rótulo uppercase tracked
// pequeno e, quando também primary, uma sombra colorida (glow) na cor do
// tema — sempre presentes. O "lift" de hover/active é condicional, ver
// isAdminContext acima.
const pillClasses = computed(() => {
  if (rounded !== 'full') return []
  return [
    '!text-xs font-semibold uppercase tracking-[0.16em]',
    isAdminContext ? 'active:scale-95' : 'hover:scale-[1.03] active:scale-95',
    variant === 'primary'
      ? 'shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--color-primary)_55%,transparent)]'
      : '',
  ]
})
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
