<!--
  O cabeçalho do Orçamento: a viagem do dinheiro em quatro paradas.

    Orçado -> Estimado -> Contratado -> Pago

  Cada uma responde uma pergunta diferente do casal, e é justamente por isso
  que elas não podem virar um número só: "quanto reservei", "quanto acho que
  vai custar", "quanto já fechei" e "quanto já saiu" acontecem em momentos
  diferentes do planejamento.

  Bloco sem base não aparece zerado — some (docs/fase1-financeiro.md, decisão
  11). Sem teto definido, a viagem começa em Estimado.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { ResumoFinanceiro } from '~/types/finance'

interface Props {
  resumo: ResumoFinanceiro
}

const { resumo } = defineProps<Props>()

const emit = defineEmits<{
  editarTeto: []
}>()

interface Parada {
  chave: string
  label: string
  valor: number
  apoio: string | null
  destaque?: boolean
}

const paradas = computed<Parada[]>(() => {
  const lista: Parada[] = []

  if (resumo.orcado > 0) {
    lista.push({
      chave: 'orcado',
      label: 'Orçado',
      valor: resumo.orcado,
      apoio: resumo.aPlanejar > 0 ? `${formatCentsToBRL(resumo.aPlanejar)} sem destino` : null,
    })
  }

  lista.push({
    chave: 'estimado',
    label: 'Estimado',
    valor: resumo.estimado,
    apoio:
      resumo.aContratar > 0 ? `faltam ${formatCentsToBRL(resumo.aContratar)} para fechar` : null,
  })

  lista.push({
    chave: 'contratado',
    label: 'Contratado',
    valor: resumo.contratado,
    apoio:
      resumo.percentualContratado === null ? null : `${resumo.percentualContratado}% do estimado`,
  })

  lista.push({
    chave: 'pago',
    label: 'Pago',
    valor: resumo.pago,
    apoio: resumo.aPagar > 0 ? `${formatCentsToBRL(resumo.aPagar)} ainda a pagar` : null,
  })

  return lista
})
</script>

<template>
  <div class="flex flex-col gap-px overflow-clip rounded-lg border border-border bg-border">
    <!-- O teto do casamento inteiro fica acima da viagem: é o limite dentro do
         qual tudo o mais acontece, não mais uma parada. -->
    <div
      class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-surface-elevated px-4 py-3 sm:px-5"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
          Orçamento do casamento
        </p>
        <p v-if="resumo.teto !== null" class="font-display text-2xl font-semibold text-text">
          {{ formatCentsToBRL(resumo.teto) }}
        </p>
        <p v-else class="mt-0.5 text-sm text-text-muted">
          Defina quanto vocês têm para gastar e acompanhe quanto já tem destino.
        </p>
        <p v-if="resumo.naoDistribuido !== null" class="mt-0.5 text-xs text-text-muted">
          <template v-if="resumo.naoDistribuido > 0">
            {{ formatCentsToBRL(resumo.orcado) }} distribuídos em categorias ·
            {{ formatCentsToBRL(resumo.naoDistribuido) }} ainda sem destino
          </template>
          <template v-else-if="resumo.naoDistribuido < 0">
            {{ formatCentsToBRL(Math.abs(resumo.naoDistribuido)) }} distribuídos além do total
          </template>
          <template v-else>Todo o orçamento já está distribuído.</template>
        </p>
      </div>
      <UiButton variant="outline" size="sm" @click="emit('editarTeto')">
        {{ resumo.teto === null ? 'Definir' : 'Editar' }}
      </UiButton>
    </div>

    <dl class="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      <div v-for="parada in paradas" :key="parada.chave" class="bg-surface-elevated px-4 py-3.5">
        <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
          {{ parada.label }}
        </dt>
        <dd class="mt-0.5 font-display text-xl font-semibold tabular-nums text-text">
          {{ formatCentsToBRL(parada.valor) }}
        </dd>
        <dd v-if="parada.apoio" class="mt-0.5 text-xs text-text-muted">{{ parada.apoio }}</dd>
      </div>
    </dl>
  </div>
</template>
