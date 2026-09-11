<!--
  Uma categoria do Orçamento e os gastos dela.

  Aqui é PLANEJAMENTO: cada gasto mostra o custo estimado e, quando já foi
  fechado, o custo final ao lado. Parcelas não aparecem nesta tela — elas são o
  assunto de Pagamentos. Misturar as duas coisas foi o que deixou o casal sem
  lugar para planejar.

  Gasto sem custo final é o estado normal do começo: aparece como "a contratar",
  com o caminho para fechar logo ali.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import type { CategoriaComDespesas, DespesaComParcelas } from '~/types/finance'

interface Props {
  categoria: CategoriaComDespesas
  aberta: boolean
}

const { categoria, aberta } = defineProps<Props>()

const emit = defineEmits<{
  alternar: []
  editarCategoria: []
  arquivarCategoria: []
  novaDespesa: []
  editarDespesa: [despesa: DespesaComParcelas]
  excluirDespesa: [despesa: DespesaComParcelas]
  contratarDespesa: [despesa: DespesaComParcelas]
}>()

/** Quanto o fechado diferiu do que se imaginava — economia aparece como ganho. */
function desvio(despesa: DespesaComParcelas): { texto: string; economia: boolean } | null {
  const valor = despesa.totais.desvioDoEstimado
  if (valor === null || valor === 0) return null
  return {
    texto: `${valor > 0 ? '+' : '−'}${formatCentsToBRL(Math.abs(valor))}`,
    economia: valor < 0,
  }
}
</script>

<template>
  <AdminPanel>
    <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
      <button
        type="button"
        class="flex min-w-0 flex-1 items-center gap-2 text-left"
        :aria-expanded="aberta"
        @click="emit('alternar')"
      >
        <Icon
          :name="aberta ? 'lucide:chevron-down' : 'lucide:chevron-right'"
          class="h-4 w-4 shrink-0 text-text-muted"
        />
        <span class="truncate font-display text-base font-semibold text-text">
          {{ categoria.nome }}
        </span>
        <UiBadge v-if="categoria.acimaDoOrcado > 0" tone="warning">
          {{ formatCentsToBRL(categoria.acimaDoOrcado) }} acima do orçado
        </UiBadge>
        <span v-else-if="categoria.gastosPlanejados > 0" class="text-xs text-text-muted">
          {{ categoria.gastosPlanejados }} a contratar
        </span>
      </button>

      <dl class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm tabular-nums">
        <!--
          "Orçado" aparece SEMPRE, e vazio vira um convite clicável: escondê-lo
          quando é zero tirava da tela de planejamento a única porta para
          planejar.
        -->
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Orçado</dt>
          <dd v-if="categoria.orcado > 0" class="text-text-muted">
            {{ formatCentsToBRL(categoria.orcado) }}
          </dd>
          <dd v-else-if="categoria.categoriaId">
            <button
              type="button"
              class="text-xs text-primary underline-offset-2 hover:underline"
              @click="emit('editarCategoria')"
            >
              definir
            </button>
          </dd>
          <dd v-else class="text-text-muted">—</dd>
        </div>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Estimado</dt>
          <dd class="text-text">{{ formatCentsToBRL(categoria.estimado) }}</dd>
        </div>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Contratado</dt>
          <dd class="text-text">{{ formatCentsToBRL(categoria.contratado) }}</dd>
        </div>
      </dl>

      <div class="flex items-center gap-1">
        <AdminRowAction
          v-if="categoria.categoriaId"
          icon="lucide:pencil"
          label="Editar categoria"
          @click="emit('editarCategoria')"
        />
        <AdminRowAction
          v-if="categoria.categoriaId"
          icon="lucide:archive"
          label="Arquivar categoria"
          @click="emit('arquivarCategoria')"
        />
      </div>
    </div>

    <div v-if="aberta" class="border-t border-border">
      <p v-if="categoria.despesas.length === 0" class="px-4 py-4 text-sm text-text-muted sm:px-5">
        Nenhum gasto nesta categoria ainda.
      </p>

      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-xs uppercase tracking-wide text-text-muted">
            <th scope="col" class="px-4 py-2 text-left font-medium sm:px-5">Gasto</th>
            <th scope="col" class="px-4 py-2 text-right font-medium">Estimado</th>
            <th scope="col" class="px-4 py-2 text-right font-medium">Final</th>
            <th scope="col" class="px-4 py-2 text-right font-medium">Pago</th>
            <th scope="col" class="w-px px-4 py-2 sm:px-5"><span class="sr-only">Ações</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="despesa in categoria.despesas" :key="despesa.id">
            <th scope="row" class="px-4 py-2.5 text-left font-normal sm:px-5">
              <span class="block truncate text-text">{{ despesa.descricao }}</span>
              <span v-if="despesa.fornecedor" class="block truncate text-xs text-text-muted">
                {{ despesa.fornecedor.nome }}
              </span>
            </th>
            <td class="px-4 py-2.5 text-right tabular-nums text-text-muted">
              {{ formatCentsToBRL(despesa.totais.estimado) }}
            </td>
            <td class="px-4 py-2.5 text-right tabular-nums">
              <template v-if="despesa.totais.contratado !== null">
                <span class="text-text">{{ formatCentsToBRL(despesa.totais.contratado) }}</span>
                <span
                  v-if="desvio(despesa)"
                  class="ml-1.5 text-xs"
                  :class="desvio(despesa)?.economia ? 'text-success' : 'text-warning'"
                >
                  {{ desvio(despesa)?.texto }}
                </span>
              </template>
              <button
                v-else
                type="button"
                class="text-xs text-primary underline-offset-2 hover:underline"
                @click="emit('contratarDespesa', despesa)"
              >
                registrar valor fechado
              </button>
            </td>
            <td class="px-4 py-2.5 text-right tabular-nums text-text-muted">
              {{ despesa.totais.pago > 0 ? formatCentsToBRL(despesa.totais.pago) : '—' }}
            </td>
            <td class="px-4 py-2.5 sm:px-5">
              <div class="flex items-center justify-end gap-1">
                <AdminRowAction
                  icon="lucide:pencil"
                  label="Editar gasto"
                  @click="emit('editarDespesa', despesa)"
                />
                <AdminRowAction
                  icon="lucide:trash-2"
                  label="Excluir gasto"
                  @click="emit('excluirDespesa', despesa)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="border-t border-border px-4 py-3 sm:px-5">
        <UiButton size="sm" variant="outline" @click="emit('novaDespesa')">
          Adicionar gasto
        </UiButton>
      </div>
    </div>
  </AdminPanel>
</template>
