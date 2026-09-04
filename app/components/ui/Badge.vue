<script setup lang="ts">
interface Props {
  /**
   * Estado (neutral/success/warning/danger) segue o mapa único de
   * app/utils/status-presentation.ts. 'primary' é o canal de
   * identidade/papel — dono, padrinho, madrinha —, nunca de estado.
   */
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary'
}

const { tone = 'neutral' } = defineProps<Props>()

// 'primary' é o único sem preenchimento, de propósito: a cor primária é
// configurável por casamento e o validador (shared/utils/contrast.ts) só
// garante o mínimo AA dela contra a superfície da página. Sobre um fundo
// tingido a conta muda — com o pior primary permitido (4.54:1 contra branco),
// `bg-primary/10` derruba o texto para 4.02:1, abaixo de AA. Sem
// preenchimento, o texto fica sobre a mesma superfície que o validador
// checa, então o badge herda exatamente a garantia que já existe.
const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  neutral: 'bg-surface-muted text-text',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger/10 text-danger',
  primary: 'border border-primary/40 text-primary',
}
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      toneClasses[tone],
    ]"
  >
    <slot />
  </span>
</template>
