<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { giftCategoryInputSchema } from '#shared/schemas/gift-categories'
import { giftInputSchema } from '#shared/schemas/gifts'
import type { GiftCategory } from '~/types/gift-category'
import type { Gift } from '~/types/gift'

definePageMeta({ layout: 'admin' })

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

function centsToReaisText(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2)
}

function reaisTextToCents(text: string): number | undefined {
  if (text === '') return undefined
  const value = Number(text.replace(',', '.'))
  if (Number.isNaN(value)) return undefined
  return Math.round(value * 100)
}

const { listGiftCategories, createGiftCategory, updateGiftCategory, deleteGiftCategory } =
  useGiftCategories()
const { data: categoriesData, refresh: refreshCategories } = listGiftCategories()

const { listGifts, createGift, updateGift, deleteGift } = useGifts()
const { data: giftsData, status: giftsStatus, refresh: refreshGifts } = listGifts()

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
const giftErrorMessage = ref<string | null>(null)
const editingGift = ref<Gift | null>(null)

const {
  handleSubmit: handleGiftSubmit,
  defineField: defineGiftField,
  errors: giftErrors,
  resetForm: resetGiftForm,
  isSubmitting: isGiftSubmitting,
} = useForm({
  validationSchema: toTypedSchema(giftInputSchema),
  initialValues: {
    title: '',
    description: '',
    priceCents: undefined,
    imageUrl: '',
    categoryId: '',
    isGroupGift: false,
    quantityAvailable: 1,
    targetAmountCents: undefined,
    isActive: true,
  },
})

const [title] = defineGiftField('title')
const [description] = defineGiftField('description')
const [priceCents] = defineGiftField('priceCents')
const [imageUrl] = defineGiftField('imageUrl')
const [categoryId] = defineGiftField('categoryId')
const [isGroupGift] = defineGiftField('isGroupGift')
const [quantityAvailable] = defineGiftField('quantityAvailable')
const [targetAmountCents] = defineGiftField('targetAmountCents')
const [isActive] = defineGiftField('isActive')

const priceReaisText = computed({
  get: () => centsToReaisText(priceCents.value),
  set: (value: string) => {
    priceCents.value = reaisTextToCents(value)
  },
})

const targetAmountReaisText = computed({
  get: () => centsToReaisText(targetAmountCents.value),
  set: (value: string) => {
    targetAmountCents.value = reaisTextToCents(value)
  },
})

const quantityAvailableText = computed({
  get: () => (quantityAvailable.value === undefined ? '' : String(quantityAvailable.value)),
  set: (value: string) => {
    quantityAvailable.value = value === '' ? undefined : Number(value)
  },
})

const giftTypeValue = computed({
  get: () => (isGroupGift.value ? 'group' : 'simple'),
  set: (value: string) => {
    isGroupGift.value = value === 'group'
  },
})

function openGiftModal() {
  editingGift.value = null
  giftErrorMessage.value = null
  resetGiftForm({
    values: {
      title: '',
      description: '',
      priceCents: undefined,
      imageUrl: '',
      categoryId: '',
      isGroupGift: false,
      quantityAvailable: 1,
      targetAmountCents: undefined,
      isActive: true,
    },
  })
  isGiftModalOpen.value = true
}

function openEditGiftModal(gift: Gift) {
  editingGift.value = gift
  giftErrorMessage.value = null
  resetGiftForm({
    values: {
      title: gift.title,
      description: gift.description ?? '',
      priceCents: gift.price_cents ?? undefined,
      imageUrl: gift.image_url ?? '',
      categoryId: gift.category_id ?? '',
      isGroupGift: gift.is_group_gift,
      quantityAvailable: gift.quantity_available ?? undefined,
      targetAmountCents: gift.target_amount_cents ?? undefined,
      isActive: gift.is_active,
    },
  })
  isGiftModalOpen.value = true
}

