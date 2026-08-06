<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'
import type { GiftCategory } from '~/types/gift-category'
import type { Gift } from '~/types/gift'
import type { GiftReservationsView } from '~/types/gift-public'

definePageMeta({ layout: 'admin' })

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const { listGiftCategories, createGiftCategory, updateGiftCategory, deleteGiftCategory } =
  useGiftCategories()
const { data: categoriesData, refresh: refreshCategories } = listGiftCategories()

const { listGifts, deleteGift } = useGifts()
const { data: giftsData, status: giftsStatus, refresh: refreshGifts } = listGifts()

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
  return categoriesData.value?.data.find((c) => c.id === categoryId)?.name ?? '—'
}

// --- categorias (CRUD compacto) ---

const isCategoryModalOpen = ref(false)
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
  initialValues: { name: '', displayOrder: 0 },
})

const [categoryName_, categoryNameAttrs] = defineCategoryField('name')
const [categoryDisplayOrder] = defineCategoryField('displayOrder')
void categoryNameAttrs

const categoryDisplayOrderText = computed({
  get: () => (categoryDisplayOrder.value === undefined ? '' : String(categoryDisplayOrder.value)),
  set: (value: string) => {
    categoryDisplayOrder.value = value === '' ? undefined : Number(value)
  },
})

function openCategoryModal() {
  editingCategory.value = null
  categoryErrorMessage.value = null
  const nextOrder = (categoriesData.value?.data.length ?? 0) + 1
  resetCategoryForm({ values: { name: '', displayOrder: nextOrder } })
  isCategoryModalOpen.value = true
}

function openEditCategoryModal(category: GiftCategory) {
  editingCategory.value = category
  categoryErrorMessage.value = null
  resetCategoryForm({ values: { name: category.name, displayOrder: category.display_order } })
  isCategoryModalOpen.value = true
}

