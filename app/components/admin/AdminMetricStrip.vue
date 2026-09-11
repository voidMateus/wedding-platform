<!--
  Faixa horizontal de métricas — substitui a grade de stat cards de peso igual
  (todos com ícone, borda e sombra competindo entre si). Aqui cada métrica é só
  rótulo pequeno em caixa alta + número tabular.

  Dois desenhos, porque são dois contextos reais:

  - `variant="solta"` (padrão) é a faixa do dashboard e de Presentes: caixa
    própria, fundo suave, réguas verticais entre as métricas.
  - `variant="embutida"` é a faixa que vive DENTRO de outra caixa (o cabeçalho
    do Financeiro, que ainda traz o teto do casamento e o aviso de estouro):
    sem borda e sem cantos próprios, separada só pelas réguas de 1px.

  Antes disso, as três telas do Financeiro escreviam a mesma `<dl>` à mão, com
  três tamanhos diferentes para o mesmo tipo de número.
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
  tone?: 'primary' | 'danger' | 'warning' | 'success'
  /** Linha de apoio abaixo do número ("3 lançamentos", "62% do estimado"). */
  apoio?: string
  /**
   * A métrica que responde a pergunta principal da tela — número maior e fundo
   * próprio. No máximo uma por faixa: com duas, nenhuma é destaque.
   */
  destaque?: boolean
  /**
   * Torna a métrica um botão (ex.: "Aguardando fornecedor" recorta a lista
   * para os gastos sem proposta). Indicador que gera ação vira o filtro dessa
   * ação — e o estado ligado precisa ser visível, daí `ativo`.
   */
  acao?: string
  ativo?: boolean
}

interface Props {
  metrics: readonly AdminMetric[]
  variant?: 'solta' | 'embutida'
  /** Colunas no desktop. Sem valor, acompanha a quantidade de métricas. */
  colunas?: 2 | 3 | 4 | 5
}

const { metrics, variant = 'solta', colunas } = defineProps<Props>()

const emit = defineEmits<{
  acao: [chave: string]
}>()

const TONE_CLASS = {
  default: 'text-text',
  primary: 'text-primary',
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
} as const

// Colunas acompanham a quantidade: com 2 numa grade de 4, elas ficariam
// apertadas na metade esquerda e a régua vertical cairia no meio do vazio.
// A grade da faixa solta é a de sempre (o dashboard e Presentes dependem
// dela); a embutida quebra mais cedo porque divide a largura com o resto do
// cabeçalho e nunca pode deixar célula órfã.
const GRADE_SOLTA = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
} as const

const GRADE_EMBUTIDA = {
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
} as const

const columnClass = computed(() => {
  const quantas = colunas ?? (metrics.length <= 2 ? 2 : metrics.length === 3 ? 3 : 4)
  return variant === 'embutida' ? GRADE_EMBUTIDA[quantas] : GRADE_SOLTA[quantas]
})

const listClass = computed(() =>
  variant === 'embutida'
    ? 'grid gap-px bg-border'
    : 'grid grid-cols-2 gap-y-4 rounded-lg border border-border bg-surface-muted/40 py-4 sm:gap-y-0 sm:divide-x sm:divide-border',
)

function cellClass(metric: AdminMetric): string {
  if (variant !== 'embutida') return 'px-4 sm:px-5'
  if (metric.ativo) return 'bg-primary/10 px-4 py-3.5 text-left ring-1 ring-inset ring-primary'
  if (metric.destaque) return 'bg-surface-muted/70 px-4 py-3.5 text-left'
  return 'bg-surface-elevated px-4 py-3.5 text-left'
}
</script>

<template>
  <dl :class="[listClass, columnClass]">
    <component
      :is="metric.acao ? 'button' : 'div'"
      v-for="metric in metrics"
      :key="metric.label"
      :type="metric.acao ? 'button' : undefined"
      :aria-pressed="metric.acao ? Boolean(metric.ativo) : undefined"
      :class="[
        cellClass(metric),
        metric.acao &&
          'transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      ]"
      @click="metric.acao && emit('acao', metric.acao)"
    >
      <dt
        class="text-xs uppercase tracking-wide"
        :class="metric.destaque ? 'font-semibold text-text' : 'font-medium text-text-muted'"
      >
        {{ metric.label }}
      </dt>
      <dd
        class="num mt-1 font-semibold"
        :class="[
          TONE_CLASS[metric.tone ?? 'default'],
          variant === 'embutida'
            ? metric.destaque
              ? 'text-xl sm:text-2xl'
              : 'text-lg'
            : 'text-2xl',
        ]"
      >
        {{ metric.value }}
      </dd>
      <dd v-if="metric.apoio" class="mt-0.5 text-xs text-text-muted">{{ metric.apoio }}</dd>
    </component>
  </dl>
</template>
