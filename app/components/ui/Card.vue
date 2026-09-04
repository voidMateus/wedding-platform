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
   * CTA — ex.: prazo de RSVP no dashboard. 'plain' descarta moldura
   * (borda/fundo/sombra/raio) e mantém só a estrutura header/corpo/footer —
   * para quando o contêiner pai já é a moldura, como o corpo de um modal.
   */
  variant?: 'default' | 'interactive' | 'highlight' | 'plain'
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
  plain: '',
}

// Mesmo mecanismo do UiButton: o layout do admin injeta o contexto e o
// componente compartilhado se adapta, em vez de cada chamador passar props.
// No admin (direção "livro de registro") o cartão vira painel de borda 1px sem
// sombra — vários cartões elevados na mesma tela de dados competem pelo peso
// visual, que ali é reservado a um único bloco por tela. No site público o
// tier premium (radius/shadow xl de GiftCard e afins) fica intacto.
// Consequência: radius/elevation viram os botões de ajuste do site público —
// no admin o tratamento é sempre o plano, sem caso de exceção.
const isAdminContext = inject(ADMIN_UI_CONTEXT_KEY, false)

const frameClasses = computed(() => {
  if (variant === 'plain') return ''
  return [
    'border border-border bg-surface-elevated',
    isAdminContext ? 'rounded-lg' : `${radiusClasses[radius]} ${elevationClasses[elevation]}`,
  ]
})
</script>

<template>
  <div :class="[frameClasses, paddingClasses[padding], variantClasses[variant]]">
    <div v-if="$slots.header" class="mb-3 flex items-center justify-between gap-2">
      <slot name="header" />
    </div>
    <slot />
    <div v-if="$slots.footer" class="mt-3 flex items-center justify-end gap-2">
      <slot name="footer" />
    </div>
  </div>
</template>
