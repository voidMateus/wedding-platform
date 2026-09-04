<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'
import { formatCentsToBRL, formatCentsToBRLOrDash } from '#shared/utils/format-currency'
import type { GiftCategory } from '~/types/gift-category'
import type { Gift } from '~/types/gift'
import type { GiftReservationsView } from '~/types/gift-public'

definePageMeta({ layout: 'admin' })

const { listGiftCategories, createGiftCategory, updateGiftCategory, deleteGiftCategory } =
  useGiftCategories()
const { data: categoriesData, refresh: refreshCategories } = listGiftCategories()

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
// "Reservado por" e o status saem de `giftsData.activity`, que já vem na mesma
// resposta de /api/gifts (reservas + contribuições de todos os presentes) —
// nenhuma consulta nova. Por isso também não existe o recorte "Recebidos" do
// desenho original: não há confirmação de entrega no modelo, o que existe é
// "pago online" por lançamento.
const giversByGift = computed(() => {
  const map = new Map<string, string[]>()
  for (const entry of giftsData.value?.activity ?? []) {
    const names = map.get(entry.giftId) ?? []
    names.push(entry.name)
    map.set(entry.giftId, names)
  }
  return map
})

function giversOf(gift: Gift): string[] {
  return giversByGift.value.get(gift.id) ?? []
}

function giftStatus(gift: Gift): GiftStatus {
  if (!gift.esta_ativo) return 'inativo'
  if (giversOf(gift).length > 0) return 'reservado'
  if (!gift.e_presente_cota && gift.quantidade_disponivel === 0) return 'reservado'
  return 'disponivel'
}

const statusFilter = ref('todos')
const statusChips = [
  { value: 'todos', label: 'Todos' },
  { value: 'disponiveis', label: 'Disponíveis' },
  { value: 'reservados', label: 'Reservados' },
  { value: 'inativos', label: 'Inativos' },
] as const

const filterByChip: Record<string, GiftStatus> = {
  disponiveis: 'disponivel',
  reservados: 'reservado',
  inativos: 'inativo',
}

const visibleGifts = computed(() => {
  const rows = giftsData.value?.data ?? []
  const wanted = filterByChip[statusFilter.value]
  return wanted ? rows.filter((gift) => giftStatus(gift) === wanted) : rows
})

const totalLabel = computed(() => {
  const total = giftsData.value?.data.length ?? 0
  return `${total} ${total === 1 ? 'item' : 'itens'} na lista`
})

const paymentMetrics = computed(() => {
  const summary = giftsData.value?.paymentsSummary
  if (!summary) return []
  return [
    { label: 'Arrecadado online', value: formatCentsToBRL(summary.confirmedTotalCents) },
    {
      label: 'Pagamentos com falha',
      value: summary.failedCount,
      // danger, não highlight: é o único lugar do sistema que é literalmente
      // uma falha exigindo ação manual do casal.
      tone: summary.failedCount > 0 ? ('danger' as const) : undefined,
    },
  ]
})

