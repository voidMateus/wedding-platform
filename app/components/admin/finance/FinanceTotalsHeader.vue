<!--
  O cabeçalho do Orçamento: a viagem do dinheiro em quatro paradas.

    Orçado -> Estimado -> Contratado -> Pago -> A pagar

  Cada uma responde uma pergunta diferente do casal, e é justamente por isso
  que elas não podem virar um número só: "quanto reservei", "quanto acho que
  vai custar", "quanto já fechei" e "quanto já saiu" acontecem em momentos
  diferentes do planejamento.

  As quatro paradas NÃO têm o mesmo peso. "A pagar" é a pergunta que o casal
  repete toda semana, então ela é o número grande; as outras três são o
  caminho até ela. Com todas no mesmo tamanho, a faixa não dizia por onde
  começar a olhar — que era o estado anterior.

  Bloco sem base não aparece zerado — some (docs/fase1-financeiro.md, decisão
  11). Sem teto definido, a viagem começa em Estimado.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { ResumoFinanceiro } from '~/types/finance'

interface Props {
  resumo: ResumoFinanceiro
  /** Base do módulo (`/admin/<slug>/financeiro`) — destino do aviso de estouro. */
  base: string
}

const { resumo, base } = defineProps<Props>()

const emit = defineEmits<{
  editarTeto: []
}>()

interface Parada {
  chave: string
  label: string
  valor: number
  apoio: string | null
}

// As três paradas de apoio, na ordem em que acontecem na vida do gasto.
// "Orçado" não entra: ele já é o assunto do bloco de cima (o teto e a
// distribuição por categoria).
const paradas = computed<Parada[]>(() => [
  {
    chave: 'estimado',
    label: 'Estimado',
    valor: resumo.estimado,
    apoio:
      resumo.aContratar > 0 ? `faltam ${formatCentsToBRL(resumo.aContratar)} para fechar` : null,
  },
  {
    chave: 'contratado',
    label: 'Contratado',
    valor: resumo.contratado,
    apoio:
      resumo.percentualContratado === null ? null : `${resumo.percentualContratado}% do estimado`,
  },
  {
    chave: 'pago',
    label: 'Pago',
    valor: resumo.pago,
    apoio: resumo.percentualPago === null ? null : `${resumo.percentualPago}% do contratado`,
  },
])

const estouro = computed(() => resumo.atencao.acimaDoOrcado)
</script>

<template>
  <div class="flex flex-col gap-px overflow-clip rounded-lg border border-border bg-border">
    <!-- O teto do casamento inteiro fica acima da viagem: é o limite dentro do
         qual tudo o mais acontece, não mais uma parada. Daí ser menor que "A
         pagar" — é contexto que se digita uma vez, não resultado que muda. -->
    <div
      class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-surface-elevated px-4 py-3 sm:px-5"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
          Orçamento do casamento
        </p>
        <p v-if="resumo.teto !== null" class="num text-xl font-semibold text-text">
          {{ formatCentsToBRL(resumo.teto) }}
        </p>
        <p v-else class="mt-0.5 text-sm text-text-muted">
          Defina quanto vocês têm para gastar e acompanhe quanto já tem destino.
        </p>
        <p v-if="resumo.naoDistribuido !== null" class="mt-0.5 text-sm text-text-muted">
          <template v-if="resumo.naoDistribuido > 0">
            <span class="num text-text">{{ formatCentsToBRL(resumo.naoDistribuido) }}</span>
            ainda sem destino
          </template>
          <template v-else-if="resumo.naoDistribuido < 0">
            <span class="num text-danger">
              {{ formatCentsToBRL(Math.abs(resumo.naoDistribuido)) }}
            </span>
            distribuídos além do total
          </template>
          <template v-else>Todo o orçamento já está distribuído.</template>
        </p>
      </div>
      <UiButton variant="ghost" size="sm" @click="emit('editarTeto')">
        {{ resumo.teto === null ? 'Definir' : 'Editar' }}
      </UiButton>
    </div>

    <dl class="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
      <div v-for="parada in paradas" :key="parada.chave" class="bg-surface-elevated px-4 py-3.5">
        <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">
          {{ parada.label }}
        </dt>
        <dd class="num mt-0.5 text-lg font-semibold text-text">
          {{ formatCentsToBRL(parada.valor) }}
        </dd>
        <dd v-if="parada.apoio" class="mt-0.5 text-xs text-text-muted">{{ parada.apoio }}</dd>
      </div>

      <!-- O destaque da faixa: fundo próprio e o número maior da tela. -->
      <div class="bg-surface-muted/70 px-4 py-3.5">
        <dt class="text-xs font-semibold uppercase tracking-wide text-text">A pagar</dt>
        <!-- `text-xl` no celular: em meia largura de 390px, o número em 24px
             encostava na borda da célula. -->
        <dd class="num mt-0.5 text-xl font-semibold text-text sm:text-2xl">
          {{ formatCentsToBRL(resumo.aPagar) }}
        </dd>
        <dd v-if="resumo.naoParcelado > 0" class="mt-0.5 text-xs text-text-muted">
          {{ formatCentsToBRL(resumo.naoParcelado) }} sem data marcada
        </dd>
      </div>
    </dl>

    <!-- O estouro era calculado, entregue pela API e não aparecia em lugar
         nenhum desta tela: o único sinal era uma parcela de string cinza na
         faixa da categoria. Aqui ele também é o produtor do recorte
         `?recorte=estouro`, que existia sem nada que o acionasse. -->
    <NuxtLink
      v-if="estouro.valor > 0"
      :to="`${base}?recorte=estouro`"
      class="flex flex-wrap items-center gap-x-2 gap-y-1 bg-danger/5 px-4 py-2.5 text-sm text-danger transition-brand hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
    >
      <Icon name="lucide:triangle-alert" class="h-4 w-4 shrink-0" />
      <span>
        <span class="num font-semibold">{{ formatCentsToBRL(estouro.valor) }}</span>
        acima do orçado em
        {{ estouro.quantidade }}
        {{ estouro.quantidade === 1 ? 'categoria' : 'categorias' }}
      </span>
      <span class="ml-auto text-xs">ver só elas</span>
    </NuxtLink>
  </div>
</template>
