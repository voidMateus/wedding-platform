<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import {
  DEFAULT_PRIMARY_COLOR,
  WCAG_AA_MIN_CONTRAST,
  checkPrimaryColorContrast,
  isValidHexColor,
} from '#shared/utils/contrast'

definePageMeta({ layout: 'admin' })

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

function isoToDatetimeLocal(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const { getWedding, updateWedding } = useWedding()
const { data: wedding, status, refresh } = getWedding()

const coverImageUrl = computed(() => {
  const theme = (wedding.value?.theme_config ?? {}) as { coverImageUrl?: string }
  return theme.coverImageUrl ?? null
})

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(weddingSettingsSchema),
})

const [coupleNames] = defineField('coupleNames')
const [eventDate] = defineField('eventDate')
const [eventTime] = defineField('eventTime')
const [rsvpMode] = defineField('rsvpMode')
const [rsvpDeadline] = defineField('rsvpDeadline')
const [primaryColor] = defineField('primaryColor')

watch(
  wedding,
  (value) => {
    if (!value) return
    const theme = (value.theme_config ?? {}) as { primaryColor?: string }
    resetForm({
      values: {
        coupleNames: value.couple_names,
        eventDate: value.event_date,
        eventTime: value.event_time ? value.event_time.slice(0, 5) : '',
        rsvpMode: value.rsvp_mode as 'per_group' | 'per_guest',
        rsvpDeadline: value.rsvp_deadline ? isoToDatetimeLocal(value.rsvp_deadline) : '',
        primaryColor: theme.primaryColor ?? DEFAULT_PRIMARY_COLOR,
      },
    })
  },
  { immediate: true },
)

const contrastPreview = computed(() => {
  if (!primaryColor.value || !isValidHexColor(primaryColor.value)) return null
  return checkPrimaryColorContrast(primaryColor.value)
})

const formErrorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  successMessage.value = null
  try {
    await updateWedding(values)
    successMessage.value = 'Configurações salvas.'
  } catch (err) {
    formErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar as configurações.')
      : 'Não foi possível salvar as configurações.'
  }
})
</script>

<template>
  <div class="flex max-w-lg flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-text">Configurações do evento</h1>
      <p class="mt-1 text-sm text-text-muted">Dados básicos do casamento e tema visual.</p>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
    </div>

    <form v-else class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput v-model="coupleNames" label="Nome do casal" :error="errors.coupleNames" />
      <div class="flex gap-3">
        <UiInput
          v-model="eventDate"
          type="date"
          label="Data do casamento"
          class="flex-1"
          :error="errors.eventDate"
        />
        <UiInput
          v-model="eventTime"
          type="time"
          label="Horário (opcional)"
          class="flex-1"
          :error="errors.eventTime"
        />
      </div>
      <p class="-mt-2 text-xs text-text-muted">
        Usado na contagem regressiva do site. Sem horário definido, a contagem mira meia-noite do
        dia do evento.
      </p>
      <UiSelect
        v-model="rsvpMode"
        label="Modo de RSVP"
        :options="[
          { value: 'per_group', label: 'Por grupo (uma resposta por grupo)' },
          { value: 'per_guest', label: 'Por convidado (cada um responde)' },
        ]"
        :error="errors.rsvpMode"
      />
      <UiInput
        v-model="rsvpDeadline"
        type="datetime-local"
        label="Prazo final de RSVP (opcional)"
        :error="errors.rsvpDeadline"
      />

      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-text" for="primary-color">Cor primária do tema</label>
        <div class="flex items-center gap-3">
          <input
            id="primary-color"
            v-model="primaryColor"
            type="color"
            class="h-10 w-14 cursor-pointer rounded-md border border-border"
          />
          <UiInput v-model="primaryColor" class="flex-1" :error="errors.primaryColor" />
        </div>
        <p
          v-if="contrastPreview"
          class="text-sm"
          :class="contrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
        >
          Contraste contra o fundo: {{ contrastPreview.ratioAgainstSurface.toFixed(2) }}:1
          (mínimo {{ WCAG_AA_MIN_CONTRAST }}:1 —
          {{ contrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
        </p>
      </div>

      <p v-if="formErrorMessage" class="text-sm text-red-600" role="alert">
        {{ formErrorMessage }}
      </p>
      <p v-if="successMessage" class="text-sm text-green-700" role="status">
        {{ successMessage }}
      </p>

      <div class="mt-2 flex justify-end">
        <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
      </div>
    </form>

    <div v-if="status !== 'pending'" class="border-t border-border pt-6">
      <AdminCoverImageUploader :model-value="coverImageUrl" @update:model-value="() => refresh()" />
    </div>
  </div>
</template>
