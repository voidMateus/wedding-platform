<!--
  O único agregado do módulo.

  Era uma régua de quatro cartões (estimado, contratado, pago, a pagar) sobre
  uma faixa de teto, e cada uma das outras telas tinha a sua própria régua
  parecida. Cinco números do mesmo tamanho não dizem por onde começar a olhar,
  e repeti-los em cada tela fazia o casal reconferir se eram os mesmos.

  Agora é um bloco só, uma vez só, e a proporção é FORMA — a barra —, não mais
  três números lidos em sequência. O texto embaixo é prosa com números dentro,
  que se lê de uma vez, em vez de uma grade que se lê célula a célula.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { ResumoFinanceiro } from '~/types/finance'

interface Props {
  resumo: ResumoFinanceiro
  /** Slug do casamento ativo — o link para Presentes sai daqui. */
  slug: string
}

const { resumo, slug } = defineProps<Props>()

const emit = defineEmits<{
  editarTeto: []
}>()

/**
 * A régua da barra é o teto — mas nunca menor que o maior compromisso real,
 * senão uma barra de 100% esconderia justamente o estouro que precisa aparecer.
 */
const regua = computed(() =>
  Math.max(resumo.teto ?? 0, resumo.estimado, resumo.contratado, resumo.pago, 1),
)

function largura(valor: number): string {
  return `${Math.min(100, (valor / regua.value) * 100)}%`
}

/** Quanto do orçamento ainda não tem dono. Sem teto não existe sobra. */
const sobra = computed(() => (resumo.teto === null ? null : resumo.teto - resumo.contratado))
</script>

<template>
  <div class="flex flex-col gap-px overflow-clip rounded-lg border border-border bg-border">
    <div class="flex flex-col gap-3 bg-surface-elevated px-4 py-4 sm:px-5">
      <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div class="min-w-0">
          <p class="text-xs font-medium uppercase tracking-wide text-text-muted">
            Orçamento do casamento
          </p>
          <p v-if="resumo.teto !== null" class="num text-2xl font-semibold text-text">
            {{ formatCentsToBRL(resumo.teto) }}
          </p>
          <p v-else class="mt-0.5 text-sm text-text-muted">
            Defina quanto vocês têm para gastar — é a régua de tudo aqui.
          </p>
        </div>
        <UiButton variant="ghost" size="sm" @click="emit('editarTeto')">
          {{ resumo.teto === null ? 'Definir' : 'Editar' }}
        </UiButton>
      </div>

      <!-- Três camadas na mesma trilha: o que já saiu dentro do que está
           fechado, dentro do que se pretende gastar. A ordem de pintura é do
           mais claro para o mais escuro, então nenhuma esconde a outra. -->
      <div
        class="relative h-2.5 w-full overflow-clip rounded-full bg-surface-muted"
        role="presentation"
      >
        <div
          class="absolute inset-y-0 left-0 bg-primary/20"
          :style="{ width: largura(resumo.estimado) }"
        />
        <div
          class="absolute inset-y-0 left-0 bg-primary/50"
          :style="{ width: largura(resumo.contratado) }"
        />
        <div
          class="absolute inset-y-0 left-0 bg-primary"
          :style="{ width: largura(resumo.pago) }"
        />
      </div>

      <p class="text-sm text-text-muted">
        <span class="num font-medium text-text">{{ formatCentsToBRL(resumo.contratado) }}</span>
        contratados ·
        <span class="num font-medium text-text">{{ formatCentsToBRL(resumo.pago) }}</span>
        pagos
        <!-- A estimativa some quando não há mais nada por fechar: ela é a
             pergunta "quanto isso ainda vai custar", e sem gasto em aberto ela
             não tem mais o que responder. -->
        <template v-if="resumo.aContratar > 0">
          · estimativa total
          <span class="num font-medium text-text">{{ formatCentsToBRL(resumo.estimado) }}</span>
        </template>
      </p>

      <p
        v-if="sobra !== null"
        class="text-sm"
        :class="sobra < 0 ? 'text-danger' : 'text-text-muted'"
      >
        <template v-if="sobra > 0">
          Restam
          <span class="num font-medium text-text">{{ formatCentsToBRL(sobra) }}</span>
          do orçamento.
        </template>
        <template v-else-if="sobra < 0">
          <span class="num font-semibold">{{ formatCentsToBRL(Math.abs(sobra)) }}</span>
          acima do orçamento.
        </template>
        <template v-else>O orçamento está todo comprometido.</template>
      </p>
    </div>

    <!-- O dinheiro que já ENTROU. Separado de propósito: presente recebido não
         abate o que falta pagar (a conta do fornecedor continua inteira), mas
         responde "com quanto já contamos?". -->
    <NuxtLink
      v-if="resumo.entradasPresentes.quantidade > 0"
      :to="`/admin/${slug}/presentes`"
      class="flex flex-wrap items-center gap-x-2 gap-y-1 bg-surface-elevated px-4 py-2.5 text-sm text-text-muted transition-brand hover:bg-surface-muted/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-5"
    >
      <Icon name="lucide:gift" class="h-4 w-4 shrink-0" />
      <span>
        <span class="num font-medium text-text">
          {{ formatCentsToBRL(resumo.entradasPresentes.totalCentavos) }}
        </span>
        já recebidos em presentes, de
        {{ resumo.entradasPresentes.quantidade }}
        {{ resumo.entradasPresentes.quantidade === 1 ? 'pagamento' : 'pagamentos' }}
      </span>
      <span class="ml-auto text-xs">ver em Presentes</span>
    </NuxtLink>
  </div>
</template>
