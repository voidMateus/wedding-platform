<!--
  A ficha do gasto: a história inteira de UM gasto, num lugar só.

  Existe porque as três telas do módulo são recortes — Orçamento responde
  "quanto planejei", Fornecedores "com quem vou fechar", Pagamentos "o que sai
  quando" — e nenhuma responde "e o Refrigerantes, como está?". Para montar
  essa resposta o casal visitava as três e juntava na cabeça.

  A ficha é leitura + atalho, nunca um quarto lugar de cadastro: cada ação aqui
  abre o mesmo modal que a tela correspondente abriria. Duplicar formulário
  seria duplicar regra.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { ROTULOS_ESTAGIO_FORNECEDOR, type EstagioFornecedor } from '#shared/schemas/finance'
import type {
  DespesaComParcelas,
  DocumentoComVinculos,
  FornecedorComSituacao,
} from '~/types/finance'

interface Props {
  modelValue: boolean
  despesa: DespesaComParcelas | null
  /** Os fornecedores que disputam ESTE gasto, já filtrados pela página. */
  fornecedores: readonly FornecedorComSituacao[]
  documentos: readonly DocumentoComVinculos[]
  hoje: string
}

const { modelValue, despesa, fornecedores, documentos, hoje } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  editar: [despesa: DespesaComParcelas]
  contratar: [fornecedor: FornecedorComSituacao | null]
  adicionarFornecedor: [despesaId: string]
  abrirDocumento: [documento: DocumentoComVinculos]
  irParaPagamentos: []
}>()

const totais = computed(() => despesa?.totais ?? null)

/** A menor proposta do gasto — é ela que ancora a comparação. */
const menorProposta = computed(() => {
  const valores = fornecedores
    .map((fornecedor) => fornecedor.valor_proposto_centavos)
    .filter((valor): valor is number => typeof valor === 'number' && valor > 0)
  return valores.length > 0 ? Math.min(...valores) : null
})

const propostasOrdenadas = computed(() =>
  [...fornecedores].sort(
    (a, b) => (a.valor_proposto_centavos ?? Infinity) - (b.valor_proposto_centavos ?? Infinity),
  ),
)

const parcelas = computed(() =>
  [...(despesa?.parcelas ?? [])].sort((a, b) => a.vence_em.localeCompare(b.vence_em)),
)

/** O que o contrato tem de saldo sem nenhuma parcela marcada. */
const semData = computed(() => totais.value?.naoParcelado ?? 0)

/**
 * A soma das parcelas contra o valor fechado.
 *
 * A regra do módulo permite que os dois divirjam nos dois sentidos — "entrada e
 * o resto a combinar" é o caso normal —, mas exige que a divergência seja
 * EXIBIDA. Ela não estava em tela nenhuma: dava para agendar parcelas que
 * somavam o dobro do contrato sem nada acusar.
 */
const somaDasParcelas = computed(() =>
  parcelas.value.reduce((total, parcela) => total + parcela.valor_centavos, 0),
)

const divergencia = computed(() => {
  const contratado = totais.value?.contratado
  if (contratado === null || contratado === undefined || parcelas.value.length === 0) return null
  const diferenca = somaDasParcelas.value - contratado
  return diferenca === 0 ? null : diferenca
})
</script>

