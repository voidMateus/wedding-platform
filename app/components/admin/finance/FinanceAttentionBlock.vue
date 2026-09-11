<!--
  "Precisa da sua atenção" — o bloco que responde o que exige providência AGORA.

  Três linhas com a mesma forma (valor primeiro, porque dinheiro é a unidade do
  módulo; quantidade como contexto), cada uma levando ao recorte
  correspondente. Linha sem ocorrência não aparece zerada: some. Sem nenhuma
  das três, o bloco inteiro some — e essa ausência é a informação ("está tudo
  em dia").
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { ResumoFinanceiro } from '~/types/finance'

interface Props {
  resumo: ResumoFinanceiro
  /** Base das rotas do módulo (`/admin/{slug}/financeiro`). */
  base: string
}

const { resumo, base } = defineProps<Props>()

interface LinhaDeAtencao {
  chave: string
  valor: number
  descricao: string
  contexto: string
  destino: string
  tone: 'danger' | 'warning'
}

const linhas = computed<LinhaDeAtencao[]>(() => {
  const { vencidos, proximos30Dias, acimaDoPlanejado } = resumo.atencao
  const lista: LinhaDeAtencao[] = []

  if (vencidos.quantidade > 0) {
    lista.push({
      chave: 'vencidos',
      valor: vencidos.valor,
      descricao: 'vencidos',
      contexto: `${vencidos.quantidade} parcela${vencidos.quantidade === 1 ? '' : 's'}`,
      destino: `${base}/orcamento?vencimento=vencidos`,
      tone: 'danger',
    })
  }

  if (proximos30Dias.quantidade > 0) {
    lista.push({
      chave: 'proximos',
      valor: proximos30Dias.valor,
      descricao: 'nos próximos 30 dias',
      contexto: `${proximos30Dias.quantidade} parcela${proximos30Dias.quantidade === 1 ? '' : 's'}`,
      destino: `${base}/orcamento?vencimento=proximos`,
      tone: 'warning',
    })
  }

  if (acimaDoPlanejado.quantidade > 0) {
    lista.push({
      chave: 'estouro',
      valor: acimaDoPlanejado.valor,
      descricao: 'acima do planejado',
      contexto: `${acimaDoPlanejado.quantidade} categoria${acimaDoPlanejado.quantidade === 1 ? '' : 's'}`,
      destino: `${base}/orcamento?recorte=estouro`,
      tone: 'warning',
    })
  }

  return lista
})

const TONE_CLASS = {
  danger: 'text-danger',
  warning: 'text-warning',
} as const
</script>

<template>
  <AdminPanel v-if="linhas.length > 0" title="Precisa da sua atenção">
    <ul class="divide-y divide-border">
      <li v-for="linha in linhas" :key="linha.chave">
        <NuxtLink
          :to="linha.destino"
          class="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-muted/60 sm:px-5"
        >
          <span
            class="font-display text-lg font-semibold tabular-nums"
            :class="TONE_CLASS[linha.tone]"
          >
            {{ formatCentsToBRL(linha.valor) }}
          </span>
          <span class="text-sm text-text">{{ linha.descricao }}</span>
          <span class="ml-auto text-xs text-text-muted">{{ linha.contexto }}</span>
        </NuxtLink>
      </li>
    </ul>
  </AdminPanel>
</template>