const onCategorySubmit = handleCategorySubmit(async (values) => {
  categoryErrorMessage.value = null
  try {
    if (editingCategory.value) {
      await updateGiftCategory(editingCategory.value.id, values)
    } else {
      await createGiftCategory(values)
    }
    isCategoryModalOpen.value = false
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

function formatPrice(cents: number | null): string {
  if (cents === null) return '—'
  return centsToBRL(cents)
}
</script>

<template>
  <AdminSection title="Presentes" description="Lista de presentes, incluindo cotas para itens de maior valor.">
    <template #actions>
      <UiButton @click="openGiftModal">Novo presente</UiButton>
    </template>

    <section v-if="giftsData?.paymentsSummary" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <UiCard class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-text-muted">Arrecadado online</span>
        <span class="text-xl font-semibold text-text">
          {{ centsToBRL(giftsData.paymentsSummary.confirmedTotalCents) }}
        </span>
      </UiCard>
      <UiCard v-if="giftsData.paymentsSummary.failedCount > 0" variant="highlight" class="flex flex-col gap-1">
        <span class="text-xs font-medium uppercase tracking-wide text-text-muted">Pagamentos com falha</span>
        <span class="text-xl font-semibold text-text">{{ giftsData.paymentsSummary.failedCount }}</span>
        <span class="text-xs text-text-muted">
          Convidado pagou, mas não foi possível reservar/registrar automaticamente — veja "Ver reservas" do
          presente correspondente.
        </span>
      </UiCard>
    </section>

    <section v-if="giftsData?.activity?.length" class="flex flex-col gap-3">
      <h2 class="text-sm font-medium text-text">Atividade recente</h2>
      <div class="flex flex-col gap-2">
        <div
          v-for="entry in giftsData.activity"
          :key="entry.id"
          class="flex flex-col gap-1 rounded-md border border-border p-3 text-sm"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-text">
              <strong>{{ entry.name }}</strong>
              {{ entry.type === 'contribution' ? 'contribuiu com' : 'presenteou' }}
              <strong>{{ entry.giftTitle }}</strong>
            </span>
            <span class="flex shrink-0 items-center gap-2 text-text-muted">
              <UiBadge v-if="entry.isPaid" tone="success">Pago online</UiBadge>
              <UiBadge v-else tone="neutral">Vou entregar</UiBadge>
              <span v-if="entry.amountCents !== null" class="font-medium text-text">
                {{ centsToBRL(entry.amountCents) }}
              </span>
              <template v-if="entry.quotaCount"> ({{ entry.quotaCount }} cotas)</template>
            </span>
          </div>
          <div class="flex flex-wrap items-center gap-x-3 text-xs text-text-muted">
            <span v-if="entry.phone">{{ entry.phone }}</span>
            <span>{{ new Date(entry.at).toLocaleString('pt-BR') }}</span>
          </div>
          <p v-if="entry.message" class="text-xs italic text-text-muted">"{{ entry.message }}"</p>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium text-text">Categorias</h2>
        <UiButton size="sm" variant="ghost" @click="openCategoryModal">Nova categoria</UiButton>
      </div>
      <div v-if="categoriesData?.data.length" class="flex flex-wrap gap-2">
        <UiChip
          v-for="category in categoriesData.data"
          :key="category.id"
          :label="category.name"
          removable
          @remove="handleDeleteCategory(category)"
        >
          <template #actions>
            <button
              type="button"
              class="text-text-muted transition-brand hover:text-text"
              aria-label="Editar categoria"
              @click="openEditCategoryModal(category)"
            >
              <Icon name="lucide:pencil" class="h-3 w-3" />
            </button>
          </template>
        </UiChip>
      </div>
      <p v-else class="text-sm text-text-muted">Nenhuma categoria cadastrada (opcional).</p>
    </section>

    <section class="flex flex-col gap-3">
      <div v-if="giftsStatus === 'pending'" class="flex flex-col gap-2">
        <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
      </div>

      <UiEmptyState
        v-else-if="!giftsData?.data.length"
        icon="lucide:gift"
        title="Nenhum presente cadastrado ainda"
        description="Adicione itens à lista de presentes do casamento."
      >
        <UiButton @click="openGiftModal">Novo presente</UiButton>
      </UiEmptyState>

      <UiCard v-else padding="md">
        <UiTable>
          <template #head>
            <th class="px-4 py-2 font-medium">Título</th>
            <th class="px-4 py-2 font-medium">Categoria</th>
            <th class="px-4 py-2 font-medium">Tipo</th>
            <th class="px-4 py-2 font-medium">Preço / Alvo</th>
            <th class="px-4 py-2 font-medium">Status</th>
            <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
          </template>
          <tr
            v-for="gift in giftsData?.data"
            :key="gift.id"
            class="border-t border-border transition-brand hover:bg-surface-muted/60"
          >
            <td class="px-4 py-2 text-text">
              {{ gift.title }}
              <UiBadge v-if="gift.display_style === 'emotional'" tone="neutral" class="ml-1">Emocional</UiBadge>
            </td>
            <td class="px-4 py-2 text-text-muted">{{ categoryName(gift.category_id) }}</td>
            <td class="px-4 py-2 text-text-muted">
              {{ gift.is_group_gift ? 'Cota' : 'Simples' }}
            </td>
            <td class="px-4 py-2 text-text-muted">
              {{
                gift.is_group_gift
                  ? formatPrice(gift.target_amount_cents)
                  : `${formatPrice(gift.price_cents)} (${gift.quantity_available} disp.)`
              }}
            </td>
            <td class="px-4 py-2">
              <UiBadge :tone="gift.is_active ? 'success' : 'neutral'">
                {{ gift.is_active ? 'Ativo' : 'Inativo' }}
              </UiBadge>
            </td>
            <td class="px-4 py-2">
              <div class="flex justify-end gap-2">
                <UiButton size="sm" variant="ghost" @click="openReservationsModal(gift)">
                  Ver reservas
                </UiButton>
                <UiButton size="sm" variant="ghost" @click="openEditGiftModal(gift)">
                  Editar
                </UiButton>
                <UiButton size="sm" variant="destructive" @click="openDeleteModal(gift)">
                  Excluir
                </UiButton>
              </div>
            </td>
          </tr>
        </UiTable>
      </UiCard>
    </section>

    <UiModal
      v-model="isCategoryModalOpen"
      :title="editingCategory ? 'Editar categoria' : 'Nova categoria'"
    >
      <form class="flex flex-col gap-4" @submit="onCategorySubmit">
        <UiInput v-model="categoryName_" label="Nome" :error="categoryErrors.name" />
        <UiInput
          v-model="categoryDisplayOrderText"
          type="number"
          label="Ordem de exibição"
          :error="categoryErrors.displayOrder"
        />
        <p v-if="categoryErrorMessage" class="text-sm text-red-600" role="alert">
          {{ categoryErrorMessage }}
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isCategoryModalOpen = false">
            Cancelar
          </UiButton>
          <UiButton type="submit" :disabled="isCategorySubmitting">Salvar</UiButton>
        </div>
      </form>
    </UiModal>

    <AdminGiftsAdminGiftFormModal
      v-model="isGiftModalOpen"
      :gift="editingGift"
      :categories="categoriesData?.data ?? []"
      @saved="refreshGifts"
    />

    <UiModal v-model="isDeleteModalOpen" title="Excluir presente">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.title }}</strong>? Reservas já
        feitas continuam registradas para consulta, mas o item some da lista.
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
      :title="`Reservas — ${reservationsTarget?.title ?? ''}`"
    >
      <div v-if="isLoadingReservations" class="flex flex-col gap-2">
        <UiSkeleton class="h-8 w-full" />
        <UiSkeleton class="h-8 w-full" />
      </div>
      <div v-else-if="reservationsTarget?.is_group_gift" class="flex flex-col gap-2">
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
              <span v-if="contribution.inviteName" class="text-text-muted">({{ contribution.inviteName }})</span>
            </span>
            <span class="flex items-center gap-2 text-text-muted">
              <UiBadge v-if="contribution.isPaid" tone="success">Pago online</UiBadge>
              {{ centsToBRL(contribution.amountCents) }}
              <template v-if="contribution.quotaCount"> ({{ contribution.quotaCount }} cotas)</template>
            </span>
          </div>
          <p v-if="contribution.phone" class="text-xs text-text-muted">{{ contribution.phone }}</p>
          <p v-if="contribution.message" class="text-xs italic text-text-muted">"{{ contribution.message }}"</p>
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
              <span v-if="reservation.inviteName" class="text-text-muted">({{ reservation.inviteName }})</span>
            </span>
            <UiBadge v-if="reservation.isPaid" tone="success">Pago online</UiBadge>
          </div>
          <p v-if="reservation.phone" class="text-xs text-text-muted">{{ reservation.phone }}</p>
          <p v-if="reservation.message" class="text-xs italic text-text-muted">"{{ reservation.message }}"</p>
        </div>
      </div>
    </UiModal>
  </AdminSection>
</template>
