<!--
  "Seu casamento": o orçamento por categoria nos mesmos quatro estágios do
  topo. Cada linha leva à categoria já aberta no Orçamento — a Visão geral
  responde "como estamos", o Orçamento responde "por quê", e a ponte entre as
  duas é um clique.

  As colunas de planejamento (Planejado, e o realce de estouro) só aparecem
  quando existe algum previsto: sem isso, uma coluna inteira de travessões
  ocuparia um terço da tabela dizendo nada (decisão 11).
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { LinhaDeCategoria } from '~/types/finance'

interface Props {
  categorias: LinhaDeCategoria[]
  base: string
}

const { categorias, base } = defineProps<Props>()

const temPlanejamento = computed(() => categorias.some((categoria) => categoria.previsto > 0))

function destino(categoria: LinhaDeCategoria) {
  return categoria.categoriaId
    ? `${base}/orcamento?categoria=${categoria.categoriaId}`
    : `${base}/orcamento`
}

function valorOuTraco(valor: number) {
  return valor > 0 ? formatCentsToBRL(valor) : '—'
}
</script>

<template>
  <AdminPanel title="Seu casamento" :meta="`${categorias.length} categorias`">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[34rem] text-sm">
        <thead>
          <tr class="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th scope="col" class="px-4 py-2.5 text-left font-medium sm:px-5">Categoria</th>
            <th v-if="temPlanejamento" scope="col" class="px-4 py-2.5 text-right font-medium">
              Planejado
            </th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Contratado</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium">Pago</th>
            <th scope="col" class="px-4 py-2.5 text-right font-medium sm:px-5">A pagar</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr
            v-for="categoria in categorias"
            :key="categoria.categoriaId ?? 'sem-categoria'"
            class="transition-colors hover:bg-surface-muted/60"
          >
            <th scope="row" class="px-4 py-3 text-left font-normal sm:px-5">
              <NuxtLink :to="destino(categoria)" class="text-text hover:text-primary">
                {{ categoria.nome }}
              </NuxtLink>
              <span
                v-if="categoria.acimaDoPlanejado > 0"
                class="ml-2 text-xs text-warning"
                :title="`Contratado ${formatCentsToBRL(categoria.acimaDoPlanejado)} acima do planejado`"
              >
                +{{ formatCentsToBRL(categoria.acimaDoPlanejado) }}
              </span>
            </th>
            <td v-if="temPlanejamento" class="px-4 py-3 text-right tabular-nums text-text-muted">
              {{ valorOuTraco(categoria.previsto) }}
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-text">
              {{ valorOuTraco(categoria.contratado) }}
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-text-muted">
              {{ valorOuTraco(categoria.pago) }}
            </td>
            <td class="px-4 py-3 text-right tabular-nums text-text sm:px-5">
              {{ valorOuTraco(categoria.aPagar) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AdminPanel>
</template>
