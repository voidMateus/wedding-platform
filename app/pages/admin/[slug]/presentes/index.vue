<script setup lang="ts">
import { gerarCsvPresentes, nomeDoArquivoDePresentes } from '#shared/utils/exportacao-presentes'
import { formatCentsToBRLOrDash } from '#shared/utils/format-currency'
import type { Gift } from '~/types/gift'
import type { AdminTableColumn } from '~/types/table'
import type { ClientColumn } from '~/utils/table-rows'
import type { GiftReservationsView } from '~/types/gift-public'

definePageMeta({ layout: 'admin' })

// As categorias chegam aqui só para NOMEAR e FILTRAR: elas se cadastram e se
// ordenam em "Como aparece no site", que é onde a ordem delas significa algo.
const { listGiftCategories } = useGiftCategories()
const { data: categoriesData } = listGiftCategories()

const { listGifts, deleteGift } = useGifts()
const {
  data: giftsData,
  status: giftsStatus,
  error: giftsError,
  refresh: refreshGifts,
} = listGifts()

const { getGiftReservations } = useGiftReservations()
const isReservationsModalOpen = ref(false)
const reservationsTarget = ref<Gift | null>(null)
const reservationsData = ref<GiftReservationsView | null>(null)
const isLoadingReservations = ref(false)

async function openReservationsModal(gift: Gift) {
  reservationsTarget.value = gift
  reservationsData.value = null
  isReservationsModalOpen.value = true
  isLoadingReservations.value = true
  try {
    reservationsData.value = await getGiftReservations(gift.id)
  } finally {
    isLoadingReservations.value = false
  }
}

function categoryName(categoryId: string | null): string {
  if (!categoryId) return '—'
  return categoriesData.value?.data.find((c) => c.id === categoryId)?.nome ?? '—'
}

// --- recorte e derivações da lista ---
//
// "Reservado por" e o status saem de `giftsData.giversByGift`, o resumo por
// presente que o endpoint monta sobre TODOS os lançamentos. Antes saíam de
// `activity`, que é limitada aos 20 mais recentes: um presente de cota com
// contribuições mais antigas aparecia como "Disponível", sem nenhum nome, e o
// filtro por status concordava com a mentira (achado de 2026-09-13).
//
// Não existe o recorte "Recebidos" do desenho original: não há confirmação de
// entrega no modelo, o que existe é "pago online" por lançamento.
const giversByGift = computed(() => new Map(Object.entries(giftsData.value?.giversByGift ?? {})))

function giversOf(gift: Gift): string[] {
  return giversByGift.value.get(gift.id) ?? []
}

function giftStatus(gift: Gift): GiftStatus {
  if (!gift.esta_ativo) return 'inativo'
  if (giversOf(gift).length > 0) return 'reservado'
  if (!gift.e_presente_cota && gift.quantidade_disponivel === 0) return 'reservado'
  return 'disponivel'
}

const statusOptions = GIFT_STATUS_VALUES.map((status) => ({
  value: status,
  label: giftStatusPresentation(status).label,
}))

const categoryOptions = computed(
  () =>
    categoriesData.value?.data.map((category) => ({ value: category.id, label: category.nome })) ??
    [],
)

