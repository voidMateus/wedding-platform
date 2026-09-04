<!--
  Faixa horizontal de métricas secundárias — substitui a grade de stat cards
  de peso igual (todos com ícone, borda e sombra competindo entre si). Aqui
  cada métrica é só rótulo pequeno em caixa alta + número tabular, separados
  por régua vertical de 1px.
-->
<script setup lang="ts">
export interface AdminMetric {
  label: string
  value: string | number
  /**
   * Destaque em cor. 'primary' é o acento da paleta (no máximo um por faixa —
   * ex.: confirmações de hoje); 'danger' é para número que representa falha
   * exigindo ação (ex.: pagamentos com falha), seguindo o mapa de estados.
   */
  tone?: 'primary' | 'danger'
}

interface Props {
  metrics: readonly AdminMetric[]
}

const { metrics } = defineProps<Props>()

// Colunas acompanham a quantidade de métricas: com 2 numa grade de 4, elas
// ficariam apertadas na metade esquerda e a régua vertical cairia no meio do
// vazio.
const TONE_CLASS = {
  default: 'text-text',
  primary: 'text-primary',
  danger: 'text-danger',
} as const

const columnClass = computed(() => {
  if (metrics.length <= 2) return 'sm:grid-cols-2'
  if (metrics.length === 3) return 'sm:grid-cols-3'
  return 'sm:grid-cols-4'
})
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-y-4 rounded-lg border border-border bg-surface-muted/40 py-4 sm:gap-y-0 sm:divide-x sm:divide-border"
    :class="columnClass"
  >
    <div v-for="metric in metrics" :key="metric.label" class="px-4 sm:px-5">
      <dt class="text-xs font-medium text-text-muted">{{ metric.label }}</dt>
      <dd class="num mt-1 text-2xl font-semibold" :class="TONE_CLASS[metric.tone ?? 'default']">
        {{ metric.value }}
      </dd>
    </div>
  </dl>
</template>
