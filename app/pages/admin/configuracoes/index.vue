<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { themeConfigSchema, type ThemeConfig } from '#shared/schemas/theme'
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  WCAG_AA_MIN_CONTRAST,
  checkColorContrast,
  isValidHexColor,
} from '#shared/utils/contrast'
import { DEFAULT_FONT_PAIR_ID, findThemePreset } from '#shared/theme-presets'

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

const { getWedding, updateWedding, updateWeddingTheme } = useWedding()
// Aguardado (não apenas destructuring de useFetch): sem isso, o formulário de
// Aparência é populado por um watcher assíncrono que roda DEPOIS do walk de
// renderização do SSR, produzindo HTML de servidor com os presets/fontes
// ainda não destacados. Vue não corrige esse tipo de mismatch de hidratação
// em produção (só avisa em dev) — o destaque ficava "preso" incorretamente
// até uma interação forçar um novo render. Aguardar aqui garante que
// wedding.value já está resolvido antes do primeiro render, em SSR e client.
const { data: wedding, status, refresh } = await getWedding()

const coverImageUrl = computed(() => {
  const theme = (wedding.value?.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.coverImageUrl ?? null
})

// --- Dados do evento (comportamento de negócio — CLAUDE.md, seção 22.3) ---
const {
  handleSubmit: handleEventSubmit,
  defineField: defineEventField,
  errors: eventErrors,
  resetForm: resetEventForm,
  isSubmitting: isEventSubmitting,
} = useForm({ validationSchema: toTypedSchema(weddingSettingsSchema) })

const [coupleNames] = defineEventField('coupleNames')
const [eventDate] = defineEventField('eventDate')
const [eventTime] = defineEventField('eventTime')
const [rsvpMode] = defineEventField('rsvpMode')
const [rsvpDeadline] = defineEventField('rsvpDeadline')

const eventFormErrorMessage = ref<string | null>(null)
const eventSuccessMessage = ref<string | null>(null)

const onEventSubmit = handleEventSubmit(async (values) => {
  eventFormErrorMessage.value = null
  eventSuccessMessage.value = null
  try {
    await updateWedding(values)
    eventSuccessMessage.value = 'Configurações salvas.'
  } catch (err) {
    eventFormErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar as configurações.')
      : 'Não foi possível salvar as configurações.'
  }
})

// --- Aparência (visual — endpoint próprio, CLAUDE.md, seção 22.3) ---
const {
  handleSubmit: handleThemeSubmit,
  defineField: defineThemeField,
  errors: themeErrors,
  resetForm: resetThemeForm,
  isSubmitting: isThemeSubmitting,
} = useForm({ validationSchema: toTypedSchema(themeConfigSchema) })

const [presetId] = defineThemeField('presetId')
const [primaryColor] = defineThemeField('primaryColor')
const [secondaryColor] = defineThemeField('secondaryColor')
const [fontPairId] = defineThemeField('fontPairId')
const [showCountdown] = defineThemeField('showCountdown')

watch(
  wedding,
  (value) => {
    if (!value) return

    resetEventForm({
      values: {
        coupleNames: value.couple_names,
        eventDate: value.event_date,
        eventTime: value.event_time ? value.event_time.slice(0, 5) : '',
        rsvpMode: value.rsvp_mode as 'per_group' | 'per_guest',
        rsvpDeadline: value.rsvp_deadline ? isoToDatetimeLocal(value.rsvp_deadline) : '',
      },
    })

    const theme = (value.theme_config ?? {}) as Partial<ThemeConfig>
    resetThemeForm({
      values: {
        presetId: theme.presetId ?? '',
        primaryColor: theme.primaryColor ?? DEFAULT_PRIMARY_COLOR,
        secondaryColor: theme.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
        fontPairId: theme.fontPairId ?? DEFAULT_FONT_PAIR_ID,
        showCountdown: theme.showCountdown ?? true,
      },
    })
  },
  { immediate: true },
)

// Selecionar um preset é só um atalho de largada: preenche os três campos de
// uma vez, mas cada um continua editável manualmente depois (CLAUDE.md,
// seção 22.3). Qualquer edição manual marca presetId como 'custom'.
const isApplyingPreset = ref(false)

function applyPreset(id: string) {
  const preset = findThemePreset(id)
  if (!preset) return
  isApplyingPreset.value = true
  presetId.value = id
  primaryColor.value = preset.primaryColor
  secondaryColor.value = preset.secondaryColor
  fontPairId.value = preset.fontPairId
  nextTick(() => {
    isApplyingPreset.value = false
  })
}

watch([primaryColor, secondaryColor, fontPairId], () => {
  if (isApplyingPreset.value) return
  if (presetId.value !== 'custom') {
    presetId.value = 'custom'
  }
})

const activePresetId = computed(() => (presetId.value === 'custom' ? null : (presetId.value ?? null)))

const primaryContrastPreview = computed(() => {
  if (!primaryColor.value || !isValidHexColor(primaryColor.value)) return null
  return checkColorContrast(primaryColor.value)
})
const secondaryContrastPreview = computed(() => {
  if (!secondaryColor.value || !isValidHexColor(secondaryColor.value)) return null
  return checkColorContrast(secondaryColor.value)
})

const themeFormErrorMessage = ref<string | null>(null)
const themeSuccessMessage = ref<string | null>(null)

const onThemeSubmit = handleThemeSubmit(async (values) => {
  themeFormErrorMessage.value = null
  themeSuccessMessage.value = null
  try {
    await updateWeddingTheme(values)
    // Atualiza o cache compartilhado (chave 'wedding') para que o layout
    // admin reflita a cor nova imediatamente, sem reload completo.
    await refresh()
    themeSuccessMessage.value = 'Aparência salva.'
  } catch (err) {
    themeFormErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar a aparência.')
      : 'Não foi possível salvar a aparência.'
  }
})
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-8">
    <div>
      <h1 class="text-xl font-semibold text-text">Configurações</h1>
      <p class="mt-1 text-sm text-text-muted">Dados do evento e aparência visual do site.</p>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
    </div>

    <template v-else>
      <UiCard>
        <template #header>
          <h2 class="text-base font-semibold text-text">Dados do evento</h2>
        </template>

        <form class="flex flex-col gap-4" @submit="onEventSubmit">
          <UiInput v-model="coupleNames" label="Nome do casal" :error="eventErrors.coupleNames" />
          <div class="flex gap-3">
            <UiInput
              v-model="eventDate"
              type="date"
              label="Data do casamento"
              class="flex-1"
              :error="eventErrors.eventDate"
            />
            <UiInput
              v-model="eventTime"
              type="time"
              label="Horário (opcional)"
              class="flex-1"
              :error="eventErrors.eventTime"
            />
          </div>
          <p class="-mt-2 text-xs text-text-muted">
            Usado na contagem regressiva do site. Sem horário definido, a contagem mira meia-noite
            do dia do evento.
          </p>
          <UiSelect
            v-model="rsvpMode"
            label="Modo de RSVP"
            :options="[
              { value: 'per_group', label: 'Por grupo (uma resposta por grupo)' },
              { value: 'per_guest', label: 'Por convidado (cada um responde)' },
            ]"
            :error="eventErrors.rsvpMode"
          />
          <UiInput
            v-model="rsvpDeadline"
            type="datetime-local"
            label="Prazo final de RSVP (opcional)"
            :error="eventErrors.rsvpDeadline"
          />

          <p v-if="eventFormErrorMessage" class="text-sm text-red-600" role="alert">
            {{ eventFormErrorMessage }}
          </p>
          <p v-if="eventSuccessMessage" class="text-sm text-green-700" role="status">
            {{ eventSuccessMessage }}
          </p>

          <div class="flex justify-end">
            <UiButton type="submit" :disabled="isEventSubmitting">Salvar dados do evento</UiButton>
          </div>
        </form>
      </UiCard>

      <UiCard>
        <template #header>
          <h2 class="text-base font-semibold text-text">Aparência</h2>
        </template>

        <form class="flex flex-col gap-6" @submit="onThemeSubmit">
          <AdminCoverImageUploader :model-value="coverImageUrl" @update:model-value="() => refresh()" />

          <AdminThemePresetPicker :model-value="activePresetId" @update:model-value="applyPreset" />

          <AdminFontPairPicker v-model="fontPairId" :sample-text="coupleNames || 'Ana & João'" />

          <div class="flex flex-col gap-4 sm:flex-row">
            <div class="flex flex-1 flex-col gap-1">
              <label class="text-sm font-medium text-text" for="primary-color">Cor primária</label>
              <div class="flex items-center gap-3">
                <input
                  id="primary-color"
                  v-model="primaryColor"
                  type="color"
                  class="h-10 w-14 cursor-pointer rounded-md border border-border"
                />
                <UiInput v-model="primaryColor" class="flex-1" :error="themeErrors.primaryColor" />
              </div>
              <p
                v-if="primaryContrastPreview"
                class="text-xs"
                :class="primaryContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
              >
                Contraste: {{ primaryContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
                {{ WCAG_AA_MIN_CONTRAST }}:1 —
                {{ primaryContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
              </p>
            </div>

            <div class="flex flex-1 flex-col gap-1">
              <label class="text-sm font-medium text-text" for="secondary-color">Cor secundária</label>
              <div class="flex items-center gap-3">
                <input
                  id="secondary-color"
                  v-model="secondaryColor"
                  type="color"
                  class="h-10 w-14 cursor-pointer rounded-md border border-border"
                />
                <UiInput
                  v-model="secondaryColor"
                  class="flex-1"
                  :error="themeErrors.secondaryColor"
                />
              </div>
              <p
                v-if="secondaryContrastPreview"
                class="text-xs"
                :class="secondaryContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
              >
                Contraste: {{ secondaryContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
                {{ WCAG_AA_MIN_CONTRAST }}:1 —
                {{ secondaryContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
              </p>
            </div>
          </div>

          <UiCheckbox v-model="showCountdown" label="Mostrar contagem regressiva no site" />

          <p v-if="themeFormErrorMessage" class="text-sm text-red-600" role="alert">
            {{ themeFormErrorMessage }}
          </p>
          <p v-if="themeSuccessMessage" class="text-sm text-green-700" role="status">
            {{ themeSuccessMessage }}
          </p>

          <div class="flex justify-end">
            <UiButton type="submit" :disabled="isThemeSubmitting">Salvar aparência</UiButton>
          </div>
        </form>
      </UiCard>
    </template>
  </div>
</template>
