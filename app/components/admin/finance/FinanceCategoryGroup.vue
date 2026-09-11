<!--
  A árvore do Orçamento em três níveis: categoria -> despesa -> parcelas.

  A categoria repete os quatro estágios no recorte dela, a despesa mostra o
  saldo e a divergência (nos dois sentidos, sempre como aviso), e a parcela é
  onde "marcar como paga" acontece — sem modal, porque é a ação mais repetida
  do módulo e um diálogo para gravar uma data é fricção pura.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { situacaoDaParcela } from '#shared/utils/orcamento'
import type { CategoriaComDespesas, DespesaComParcelas, ParcelaDespesa } from '~/types/finance'

interface Props {
  categoria: CategoriaComDespesas
  hoje: string
  aberta: boolean
}

const { categoria, hoje, aberta } = defineProps<Props>()

const emit = defineEmits<{
  alternar: []
  editarCategoria: []
  excluirCategoria: []
  novaDespesa: []
  editarDespesa: [despesa: DespesaComParcelas]
  excluirDespesa: [despesa: DespesaComParcelas]
  parcelar: [despesa: DespesaComParcelas]
  alternarPagamento: [parcela: ParcelaDespesa]
}>()

const despesasAbertas = ref(new Set<string>())

function alternarDespesa(id: string) {
  const proximas = new Set(despesasAbertas.value)
  if (proximas.has(id)) proximas.delete(id)
  else proximas.add(id)
  despesasAbertas.value = proximas
}

function avisoDaDespesa(despesa: DespesaComParcelas): string | null {
  if (despesa.totais.parcelasAlemDoValor > 0) {
    return `As parcelas somam ${formatCentsToBRL(despesa.totais.parcelasAlemDoValor)} a mais que o valor da despesa`
  }
  if (despesa.totais.pagoAlemDoValor > 0) {
    return `Pago ${formatCentsToBRL(despesa.totais.pagoAlemDoValor)} acima do valor registrado`
  }
  if (despesa.totais.naoParcelado > 0 && despesa.parcelas.length > 0) {
    return `${formatCentsToBRL(despesa.totais.naoParcelado)} ainda não parcelados`
  }
  return null
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
        <UiBadge v-if="categoria.acimaDoPlanejado > 0" tone="warning">
          {{ formatCentsToBRL(categoria.acimaDoPlanejado) }} acima
        </UiBadge>
        <span v-else-if="categoria.percentualContratado !== null" class="text-xs text-text-muted">
          {{ categoria.percentualContratado }}% contratado
        </span>
      </button>

      <dl class="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm tabular-nums">
        <div v-if="categoria.previsto > 0" class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Planejado</dt>
          <dd class="text-text-muted">{{ formatCentsToBRL(categoria.previsto) }}</dd>
        </div>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Contratado</dt>
          <dd class="text-text">{{ formatCentsToBRL(categoria.contratado) }}</dd>
        </div>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">Pago</dt>
          <dd class="text-text-muted">{{ formatCentsToBRL(categoria.pago) }}</dd>
        </div>
        <div class="flex items-baseline gap-1.5">
          <dt class="text-xs text-text-muted">A pagar</dt>
          <dd class="text-text">{{ formatCentsToBRL(categoria.aPagar) }}</dd>
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
          @click="emit('excluirCategoria')"
        />
      </div>
    </div>

    <div v-if="aberta" class="border-t border-border">
      <p v-if="categoria.despesas.length === 0" class="px-4 py-4 text-sm text-text-muted sm:px-5">
        Nenhuma despesa nesta categoria ainda.
      </p>

      <ul v-else class="divide-y divide-border">
        <li v-for="despesa in categoria.despesas" :key="despesa.id">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
            <button
              type="button"
              class="flex min-w-0 flex-1 items-center gap-2 text-left"
              :aria-expanded="despesasAbertas.has(despesa.id)"
              @click="alternarDespesa(despesa.id)"
            >
              <Icon
                :name="
                  despesasAbertas.has(despesa.id) ? 'lucide:chevron-down' : 'lucide:chevron-right'
                "
                class="h-4 w-4 shrink-0 text-text-muted"
              />
              <span class="min-w-0">
                <span class="block truncate text-sm text-text">{{ despesa.descricao }}</span>
                <span v-if="despesa.fornecedor" class="block truncate text-xs text-text-muted">
                  {{ despesa.fornecedor.nome }}
                </span>
              </span>
            </button>

            <div class="flex items-baseline gap-4 text-sm tabular-nums">
              <span class="text-text">{{ formatCentsToBRL(despesa.valor_centavos) }}</span>
              <span class="text-xs text-text-muted">
                {{ formatCentsToBRL(despesa.totais.pago) }} pago
              </span>
            </div>

            <div class="flex items-center gap-1">
              <AdminRowAction
                icon="lucide:calendar-plus"
                label="Gerar parcelas"
                @click="emit('parcelar', despesa)"
              />
              <AdminRowAction
                icon="lucide:pencil"
                label="Editar despesa"
                @click="emit('editarDespesa', despesa)"
              />
              <AdminRowAction
                icon="lucide:trash-2"
                label="Excluir despesa"
                @click="emit('excluirDespesa', despesa)"
              />
            </div>
          </div>

          <p
            v-if="avisoDaDespesa(despesa)"
            class="px-4 pb-2 pl-10 text-xs text-text-muted sm:px-5 sm:pl-11"
          >
            {{ avisoDaDespesa(despesa) }}
          </p>

          <ul
            v-if="despesasAbertas.has(despesa.id) && despesa.parcelas.length > 0"
            class="border-t border-border bg-surface-muted/40"
          >
            <li
              v-for="parcela in despesa.parcelas"
              :key="parcela.id"
              class="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 pl-10 text-sm sm:px-5 sm:pl-11"
            >
              <span class="text-xs text-text-muted">
                {{ parcela.numero }} de {{ despesa.parcelas.length }}
              </span>
              <span class="text-text-muted">{{ formatarVencimento(parcela.vence_em, hoje) }}</span>
              <span class="tabular-nums text-text">
                {{ formatCentsToBRL(parcela.valor_centavos) }}
              </span>
              <UiBadge :tone="situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).tone">
                {{ situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).label }}
              </UiBadge>
              <UiButton
                size="sm"
                variant="ghost"
                class="ml-auto"
                @click="emit('alternarPagamento', parcela)"
              >
                {{ parcela.pago_em ? 'Desfazer pagamento' : 'Marcar paga' }}
              </UiButton>
            </li>
          </ul>

          <p
            v-else-if="despesasAbertas.has(despesa.id)"
            class="border-t border-border bg-surface-muted/40 px-4 py-2 pl-10 text-xs text-text-muted sm:px-5 sm:pl-11"
          >
            Nenhuma parcela definida — o valor inteiro está em aberto.
          </p>
        </li>
      </ul>

      <div class="border-t border-border px-4 py-3 sm:px-5">
        <UiButton size="sm" variant="outline" @click="emit('novaDespesa')">
          Adicionar despesa
        </UiButton>
      </div>
    </div>
  </AdminPanel>
</template>