// A lista de presentes vem inteira numa requisição só (não é paginada), então
// aqui o recorte é aplicado no client — diferente de convidados, onde filtrar
// na tela recortaria só a página carregada.
const columns = computed<AdminTableColumn<Gift>[]>(() => [
  {
    key: 'titulo',
    label: 'Presente',
    filter: { type: 'text', placeholder: 'Buscar presente' },
    sort: 'alpha',
  },
  {
    key: 'categoria',
    label: 'Categoria',
    filter: { type: 'select', multiple: true, options: categoryOptions.value },
  },
  {
    key: 'reservado',
    label: 'Reservado por',
    filter: { type: 'text', placeholder: 'Buscar quem presenteou' },
  },
  {
    key: 'status',
    label: 'Status',
    align: 'right',
    filter: { type: 'select', multiple: true, options: statusOptions },
  },
  { key: 'valor', label: 'Valor', align: 'right', sort: 'numeric' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
])

const filters = useTableFilters(columns)

// De onde sai o valor de cada coluna: quase nenhuma é campo direto da linha —
// status vem das reservas, categoria vem de outra requisição, "reservado por"
// é uma lista de nomes.
const accessors: Record<string, ClientColumn<Gift>> = {
  titulo: { value: (gift) => gift.titulo, compare: compareText((gift) => gift.titulo) },
  categoria: { value: (gift) => gift.categoria_id },
  reservado: { value: (gift) => giversOf(gift) },
  status: { value: (gift) => giftStatus(gift) },
  valor: { compare: compareNumber((gift) => priceCents(gift)) },
}

const visibleGifts = computed(() =>
  applyTableFilters(giftsData.value?.data ?? [], columns.value, accessors, {
    values: filters.values.value,
    sortKey: filters.sortKey.value,
    sortDirection: filters.sortDirection.value,
  }),
)

const totalLabel = computed(() => {
  const total = giftsData.value?.data.length ?? 0
  return `${total} ${total === 1 ? 'item' : 'itens'} na lista`
})

// Cota mostra a meta; presente físico, o preço. A ordenação por valor usa o
// mesmo número que a coluna exibe, senão ordenaria por um valor invisível.
function priceCents(gift: Gift): number | null {
  return gift.e_presente_cota ? gift.valor_meta_centavos : gift.preco_centavos
}

function priceLabel(gift: Gift): string {
  return formatCentsToBRLOrDash(priceCents(gift))
}

/**
 * Exporta o RECORTE ATUAL, a mesma promessa do botão de convidados: o arquivo
 * casa com o que está na tela, senão os filtros logo acima dele viram enfeite.
 *
 * Gerado no navegador, e não num endpoint: a lista de presentes chega inteira
 * numa requisição só e os recortes são aplicados aqui — um endpoint teria de
 * reimplementar o status e o "presenteado por", criando duas verdades para o
 * mesmo número. (A de convidados é paginada, por isso é do servidor.)
 */
function exportarPresentes() {
  const categoriaPorId = new Map(
    (categoriesData.value?.data ?? []).map((categoria) => [categoria.id, categoria.nome]),
  )
  const arrecadado = giftsData.value?.raisedByGift ?? {}

  const csv = gerarCsvPresentes(
    visibleGifts.value.map((gift) => ({
      titulo: gift.titulo,
      categoriaNome: gift.categoria_id ? (categoriaPorId.get(gift.categoria_id) ?? null) : null,
      ePresenteCota: gift.e_presente_cota,
      status: giftStatusPresentation(giftStatus(gift)).label,
      valorCentavos: priceCents(gift),
      arrecadadoCentavos: arrecadado[gift.id] ?? null,
      quantidadeDisponivel: gift.quantidade_disponivel,
      presenteadoPor: giversOf(gift),
    })),
  )

  baixarArquivo(csv, nomeDoArquivoDePresentes(new Date()))
}

// --- presentes ---

const isGiftModalOpen = ref(false)
const editingGift = ref<Gift | null>(null)

function openGiftModal() {
  editingGift.value = null
  isGiftModalOpen.value = true
}

function openEditGiftModal(gift: Gift) {
  editingGift.value = gift
  isGiftModalOpen.value = true
}

const deleteTarget = ref<Gift | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(gift: Gift) {
  deleteTarget.value = gift
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteGift(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refreshGifts()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <AdminSection title="Presentes" :meta="totalLabel">
    <template #actions>
      <UiButton variant="ghost" :disabled="!visibleGifts.length" @click="exportarPresentes">
        <Icon name="lucide:download" class="h-4 w-4" />
        Exportar
      </UiButton>
      <AdminPrintButton :disabled="!visibleGifts.length" />
      <UiButton @click="openGiftModal">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar presente
      </UiButton>
    </template>

    <AdminPanel title="Lista de presentes" :meta="`${visibleGifts.length} exibidos`">
      <template #headerActions>
        <AdminTableFilterBar
          :columns="columns"
          :filters="filters"
          group-label="Filtros da lista de presentes"
        />
      </template>

      <div v-if="giftsStatus === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="giftsError" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:alert-triangle"
          title="Não foi possível carregar os presentes"
          description="Verifique sua conexão e tente novamente."
        >
          <UiButton variant="ghost" @click="refreshGifts()"> Tentar novamente </UiButton>
        </UiEmptyState>
      </div>

      <div v-else-if="!giftsData?.data.length" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:gift"
          title="Nenhum presente cadastrado ainda"
          description="Adicione itens à lista de presentes do casamento."
        >
          <UiButton @click="openGiftModal">Adicionar presente</UiButton>
        </UiEmptyState>
      </div>

      <AdminTable
        v-else
        :columns="columns"
        :rows="visibleGifts"
        :filters="filters"
        empty-label="Nenhum presente com esse recorte."
      >
        <template #cell-titulo="{ row }">
          <span class="font-medium text-text">{{ row.titulo }}</span>
          <UiBadge v-if="row.estilo_exibicao === 'emocional'" tone="neutral" class="ml-2">
            Emocional
          </UiBadge>
          <span v-if="row.e_presente_cota" class="ml-2 text-xs text-text-muted">cota</span>
        </template>

        <template #cell-categoria="{ row }">
          <span class="text-text-muted">{{ categoryName(row.categoria_id) }}</span>
        </template>

        <template #cell-reservado="{ row }">
          <span v-if="giversOf(row).length" class="text-text-muted">
            {{ giversOf(row)[0] }}
            <template v-if="giversOf(row).length > 1"> +{{ giversOf(row).length - 1 }} </template>
          </span>
          <span v-else class="text-text-muted">—</span>
        </template>

        <template #cell-status="{ row }">
          <UiBadge :tone="giftStatusPresentation(giftStatus(row)).tone">
            {{ giftStatusPresentation(giftStatus(row)).label }}
          </UiBadge>
        </template>

        <template #cell-valor="{ row }">
          <span class="num text-text">{{ priceLabel(row) }}</span>
          <span v-if="!row.e_presente_cota" class="ml-1 text-xs text-text-muted">
            ({{ row.quantidade_disponivel }} disp.)
          </span>
        </template>

        <template #cell-acoes="{ row }">
          <span class="inline-flex justify-end gap-1">
            <AdminRowAction
              icon="lucide:receipt-text"
              :label="`Ver reservas de ${row.titulo}`"
              @click="openReservationsModal(row)"
            />
            <AdminRowAction
              icon="lucide:pencil"
              :label="`Editar ${row.titulo}`"
              @click="openEditGiftModal(row)"
            />
            <AdminRowAction
              icon="lucide:trash-2"
              tone="danger"
              :label="`Excluir ${row.titulo}`"
              @click="openDeleteModal(row)"
            />
          </span>
        </template>
      </AdminTable>
    </AdminPanel>

    <AdminPanel
      v-if="giftsData?.activity?.length"
      title="Atividade recente"
      :meta="`${giftsData.activity.length} lançamentos`"
    >
      <ul class="divide-y divide-border">
        <li
          v-for="entry in giftsData.activity"
          :key="entry.id"
          class="ledger-row flex flex-col gap-1 px-4 py-3 sm:px-5"
        >
          <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
            <span class="text-text">
              <strong class="font-medium">{{ entry.name }}</strong>
              {{ entry.type === 'contribution' ? 'contribuiu com' : 'presenteou' }}
              <strong class="font-medium">{{ entry.giftTitle }}</strong>
            </span>
            <span class="flex shrink-0 items-center gap-2 text-xs text-text-muted">
              <span :class="entry.isPaid ? 'font-medium text-text' : ''">
                {{ entry.isPaid ? 'Pago online' : 'Vou entregar' }}
              </span>
              <span v-if="entry.amountCents !== null" class="num text-text">
                {{ formatCentsToBRL(entry.amountCents) }}
              </span>
              <template v-if="entry.quotaCount">({{ entry.quotaCount }} cotas)</template>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
            <span v-if="entry.phone">{{ entry.phone }}</span>
            <span>{{ new Date(entry.at).toLocaleString('pt-BR') }}</span>
          </div>
          <p v-if="entry.message" class="text-xs italic text-text-muted">"{{ entry.message }}"</p>
        </li>
      </ul>
    </AdminPanel>

    <!-- Um modal só, com lista e formulário embutidos: categoria é acessório
         da lista de presentes (opcional, mexida de vez em quando), então não
         merece um painel permanente competindo com a lista. E modal sobre
         modal (lista abrindo um formulário) empilha foco e ESC. -->
    <AdminGiftsAdminGiftFormModal
      v-model="isGiftModalOpen"
      :gift="editingGift"
      :categories="categoriesData?.data ?? []"
      @saved="refreshGifts"
    />

    <UiModal v-model="isDeleteModalOpen" title="Excluir presente">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.titulo }}</strong
        >? Reservas já feitas continuam registradas para consulta, mas o item some da lista.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmDelete">
          Excluir
        </UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model="isReservationsModalOpen"
      :title="`Reservas — ${reservationsTarget?.titulo ?? ''}`"
    >
      <div v-if="isLoadingReservations" class="flex flex-col gap-2">
        <UiSkeleton class="h-8 w-full" />
        <UiSkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="reservationsTarget?.e_presente_cota" class="flex flex-col gap-2">
        <p v-if="!reservationsData?.contributions.length" class="text-sm text-text-muted">
          Nenhuma contribuição ainda.
        </p>
        <div
          v-for="contribution in reservationsData?.contributions"
          :key="contribution.id"
          class="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
        >
          <div class="flex items-center justify-between">
            <span class="text-text">
              {{ contribution.name }}
              <span v-if="contribution.inviteName" class="text-text-muted"
                >({{ contribution.inviteName }})</span
              >
            </span>
            <span class="flex items-center gap-2 text-text-muted">
              <UiBadge v-if="contribution.isPaid" tone="success">Pago online</UiBadge>
              {{ formatCentsToBRL(contribution.amountCents) }}
              <template v-if="contribution.quotaCount">
                ({{ contribution.quotaCount }} cotas)</template
              >
            </span>
          </div>
          <p v-if="contribution.phone" class="text-xs text-text-muted">{{ contribution.phone }}</p>
          <p v-if="contribution.message" class="text-xs italic text-text-muted">
            "{{ contribution.message }}"
          </p>
        </div>
      </div>
      <div v-else class="flex flex-col gap-2">
        <p v-if="!reservationsData?.reservations.length" class="text-sm text-text-muted">
          Ninguém reservou este presente ainda.
        </p>
        <div
          v-for="reservation in reservationsData?.reservations"
          :key="reservation.id"
          class="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
        >
          <div class="flex items-center justify-between">
            <span class="text-text">
              {{ reservation.name }}
              <span v-if="reservation.inviteName" class="text-text-muted"
                >({{ reservation.inviteName }})</span
              >
            </span>
            <UiBadge v-if="reservation.isPaid" tone="success">Pago online</UiBadge>
          </div>
          <p v-if="reservation.phone" class="text-xs text-text-muted">{{ reservation.phone }}</p>
          <p v-if="reservation.message" class="text-xs italic text-text-muted">
            "{{ reservation.message }}"
          </p>
        </div>
      </div>
    </UiModal>
  </AdminSection>
</template>