<template>
  <UiModal
    :model-value="modelValue"
    size="lg"
    :title="despesa?.descricao ?? ''"
    :description="despesa?.categoria?.nome ?? 'Sem categoria'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="despesa && totais" class="flex flex-col gap-5">
      <!-- O dinheiro do gasto, nas mesmas três palavras do resto do módulo. -->
      <dl class="grid grid-cols-3 gap-px overflow-clip rounded-lg border border-border bg-border">
        <div class="bg-surface-elevated px-3 py-2.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Estimado</dt>
          <dd class="num mt-0.5 text-base font-semibold text-text">
            {{ formatCentsToBRL(totais.estimado) }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-3 py-2.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Contratado</dt>
          <dd class="num mt-0.5 text-base font-semibold text-text">
            {{ totais.contratado === null ? '—' : formatCentsToBRL(totais.contratado) }}
          </dd>
        </div>
        <div class="bg-surface-elevated px-3 py-2.5">
          <dt class="text-xs font-medium uppercase tracking-wide text-text-muted">Pago</dt>
          <dd class="num mt-0.5 text-base font-semibold text-text">
            {{ formatCentsToBRL(totais.pago) }}
          </dd>
        </div>
      </dl>

      <!-- PROPOSTAS -->
      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-semibold text-text">
            Propostas
            <span class="num ml-1 text-xs font-normal text-text-muted">
              {{ fornecedores.length }}
            </span>
          </h3>
          <UiButton size="sm" variant="ghost" @click="emit('adicionarFornecedor', despesa.id)">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar fornecedor
          </UiButton>
        </div>

        <p v-if="fornecedores.length === 0" class="text-sm text-text-muted">
          Nenhum fornecedor cotando este gasto ainda.
        </p>

        <ul v-else class="flex flex-col divide-y divide-border rounded-lg border border-border">
          <li
            v-for="fornecedor in propostasOrdenadas"
            :key="fornecedor.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5"
          >
            <span class="min-w-0 flex-1 truncate text-sm text-text">{{ fornecedor.nome }}</span>
            <UiBadge
              v-if="menorProposta !== null && fornecedor.valor_proposto_centavos === menorProposta"
              tone="success"
            >
              menor
            </UiBadge>
            <UiBadge :tone="estagioFornecedorPresentation(fornecedor.estagio as never).tone">
              {{ ROTULOS_ESTAGIO_FORNECEDOR[fornecedor.estagio as EstagioFornecedor] }}
            </UiBadge>
            <span class="num text-sm text-text">
              {{
                fornecedor.valor_proposto_centavos
                  ? formatCentsToBRL(fornecedor.valor_proposto_centavos)
                  : '—'
              }}
            </span>
            <UiButton
              v-if="fornecedor.estagio !== 'descartado' && fornecedor.contratadoCentavos === 0"
              size="sm"
              variant="outline"
              @click="emit('contratar', fornecedor)"
            >
              Contratar
            </UiButton>
          </li>
        </ul>
      </section>

      <!-- CONTRATO -->
      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-text">Contrato</h3>

        <div
          v-if="totais.contratado === null"
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-border px-3 py-2.5"
        >
          <p class="text-sm text-text-muted">
            Ainda é só planejamento — nada foi fechado para este gasto.
          </p>
          <UiButton size="sm" variant="outline" @click="emit('contratar', null)">
            Registrar valor
          </UiButton>
        </div>

        <div v-else class="rounded-lg border border-border px-3 py-2.5 text-sm">
          <p class="text-text">
            Fechado por
            <span class="num font-semibold">{{ formatCentsToBRL(totais.contratado) }}</span>
            <template v-if="despesa.fornecedor"> com {{ despesa.fornecedor.nome }}</template>
          </p>
          <p
            v-if="totais.desvioDoEstimado !== null && totais.desvioDoEstimado !== 0"
            class="num mt-0.5 text-sm"
            :class="totais.desvioDoEstimado < 0 ? 'text-success' : 'text-warning'"
          >
            {{ totais.desvioDoEstimado < 0 ? '−' : '+'
            }}{{ formatCentsToBRL(Math.abs(totais.desvioDoEstimado)) }}
            {{ totais.desvioDoEstimado < 0 ? 'de economia' : 'acima do estimado' }}
          </p>
        </div>
      </section>

      <!-- PAGAMENTOS -->
      <section v-if="totais.contratado !== null" class="flex flex-col gap-2">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-sm font-semibold text-text">Pagamentos</h3>
          <UiButton size="sm" variant="ghost" @click="emit('irParaPagamentos')">
            Abrir em Pagamentos
          </UiButton>
        </div>

        <ul
          v-if="parcelas.length > 0"
          class="flex flex-col divide-y divide-border rounded-lg border border-border"
        >
          <li
            v-for="parcela in parcelas"
            :key="parcela.id"
            class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
          >
            <UiBadge :tone="situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).tone">
              {{ situacaoParcelaPresentation(situacaoDaParcela(parcela, hoje)).label }}
            </UiBadge>
            <span class="num flex-1 text-sm text-text-muted">
              {{ formatarVencimento(parcela.vence_em, hoje) }}
              <span v-if="parcelas.length > 1" class="text-xs">· {{ parcela.numero }}ª</span>
            </span>
            <span class="num text-sm text-text">
              {{ formatCentsToBRL(parcela.valor_centavos) }}
            </span>
          </li>
        </ul>

        <p v-if="semData > 0" class="text-sm text-warning">
          <span class="num font-medium">{{ formatCentsToBRL(semData) }}</span>
          ainda sem data marcada.
        </p>

        <p v-if="divergencia !== null" class="text-sm text-warning">
          As parcelas somam
          <span class="num font-medium">{{ formatCentsToBRL(somaDasParcelas) }}</span>
          —
          <span class="num font-medium">{{ formatCentsToBRL(Math.abs(divergencia)) }}</span>
          {{ divergencia > 0 ? 'acima' : 'abaixo' }} do valor contratado.
        </p>
      </section>

      <!-- DOCUMENTOS -->
      <section class="flex flex-col gap-2">
        <h3 class="text-sm font-semibold text-text">
          Documentos
          <span class="num ml-1 text-xs font-normal text-text-muted">{{ documentos.length }}</span>
        </h3>

        <p v-if="documentos.length === 0" class="text-sm text-text-muted">
          Nenhum contrato ou proposta anexado a este gasto.
        </p>

        <ul v-else class="flex flex-col divide-y divide-border rounded-lg border border-border">
          <li
            v-for="documento in documentos"
            :key="documento.id"
            class="flex items-center gap-2 px-3 py-2"
          >
            <Icon
              :name="documento.url_externa ? 'lucide:link' : 'lucide:file-text'"
              class="h-4 w-4 shrink-0 text-text-muted"
            />
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm text-text hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              @click="emit('abrirDocumento', documento)"
            >
              {{ documento.titulo }}
            </button>
          </li>
        </ul>
      </section>
    </div>

    <!-- Sem "Fechar" no rodapé: o X do cabeçalho já fecha, e dois controles
         com o mesmo nome no mesmo diálogo confundem leitor de tela e olho. -->
    <template #footer>
      <UiButton v-if="despesa" variant="outline" @click="emit('editar', despesa)">
        Editar gasto
      </UiButton>
    </template>
  </UiModal>
</template>
