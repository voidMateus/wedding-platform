<script setup lang="ts">
import { formatarBytes } from '#shared/utils/bytes'
import { formatDatePtBR } from '#shared/utils/format-date'
import type { PlatformWeddingOverview } from '~/types/platform'
import type { AdminTableColumn } from '~/types/table'
import type { ClientColumn } from '~/utils/table-rows'

definePageMeta({ layout: 'plataforma' })

const { getOverview } = usePlatformOverview()
const { data, status, error, refresh } = getOverview()

const criandoCasamento = ref(false)

const statusOptions = WEDDING_LIFECYCLE_VALUES.map((value) => ({
  value,
  label: weddingLifecyclePresentation(value).label,
}))

// A visão da plataforma vem inteira numa requisição (é lista curta hoje, uma
// linha por casamento), então o recorte é aplicado no client. O dia em que ela
// for paginada, filtro e ordenação precisam virar parâmetro do endpoint — como
// já são em /api/guests —, senão passam a descrever só a página carregada.
const columns = computed<AdminTableColumn<PlatformWeddingOverview>[]>(() => [
  {
    key: 'casal',
    label: 'Casal',
    filter: { type: 'text', placeholder: 'Buscar casal' },
    sort: 'alpha',
  },
  { key: 'slug', label: 'Slug', filter: { type: 'text', placeholder: 'Buscar slug' } },
  {
    key: 'status',
    label: 'Status',
    filter: { type: 'select', multiple: true, options: statusOptions },
  },
  { key: 'convidados', label: 'Convidados', align: 'right', sort: 'numeric' },
  { key: 'storage', label: 'Storage', align: 'right', sort: 'numeric' },
  { key: 'donos', label: 'Dono(s)', filter: { type: 'text', placeholder: 'Buscar e-mail' } },
  { key: 'criado', label: 'Criado em', align: 'right', sort: 'date' },
])

const filters = useTableFilters(columns)

const accessors: Record<string, ClientColumn<PlatformWeddingOverview>> = {
  casal: { value: (row) => row.nomesNoivos, compare: compareText((row) => row.nomesNoivos) },
  slug: { value: (row) => row.slug },
  status: { value: (row) => row.statusCicloVida },
  donos: { value: (row) => row.donoEmails },
  convidados: { compare: compareNumber((row) => row.contagemConvidados) },
  storage: { compare: compareNumber((row) => row.storageBytes) },
  criado: { compare: compareText((row) => row.createdAt) },
}

const visibleWeddings = computed(() =>
  applyTableFilters(data.value?.data ?? [], columns.value, accessors, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-lg font-semibold text-text">Casamentos</h1>
        <p class="mt-1 text-sm text-text-muted">
          Visão entre contas para a equipe da plataforma — {{ data?.data.length ?? 0 }}
          casamento(s).
        </p>
      </div>

      <UiButton class="shrink-0" @click="criandoCasamento = true">Criar casamento</UiButton>
    </div>

    <!--
      Storage é medido no momento da leitura, nunca acumulado
      (docs/fase5-multievento.md 8.2) — por isso não há gráfico nem série: não
      existe série, porque não há nada guardando medição.

      A nota do Drive não é rodapé decorativo: sem ela, a equipe conclui que um
      casamento inteiro ocupa alguns MB. As fotos, que são o maior volume de
      qualquer casamento, vivem na conta do Google do casal — a galeria espelha
      a pasta dele e nunca copia.
    -->
    <div v-if="data" class="rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm">
      <p class="text-text">
        <span class="font-medium">{{ formatarBytes(data.totais.storageBytes) }}</span>
        em arquivos na plataforma
      </p>
      <p class="mt-0.5 text-xs text-text-muted">
        Capas, imagens de etapa do cronograma e documentos do Financeiro. Fotos de galeria ficam no
        Google Drive do casal e não entram nesta conta.
      </p>
    </div>

    <PlatformWeddingCreateModal v-model="criandoCasamento" @created="refresh()" />

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar a visão da plataforma"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <!--
      AdminTable/AdminPanel aqui, e não uma casca própria: a mesa de trabalho da
      equipe da plataforma é uma listagem administrativa como as do painel do
      casal — mesmo cabeçalho fixo, mesmo menu de filtro por coluna. Era o único
      lugar que ainda usava a UiTable, que saiu junto com esta migração.
    -->
    <AdminPanel v-else :meta="`${visibleWeddings.length} exibidos`">
      <template #headerActions>
        <AdminTableFilterBar
          :columns="columns"
          :filters="filters"
          group-label="Filtros da lista de casamentos"
        />
      </template>

      <AdminTable
        :columns="columns"
        :rows="visibleWeddings"
        :filters="filters"
        empty-label="Nenhum casamento com esses filtros."
      >
        <template #cell-casal="{ row }">
          <span class="font-medium text-text">{{ row.nomesNoivos }}</span>
        </template>

        <template #cell-slug="{ row }">
          <span class="text-text-muted">{{ row.slug }}</span>
        </template>

        <template #cell-status="{ row }">
          <UiBadge :tone="weddingLifecyclePresentation(row.statusCicloVida).tone">
            {{ weddingLifecyclePresentation(row.statusCicloVida).label }}
          </UiBadge>
        </template>

        <template #cell-convidados="{ row }">
          <span class="num text-text-muted">{{ row.contagemConvidados }}</span>
        </template>

        <template #cell-storage="{ row }">
          <span class="num text-text-muted">{{ formatarBytes(row.storageBytes) }}</span>
        </template>

        <template #cell-donos="{ row }">
          <span class="text-text-muted">{{ row.donoEmails.join(', ') || '—' }}</span>
        </template>

        <template #cell-criado="{ row }">
          <span class="text-text-muted">{{ formatDatePtBR(row.createdAt) }}</span>
        </template>
      </AdminTable>
    </AdminPanel>
  </div>
</template>
