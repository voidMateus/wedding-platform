<!--
  Os quatro estágios do dinheiro (docs/fase1-financeiro.md, seção 1.1):
  Planejado -> Contratado -> Pago -> A pagar.

  Quatro números em destaque e as derivadas como FRASE DE APOIO dentro do bloco
  a que pertencem (decisão 10): o resumo tem oito leituras possíveis, e mostrar
  as oito com o mesmo peso é uma parede de números que não decide nada.

  Degradação (decisão 11): bloco sem base não aparece zerado — some. Sem nada
  planejado, "Planejado" sai da faixa e a narrativa começa em "Contratado".
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { ResumoFinanceiro } from '~/types/finance'

interface Props {
  resumo: ResumoFinanceiro
}

const { resumo } = defineProps<Props>()

interface Estagio {
  chave: string
  label: string
  valor: number
  apoio: string[]
}

const estagios = computed<Estagio[]>(() => {
  const lista: Estagio[] = []

  if (resumo.planejado > 0) {
    lista.push({
      chave: 'planejado',
      label: 'Planejado',
      valor: resumo.planejado,
      apoio: [`em ${resumo.porCategoria.filter((c) => c.previsto > 0).length} categorias`],
    })
  }

  const apoioContratado: string[] = []
  if (resumo.percentualContratado !== null) {
    apoioContratado.push(`${resumo.percentualContratado}% do planejado`)
  }
  if (resumo.aContratar > 0) {
    apoioContratado.push(`faltam ${formatCentsToBRL(resumo.aContratar)} para contratar`)
  }
  lista.push({
    chave: 'contratado',
    label: 'Contratado',
    valor: resumo.contratado,
    apoio: apoioContratado,
  })

  lista.push({
    chave: 'pago',
    label: 'Pago',
    valor: resumo.pago,
    apoio: resumo.percentualPago === null ? [] : [`${resumo.percentualPago}% do contratado`],
  })

  lista.push({
    chave: 'a-pagar',
    label: 'A pagar',
    valor: resumo.aPagar,
    // "Não parcelado" é PARTE do "a pagar" (a que ainda não tem data), nunca um
    // número concorrente: por isso vive aqui dentro, e não como quinto cartão.
    apoio:
      resumo.naoParcelado > 0
        ? [`${formatCentsToBRL(resumo.naoParcelado)} ainda não parcelados`]
        : [],
  })

  return lista
})

const colunas = computed(() =>
  estagios.value.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4',
)
</script>

<template>
  <dl
    class="grid grid-cols-1 gap-px overflow-clip rounded-lg border border-border bg-border"
    :class="colunas"
  >
    <div v-for="estagio in estagios" :key="estagio.chave" class="bg-surface-elevated px-4 py-4">
      <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
        {{ estagio.label }}
      </dt>
      <dd class="mt-1 font-display text-2xl font-semibold tabular-nums text-text">
        {{ formatCentsToBRL(estagio.valor) }}
      </dd>
      <dd v-if="estagio.apoio.length" class="mt-1.5 space-y-0.5">
        <p v-for="frase in estagio.apoio" :key="frase" class="text-xs text-text-muted">
          {{ frase }}
        </p>
      </dd>
    </div>
  </dl>
</template>