const columns = [
  { key: 'titulo', label: 'Presente' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'reservado', label: 'Reservado por' },
  { key: 'status', label: 'Status', align: 'right' },
  { key: 'valor', label: 'Valor', align: 'right' },
  { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
] as const

function priceLabel(gift: Gift): string {
  return gift.e_presente_cota
    ? formatCentsToBRLOrDash(gift.valor_meta_centavos)
    : formatCentsToBRLOrDash(gift.preco_centavos)
}

// --- categorias (CRUD compacto) ---

const isCategoriesModalOpen = ref(false)
const isEditingCategory = ref(false)
const categoryErrorMessage = ref<string | null>(null)
const editingCategory = ref<GiftCategory | null>(null)

const {
  handleSubmit: handleCategorySubmit,
  defineField: defineCategoryField,
  errors: categoryErrors,
  resetForm: resetCategoryForm,
  isSubmitting: isCategorySubmitting,
} = useForm({
  validationSchema: toTypedSchema(giftCategoryInputSchema),
  initialValues: { nome: '', ordemExibicao: 0 },
})

const [categoryName_, categoryNameAttrs] = defineCategoryField('nome')
const [categoryDisplayOrder] = defineCategoryField('ordemExibicao')
void categoryNameAttrs

const categoryDisplayOrderText = computed({
  get: () => (categoryDisplayOrder.value === undefined ? '' : String(categoryDisplayOrder.value)),
  set: (value: string) => {
    categoryDisplayOrder.value = value === '' ? undefined : Number(value)
  },
})

function startCreatingCategory() {
  editingCategory.value = null
  categoryErrorMessage.value = null
  const nextOrder = (categoriesData.value?.data.length ?? 0) + 1
  resetCategoryForm({ values: { nome: '', ordemExibicao: nextOrder } })
  isEditingCategory.value = true
}

function startEditingCategory(category: GiftCategory) {
  editingCategory.value = category
  categoryErrorMessage.value = null
  resetCategoryForm({ values: { nome: category.nome, ordemExibicao: category.ordem_exibicao } })
  isEditingCategory.value = true
}

function cancelCategoryForm() {
  isEditingCategory.value = false
  editingCategory.value = null
  categoryErrorMessage.value = null
}

const onCategorySubmit = handleCategorySubmit(async (values) => {
  categoryErrorMessage.value = null
  try {
    if (editingCategory.value) {
      await updateGiftCategory(editingCategory.value.id, values)
    } else {
      await createGiftCategory(values)
    }
    // Fecha só o formulário, não o modal: quem abriu "Categorias" quase sempre
    // vai cadastrar mais de uma de uma vez.
    isEditingCategory.value = false
    editingCategory.value = null
    await refreshCategories()
  } catch {
    categoryErrorMessage.value = 'Não foi possível salvar a categoria.'
  }
})

async function handleDeleteCategory(category: GiftCategory) {
  try {
    await deleteGiftCategory(category.id)
    await refreshCategories()
  } catch {
    // silencioso: falha de exclusão de categoria não bloqueia o restante da tela
  }
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
      <UiButton @click="openGiftModal">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar presente
      </UiButton>
    </template>

    <div v-if="paymentMetrics.length" class="flex flex-col gap-2">
      <AdminMetricStrip :metrics="paymentMetrics" />
      <p
        v-if="giftsData?.paymentsSummary.failedCount"
        class="px-1 text-xs text-text-muted"
        role="alert"
      >
        Convidado pagou, mas não foi possível reservar/registrar automaticamente — veja "Ver
        reservas" do presente correspondente.
      </p>
    </div>

    <AdminPanel title="Lista de presentes" :meta="`${visibleGifts.length} exibidos`">
      <template #headerActions>
        <AdminFilterChips
          v-model="statusFilter"
          :items="statusChips"
          group-label="Filtrar presentes por situação"
        />
        <UiButton size="sm" variant="ghost" @click="isCategoriesModalOpen = true">
          Categorias
          <span v-if="categoriesData?.data.length" class="num">
            ({{ categoriesData.data.length }})
          </span>
        </UiButton>
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
    <UiModal
      v-model="isCategoriesModalOpen"
      title="Categorias"
      description="Agrupam os presentes na lista do site. Opcionais."
    >
      <div class="flex flex-col gap-4">
        <div v-if="categoriesData?.data.length" class="flex flex-wrap gap-2">
          <UiChip
            v-for="category in categoriesData.data"
            :key="category.id"
            :label="category.nome"
            removable
            @remove="handleDeleteCategory(category)"
          >
            <template #actions>
              <button
                type="button"
                class="text-text-muted transition-brand hover:text-text"
                :aria-label="`Editar categoria ${category.nome}`"
                @click="startEditingCategory(category)"
              >
                <Icon name="lucide:pencil" class="h-3 w-3" />
              </button>
            </template>
          </UiChip>
        </div>
        <p v-else class="text-sm text-text-muted">Nenhuma categoria cadastrada ainda.</p>

        <form
          v-if="isEditingCategory"
          class="flex flex-col gap-3 border-t border-border pt-4"
          @submit="onCategorySubmit"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
            {{ editingCategory ? 'Editar categoria' : 'Nova categoria' }}
          </p>
          <UiInput v-model="categoryName_" label="Nome" :error="categoryErrors.nome" />
          <UiInput
            v-model="categoryDisplayOrderText"
            type="number"
            label="Ordem de exibição"
            :error="categoryErrors.ordemExibicao"
          />
          <p v-if="categoryErrorMessage" class="text-sm text-danger" role="alert">
            {{ categoryErrorMessage }}
          </p>
          <div class="flex justify-end gap-2">
            <UiButton type="button" size="sm" variant="ghost" @click="cancelCategoryForm">
              Cancelar
            </UiButton>
            <UiButton type="submit" size="sm" :disabled="isCategorySubmitting">Salvar</UiButton>
          </div>
        </form>

        <div v-else>
          <UiButton size="sm" variant="ghost" @click="startCreatingCategory">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Nova categoria
          </UiButton>
        </div>
      </div>
    </UiModal>

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