const onGiftSubmit = handleGiftSubmit(async (values) => {
  giftErrorMessage.value = null
  try {
    if (editingGift.value) {
      await updateGift(editingGift.value.id, values)
    } else {
      await createGift(values)
    }
    isGiftModalOpen.value = false
    await refreshGifts()
  } catch (err) {
    giftErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar o presente.')
      : 'Não foi possível salvar o presente.'
  }
})

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
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">Presentes</h1>
        <p class="mt-1 text-sm text-text-muted">
          Lista de presentes, incluindo cotas para itens de maior valor.
        </p>
      </div>
      <UiButton @click="openGiftModal">Novo presente</UiButton>
    </div>

    <section class="flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-medium text-text">Categorias</h2>
        <UiButton size="sm" variant="ghost" @click="openCategoryModal">Nova categoria</UiButton>
      </div>
      <div v-if="categoriesData?.data.length" class="flex flex-wrap gap-2">
        <span
          v-for="category in categoriesData.data"
          :key="category.id"
          class="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-sm text-text"
        >
          {{ category.name }}
          <button
            type="button"
            class="text-text-muted hover:text-text"
            aria-label="Editar categoria"
            @click="openEditCategoryModal(category)"
          >
            ✎
          </button>
          <button
            type="button"
            class="text-text-muted hover:text-red-600"
            aria-label="Excluir categoria"
            @click="handleDeleteCategory(category)"
          >
            ✕
          </button>
        </span>
      </div>
      <p v-else class="text-sm text-text-muted">Nenhuma categoria cadastrada (opcional).</p>
    </section>

    <section class="flex flex-col gap-3">
      <div v-if="giftsStatus === 'pending'" class="flex flex-col gap-2">
        <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
      </div>

      <UiEmptyState
        v-else-if="!giftsData?.data.length"
        title="Nenhum presente cadastrado ainda"
        description="Adicione itens à lista de presentes do casamento."
      >
        <UiButton @click="openGiftModal">Novo presente</UiButton>
      </UiEmptyState>

      <UiTable v-else>
        <template #head>
          <th class="px-4 py-2 font-medium">Título</th>
          <th class="px-4 py-2 font-medium">Categoria</th>
          <th class="px-4 py-2 font-medium">Tipo</th>
          <th class="px-4 py-2 font-medium">Preço / Alvo</th>
          <th class="px-4 py-2 font-medium">Status</th>
          <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
        </template>
        <tr v-for="gift in giftsData?.data" :key="gift.id" class="border-t border-border">
          <td class="px-4 py-2 text-text">{{ gift.title }}</td>
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

    <UiModal v-model="isGiftModalOpen" :title="editingGift ? 'Editar presente' : 'Novo presente'">
      <form class="flex flex-col gap-4" @submit="onGiftSubmit">
        <UiInput v-model="title" label="Título" :error="giftErrors.title" />
        <UiTextarea v-model="description" label="Descrição (opcional)" :error="giftErrors.description" />
        <UiSelect
          v-model="categoryId"
          label="Categoria (opcional)"
          placeholder="Sem categoria"
          :options="(categoriesData?.data ?? []).map((c) => ({ value: c.id, label: c.name }))"
        />
        <UiInput v-model="imageUrl" label="URL da imagem (opcional)" :error="giftErrors.imageUrl" />
        <UiSelect
          v-model="giftTypeValue"
          label="Tipo"
          :options="[
            { value: 'simple', label: 'Presente simples (reserva exclusiva)' },
            { value: 'group', label: 'Presente de cota (contribuição em dinheiro)' },
          ]"
        />

        <UiInput
          v-if="!isGroupGift"
          v-model="quantityAvailableText"
          type="number"
          label="Quantidade disponível"
          :error="giftErrors.quantityAvailable"
        />
        <UiInput
          v-if="!isGroupGift"
          v-model="priceReaisText"
          label="Preço estimado, em R$ (opcional)"
          placeholder="0,00"
          :error="giftErrors.priceCents"
        />
        <UiInput
          v-if="isGroupGift"
          v-model="targetAmountReaisText"
          label="Valor-alvo da cota, em R$"
          placeholder="0,00"
          :error="giftErrors.targetAmountCents"
        />

        <UiCheckbox v-model="isActive" label="Visível na vitrine pública" />

        <p v-if="giftErrorMessage" class="text-sm text-red-600" role="alert">
          {{ giftErrorMessage }}
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isGiftModalOpen = false">
            Cancelar
          </UiButton>
          <UiButton type="submit" :disabled="isGiftSubmitting">Salvar</UiButton>
        </div>
      </form>
    </UiModal>

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
  </div>
</template>
