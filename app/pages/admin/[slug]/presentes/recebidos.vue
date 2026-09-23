<!--
  Recebidos — o dinheiro que entrou pela lista de presentes.

  A lista responde "o que eu ofereci"; esta responde "o que entrou, e de quem".
  É outro EIXO sobre o mesmo objeto, que é o critério pelo qual este projeto
  admite tela nova (o mesmo que sustenta Pagamentos no Financeiro) — e, como
  lá, ela é também AGREGAÇÃO: a lista mostra um presente por linha, e nenhuma
  linha responde "quanto entrou no total" nem "quem já presenteou".

  Antes, o arrecadado era um número solto no topo da lista e as falhas de
  pagamento eram um contador ao lado dele. O contador é o ponto: o casal lia
  "2 pagamentos com falha" e não tinha para onde ir — nenhuma tela dizia quais,
  de quem, nem por quê (rodada de usabilidade de 20/09/2026, ponto 21).

  **Reserva sem pagamento aparece com zero.** Quem reservou um presente físico
  para comprar e levar não mandou dinheiro, então não soma no total — mas
  merece agradecimento igual, e por isso continua na lista de quem presenteou.
-->
<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'
import { formatDateTimePtBR } from '#shared/utils/format-date'
import type { AdminMetric } from '~/components/admin/AdminMetricStrip.vue'
import type {
  GiftFailedPayment,
  GiftReceivedByGift,
  GiftReceivedByGiver,
} from '~/composables/useGifts'
import type { AdminTableColumn } from '~/types/table'

definePageMeta({ layout: 'admin' })

const { listReceived } = useGifts()
const { data, status, error, refresh } = listReceived()

const temMovimento = computed(
  () => (data.value?.byGift.length ?? 0) > 0 || (data.value?.byGiver.length ?? 0) > 0,
)

function pessoas(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'pessoa' : 'pessoas'}`
}

const metricas = computed<AdminMetric[]>(() => {
  if (!data.value) return []

  const faixa: AdminMetric[] = [
    {
      label: 'Arrecadado online',
      value: formatCentsToBRL(data.value.totalCents),
      destaque: true,
      apoio: pessoas(data.value.byGiver.length),
    },
  ]

  // A falha só ocupa espaço quando existe: indicador em zero é ruído, e este
  // ainda pediria atenção com cor de estado.
  if (data.value.failed.length) {
    faixa.push({
      label: 'Pagamentos com falha',
      value: data.value.failed.length,
      tone: 'danger',
      apoio: 'exigem ação manual',
    })
  }

  return faixa
})

const colunasPorPresente: AdminTableColumn<GiftReceivedByGift>[] = [
  { key: 'title', label: 'Presente' },
  { key: 'entries', label: 'Gestos', align: 'right' },
  { key: 'cents', label: 'Entrou', align: 'right' },
]

const colunasPorPessoa: AdminTableColumn<GiftReceivedByGiver>[] = [
  { key: 'name', label: 'Quem presenteou' },
  { key: 'lastAt', label: 'Último' },
  { key: 'entries', label: 'Gestos', align: 'right' },
  { key: 'cents', label: 'Entrou', align: 'right' },
]

const colunasDeFalhas: AdminTableColumn<GiftFailedPayment>[] = [
  { key: 'giftTitle', label: 'Presente' },
  { key: 'name', label: 'Quem tentou' },
  { key: 'at', label: 'Quando' },
  { key: 'reason', label: 'Motivo' },
  { key: 'cents', label: 'Valor', align: 'right' },
]
</script>

<template>
  <AdminSection
    title="O que já entrou"
    description="O dinheiro da lista de presentes, por presente e por quem presenteou."
  >
    <div v-if="status === 'pending'" class="flex flex-col gap-5">
      <UiSkeleton class="h-24 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o que já entrou"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else>
      <AdminMetricStrip v-if="metricas.length" :metrics="metricas" />

      <!--
        As falhas vêm ANTES dos recortes de dinheiro: é a única coisa desta tela
        que pede ação, e ação no fim da página é ação que ninguém vê.
      -->
      <AdminPanel
        v-if="data?.failed.length"
        title="Pagamentos com falha"
        :meta="`${data.failed.length} para resolver`"
      >
        <p class="px-4 pt-4 text-sm text-text-muted sm:px-5">
          O convidado pagou e a plataforma não conseguiu reservar o presente ou registrar a
          contribuição. O dinheiro está na conta do provedor — o que falta é o registro.
        </p>

        <AdminTable :columns="colunasDeFalhas" :rows="data.failed" :scrollable="false">
          <template #cell-giftTitle="{ row }">
            <span class="font-medium text-text">{{ row.giftTitle }}</span>
          </template>
          <template #cell-name="{ row }">
            <span class="text-text">{{ row.name }}</span>
            <span v-if="row.phone" class="ml-2 text-xs text-text-muted">{{ row.phone }}</span>
          </template>
          <template #cell-at="{ row }">
            <span class="text-text-muted">{{ formatDateTimePtBR(row.at) }}</span>
          </template>
          <template #cell-reason="{ row }">
            <span class="text-text-muted">{{ row.reason ?? '—' }}</span>
          </template>
          <template #cell-cents="{ row }">
            <span class="num text-text">{{ formatCentsToBRL(row.cents) }}</span>
          </template>
        </AdminTable>
      </AdminPanel>

      <UiEmptyState
        v-if="!temMovimento"
        icon="lucide:hand-coins"
        title="Ninguém presenteou ainda"
        description="Quando um convidado reservar um presente ou contribuir, o valor e o nome aparecem aqui."
      />

      <template v-else>
        <AdminPanel title="Por presente" :meta="`${data?.byGift.length ?? 0} com movimento`">
          <AdminTable
            :columns="colunasPorPresente"
            :rows="data?.byGift ?? []"
            :scrollable="false"
            empty-label="Nenhum presente com movimento."
          >
            <template #cell-title="{ row }">
              <span class="font-medium text-text">{{ row.title }}</span>
            </template>
            <template #cell-entries="{ row }">
              <span class="num text-text-muted">{{ row.entries }}</span>
            </template>
            <template #cell-cents="{ row }">
              <span class="num text-text">{{ formatCentsToBRL(row.cents) }}</span>
            </template>
          </AdminTable>
        </AdminPanel>

        <AdminPanel title="Por quem presenteou" :meta="pessoas(data?.byGiver.length ?? 0)">
          <AdminTable
            :columns="colunasPorPessoa"
            :rows="data?.byGiver ?? []"
            :scrollable="false"
            empty-label="Ninguém presenteou ainda."
          >
            <template #cell-name="{ row }">
              <span class="font-medium text-text">{{ row.name }}</span>
            </template>
            <template #cell-lastAt="{ row }">
              <span class="text-text-muted">{{ formatDateTimePtBR(row.lastAt) }}</span>
            </template>
            <template #cell-entries="{ row }">
              <span class="num text-text-muted">{{ row.entries }}</span>
            </template>
            <template #cell-cents="{ row }">
              <span v-if="row.cents" class="num text-text">{{ formatCentsToBRL(row.cents) }}</span>
              <!-- Reserva sem pagamento: presente que vem na mão, dinheiro que
                   não entrou. "R$ 0,00" aqui diria que a pessoa não deu nada. -->
              <span v-else class="text-xs text-text-muted">presente reservado</span>
            </template>
          </AdminTable>
        </AdminPanel>
      </template>
    </template>
  </AdminSection>
</template>
