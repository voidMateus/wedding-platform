<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { EMOTIONAL_GIFT_ICONS, giftInputSchema } from '#shared/schemas/gifts'
import type { GiftCategory } from '~/types/gift-category'
import type { Gift } from '~/types/gift'

interface Props {
  modelValue: boolean
  gift: Gift | null
  categories: GiftCategory[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: []
}>()

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

const { createGift, updateGift } = useGifts()
const errorMessage = ref<string | null>(null)

const EMPTY_VALUES = {
  title: '',
  description: '',
  priceCents: undefined,
  imageUrl: '',
  categoryId: '',
  isGroupGift: false,
  quantityAvailable: 1,
  targetAmountCents: undefined,
  quotaAmountCents: undefined,
  displayStyle: 'standard' as const,
  emotionalIcon: '',
  isActive: true,
}

const {
  handleSubmit,
  defineField,
  errors,
  resetForm,
  isSubmitting,
} = useForm({
  validationSchema: toTypedSchema(giftInputSchema),
  initialValues: EMPTY_VALUES,
})

const [title] = defineField('title')
const [description] = defineField('description')
const [priceCents] = defineField('priceCents')
const [imageUrl] = defineField('imageUrl')
const [categoryId] = defineField('categoryId')
const [isGroupGift] = defineField('isGroupGift')
const [quantityAvailable] = defineField('quantityAvailable')
const [targetAmountCents] = defineField('targetAmountCents')
const [quotaAmountCents] = defineField('quotaAmountCents')
const [displayStyle] = defineField('displayStyle')
const [emotionalIcon] = defineField('emotionalIcon')
const [isActive] = defineField('isActive')

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
const quotaAmountReaisText = computed({
  get: () => centsToReaisText(quotaAmountCents.value),
  set: (value: string) => {
    quotaAmountCents.value = reaisTextToCents(value)
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

const emotionalIconOptions = EMOTIONAL_GIFT_ICONS.map((icon) => ({ value: icon.value, label: icon.label }))

// Limpa os campos do modo que deixou de se aplicar ao alternar o tipo — evita
// enviar um valor "fantasma" de uma seção escondida (a Zod schema não proíbe
// isso, ela é deliberadamente permissiva aqui e confia no mapeamento do
// server pra nulificar; isto é só higiene de formulário).
watch(isGroupGift, (isGroup) => {
  if (isGroup) {
    quantityAvailable.value = undefined
  } else {
    targetAmountCents.value = undefined
    quotaAmountCents.value = undefined
    displayStyle.value = 'standard'
    emotionalIcon.value = ''
  }
})

watch(
  () => [props.modelValue, props.gift] as const,
  ([open, gift]) => {
    if (!open) return
    errorMessage.value = null
    resetForm({
      values: gift
        ? {
            title: gift.title,
            description: gift.description ?? '',
            priceCents: gift.price_cents ?? undefined,
            imageUrl: gift.image_url ?? '',
            categoryId: gift.category_id ?? '',
            isGroupGift: gift.is_group_gift,
            quantityAvailable: gift.quantity_available ?? undefined,
            targetAmountCents: gift.target_amount_cents ?? undefined,
            quotaAmountCents: gift.quota_amount_cents ?? undefined,
            displayStyle: (gift.display_style as 'standard' | 'emotional') ?? 'standard',
            emotionalIcon: gift.emotional_icon ?? '',
            isActive: gift.is_active,
          }
        : EMPTY_VALUES,
    })
  },
  { immediate: true },
)

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = null
  try {
    if (props.gift) {
      await updateGift(props.gift.id, values)
    } else {
      await createGift(values)
    }
    emit('update:modelValue', false)
    emit('saved')
  } catch (err) {
    errorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar o presente.')
      : 'Não foi possível salvar o presente.'
  }
})
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="gift ? 'Editar presente' : 'Novo presente'"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput v-model="title" label="Título" :error="errors.title" />
      <UiTextarea v-model="description" label="Descrição (opcional)" :error="errors.description" />
      <UiSelect
        v-model="categoryId"
        label="Categoria (opcional)"
        placeholder="Sem categoria"
        :options="categories.map((c) => ({ value: c.id, label: c.name }))"
      />
      <UiInput v-model="imageUrl" label="URL da imagem (opcional)" :error="errors.imageUrl" />
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
        :error="errors.quantityAvailable"
      />
      <UiInput
        v-if="!isGroupGift"
        v-model="priceReaisText"
        label="Preço estimado, em R$ (opcional — necessário para permitir pagamento online)"
        placeholder="0,00"
        :error="errors.priceCents"
      />

      <template v-if="isGroupGift">
        <UiInput
          v-model="targetAmountReaisText"
          label="Valor-alvo da cota, em R$"
          placeholder="0,00"
          :error="errors.targetAmountCents"
        />
        <UiInput
          v-model="quotaAmountReaisText"
          label="Valor de cada cota fixa, em R$ (opcional)"
          placeholder="0,00"
          :error="errors.quotaAmountCents"
        />
        <p class="-mt-2 text-xs text-text-muted">
          Preenchido, o convidado escolhe quantidade de cotas em vez de digitar um valor livre.
        </p>
        <UiSelect
          v-model="displayStyle"
          label="Estilo de exibição"
          :options="[
            { value: 'standard', label: 'Padrão (foto do produto)' },
            { value: 'emotional', label: 'Emocional (ícone + frase, sem foto)' },
          ]"
        />
        <UiSelect
          v-if="displayStyle === 'emotional'"
          v-model="emotionalIcon"
          label="Ícone"
          placeholder="Escolha um ícone"
          :options="emotionalIconOptions"
          :error="errors.emotionalIcon"
        />
      </template>

      <UiCheckbox v-model="isActive" label="Visível na vitrine pública" />

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <UiButton type="button" variant="ghost" @click="emit('update:modelValue', false)">
          Cancelar
        </UiButton>
        <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
      </div>
    </form>
  </UiModal>
</template>
