<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingSettingsSchema } from '#shared/schemas/wedding'
import { themeConfigSchema, type ThemeConfig } from '#shared/schemas/theme'
import { weddingContentConfigSchema } from '#shared/schemas/content'
import { resolveWeddingContent } from '#shared/wedding-content'
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_SECONDARY_COLOR,
  WCAG_AA_MIN_CONTRAST,
  checkColorContrast,
  isValidHexColor,
} from '#shared/utils/contrast'
import { DEFAULT_FONT_PAIR_ID, findThemePreset } from '#shared/theme-presets'
import {
  DEFAULT_HERO_BUTTONS,
  DEFAULT_HERO_FEATURED_BUTTON,
  HERO_BUTTON_CATALOG,
} from '#shared/hero-buttons'

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

const toast = useToast()

const settingsTabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'conteudo', label: 'Conteúdo' },
]
const activeTab = ref('geral')

const brandingItems = [
  { id: 'cover', trigger: 'Foto de capa' },
  { id: 'story', trigger: 'Foto da seção "Nossa História"' },
]
const temaItems = [
  { id: 'preset', trigger: 'Preset de tema' },
  { id: 'tipografia', trigger: 'Tipografia' },
  { id: 'cores', trigger: 'Cores' },
]
const experienciaItems = [
  { id: 'countdown', trigger: 'Contagem regressiva' },
  { id: 'hero-buttons', trigger: 'Atalhos do Hero' },
]
const conteudoItems = [
  { id: 'boas-vindas', trigger: 'Boas-vindas' },
  { id: 'historia', trigger: 'Nossa História' },
  { id: 'dress-code', trigger: 'Dress Code' },
  { id: 'manual', trigger: 'Manual dos Convidados' },
  { id: 'presentes', trigger: 'Lista de Presentes' },
  { id: 'faq', trigger: 'Perguntas Frequentes' },
]

const { getWedding, updateWedding, updateWeddingTheme, updateWeddingContent } = useWedding()
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
const storyImageUrl = computed(() => {
  const theme = (wedding.value?.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.storyImageUrl ?? null
})
const coverFocalPoint = computed(() => {
  const theme = (wedding.value?.theme_config ?? {}) as Partial<ThemeConfig>
  return { x: theme.coverFocalX ?? 50, y: theme.coverFocalY ?? 50 }
})
const storyFocalPoint = computed(() => {
  const theme = (wedding.value?.theme_config ?? {}) as Partial<ThemeConfig>
  return { x: theme.storyFocalX ?? 50, y: theme.storyFocalY ?? 50 }
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
const [rsvpDeadline] = defineEventField('rsvpDeadline')
const [childMaxAge] = defineEventField('childMaxAge')
const [guestListMode] = defineEventField('guestListMode')
const [infinitepayHandle] = defineEventField('infinitepayHandle')
const [physicalGiftDeliveryMode] = defineEventField('physicalGiftDeliveryMode')

// UiInput só trabalha com string — childMaxAge no form é number (schema com
// z.coerce.number()), daí o proxy de string aqui (mesmo padrão de
// maxMembersText no antigo formulário de grupos).
const childMaxAgeText = computed({
  get: () => (childMaxAge.value === undefined ? '' : String(childMaxAge.value)),
  set: (value: string) => {
    childMaxAge.value = value === '' ? undefined : Number(value)
  },
})

const onEventSubmit = handleEventSubmit(async (values) => {
  try {
    await updateWedding(values)
    toast.success('Configurações salvas.')
  } catch (err) {
    toast.error(
      isApiError(err)
        ? (err.data?.message ?? 'Não foi possível salvar as configurações.')
        : 'Não foi possível salvar as configurações.',
    )
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
const [titleColor] = defineThemeField('titleColor')
const [bodyColor] = defineThemeField('bodyColor')
const [fontPairId] = defineThemeField('fontPairId')
const [showCountdown] = defineThemeField('showCountdown')
const [heroButtons] = defineThemeField('heroButtons')
const [heroFeaturedButton] = defineThemeField('heroFeaturedButton')

function isHeroButtonSelected(id: string): boolean {
  return (heroButtons.value ?? []).includes(id)
}

function toggleHeroButton(id: string, checked: boolean) {
  const current = heroButtons.value ?? []
  const next = checked ? [...current, id] : current.filter((buttonId) => buttonId !== id)
  heroButtons.value = next
  // O destaque só pode ser um atalho atualmente selecionado — se o casal
  // desmarcar o que estava em destaque, escolhe o próximo automaticamente
  // em vez de deixar um id "órfão" salvo (nunca quebra o Hero público).
  if (!next.includes(heroFeaturedButton.value ?? '')) {
    heroFeaturedButton.value = next[0] ?? ''
  }
}

const heroFeaturedButtonOptions = computed(() =>
  HERO_BUTTON_CATALOG.filter((button) => isHeroButtonSelected(button.id)).map((button) => ({
    value: button.id,
    label: button.label,
  })),
)

// Personalização avançada (Fase Editorial, CLAUDE.md seção 22.3): título e
// corpo de texto continuam opcionais mesmo com o modo ligado — o toggle só
// controla a visibilidade dos campos, nunca força um valor.
const advancedColorEnabled = ref(false)

watch(
  wedding,
  (value) => {
    if (!value) return

    resetEventForm({
      values: {
        coupleNames: value.couple_names,
        eventDate: value.event_date,
        eventTime: value.event_time ? value.event_time.slice(0, 5) : '',
        rsvpDeadline: value.rsvp_deadline ? isoToDatetimeLocal(value.rsvp_deadline) : '',
        childMaxAge: value.child_max_age,
        guestListMode: value.guest_list_mode as 'closed' | 'open',
        infinitepayHandle: value.infinitepay_handle ?? '',
        physicalGiftDeliveryMode: value.physical_gift_delivery_mode as
          | 'both'
          | 'self_purchase_only'
          | 'payment_only',
      },
    })

    const theme = (value.theme_config ?? {}) as Partial<ThemeConfig>
    resetThemeForm({
      values: {
        presetId: theme.presetId ?? '',
        primaryColor: theme.primaryColor ?? DEFAULT_PRIMARY_COLOR,
        secondaryColor: theme.secondaryColor ?? DEFAULT_SECONDARY_COLOR,
        titleColor: theme.titleColor ?? '',
        bodyColor: theme.bodyColor ?? '',
        fontPairId: theme.fontPairId ?? DEFAULT_FONT_PAIR_ID,
        showCountdown: theme.showCountdown ?? true,
        heroButtons: theme.heroButtons ?? DEFAULT_HERO_BUTTONS,
        heroFeaturedButton: theme.heroFeaturedButton ?? DEFAULT_HERO_FEATURED_BUTTON,
      },
    })
    advancedColorEnabled.value = Boolean(theme.titleColor || theme.bodyColor)
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
const titleContrastPreview = computed(() => {
  if (!titleColor.value || !isValidHexColor(titleColor.value)) return null
  return checkColorContrast(titleColor.value)
})
const bodyContrastPreview = computed(() => {
  if (!bodyColor.value || !isValidHexColor(bodyColor.value)) return null
  return checkColorContrast(bodyColor.value)
})

watch(advancedColorEnabled, (enabled) => {
  if (!enabled) {
    titleColor.value = ''
    bodyColor.value = ''
  }
})

const onThemeSubmit = handleThemeSubmit(async (values) => {
  try {
    await updateWeddingTheme(values)
    // Atualiza o cache compartilhado (chave 'wedding') para que o layout
    // admin reflita a cor nova imediatamente, sem reload completo.
    await refresh()
    toast.success('Aparência salva.')
  } catch (err) {
    toast.error(
      isApiError(err)
        ? (err.data?.message ?? 'Não foi possível salvar a aparência.')
        : 'Não foi possível salvar a aparência.',
    )
  }
})

// --- Conteúdo (mensagens narrativas do site público — CLAUDE.md, roadmap
// "Fase Mensagens Personalizáveis") — endpoint próprio, separado dos dados
// de negócio e da aparência visual. ---
const {
  handleSubmit: handleContentSubmit,
  defineField: defineContentField,
  errors: contentErrors,
  resetForm: resetContentForm,
  isSubmitting: isContentSubmitting,
} = useForm({ validationSchema: toTypedSchema(weddingContentConfigSchema) })

const [welcomeTitle] = defineContentField('welcomeTitle')
const [welcomeMessage] = defineContentField('welcomeMessage')
const [storyMessage] = defineContentField('storyMessage')
const [dressCodeDescription] = defineContentField('dressCodeDescription')
const [dressCodeSuggestions] = defineContentField('dressCodeSuggestions')
const [guestManualIntro] = defineContentField('guestManualIntro')
const [guestManualTopics] = defineContentField('guestManualTopics')
const [giftsIntroMessage] = defineContentField('giftsIntroMessage')
const [faqItems] = defineContentField('faqItems')

function addDressCodeSuggestion() {
  dressCodeSuggestions.value = [...(dressCodeSuggestions.value ?? []), '']
}
function updateDressCodeSuggestion(index: number, value: string) {
  dressCodeSuggestions.value = (dressCodeSuggestions.value ?? []).map((tip, i) => (i === index ? value : tip))
}
function removeDressCodeSuggestion(index: number) {
  dressCodeSuggestions.value = (dressCodeSuggestions.value ?? []).filter((_, i) => i !== index)
}

watch(
  wedding,
  (value) => {
    if (!value) return
    const resolved = resolveWeddingContent(value.content_config)
    resetContentForm({
      values: {
        welcomeTitle: resolved.welcomeTitle,
        welcomeMessage: resolved.welcomeParagraphs.join('\n\n'),
        storyMessage: resolved.storyParagraphs.join('\n\n'),
        dressCodeDescription: resolved.dressCodeDescription,
        dressCodeSuggestions: resolved.dressCodeSuggestions,
        guestManualIntro: resolved.guestManualIntro,
        guestManualTopics: resolved.guestManualTopics,
        giftsIntroMessage: resolved.giftsIntroMessage,
        faqItems: resolved.faqItems,
      },
    })
  },
  { immediate: true },
)

const onContentSubmit = handleContentSubmit(async (values) => {
  try {
    await updateWeddingContent(values)
    await refresh()
    toast.success('Conteúdo salvo.')
  } catch (err) {
    toast.error(
      isApiError(err)
        ? (err.data?.message ?? 'Não foi possível salvar o conteúdo.')
        : 'Não foi possível salvar o conteúdo.',
    )
  }
})
</script>

<template>
  <AdminSection title="Configurações" description="Dados do evento e aparência visual do site.">
    <div v-if="status === 'pending'" class="mx-auto flex max-w-2xl flex-col gap-2">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
    </div>

    <UiTabs v-else v-model="activeTab" :tabs="settingsTabs" class="mx-auto max-w-2xl">
      <template #geral>
        <UiCard>
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
            <UiInput
              v-model="rsvpDeadline"
              type="datetime-local"
              label="Prazo final de RSVP (opcional)"
              :error="eventErrors.rsvpDeadline"
            />
            <UiInput
              v-model="childMaxAgeText"
              type="number"
              label="Idade máxima considerada criança"
              :error="eventErrors.childMaxAge"
            />
            <UiSelect
              v-model="guestListMode"
              label="Lista de convidados"
              :options="[
                { value: 'closed', label: 'Fechada (só convidados pré-cadastrados)' },
                { value: 'open', label: 'Aberta (permite acompanhante avulso no RSVP)' },
              ]"
              :error="eventErrors.guestListMode"
            />
            <UiInput
              v-model="infinitepayHandle"
              label="InfiniteTag da InfinitePay (opcional)"
              placeholder="seuhandle"
              :error="eventErrors.infinitepayHandle"
            />
            <p class="-mt-2 text-xs text-text-muted">
              Ativa o pagamento online na lista de presentes (Contribuições, Presentes Emocionais e
              a opção de presentear a lista física pagando o valor). Sem isso preenchido, os
              convidados só podem reservar presentes físicos gratuitamente. Informe sua InfiniteTag
              pública, sem o "$" — os métodos de pagamento aceitos (Pix, cartão) são definidos
              diretamente na sua conta InfinitePay, não aqui.
            </p>
            <UiSelect
              v-model="physicalGiftDeliveryMode"
              label="Como presentear a Lista de Presentes física"
              :options="[
                { value: 'both', label: 'Convidado escolhe: comprar e entregar, ou pagar online' },
                { value: 'self_purchase_only', label: 'Só comprar e entregar (sem pagamento online)' },
                { value: 'payment_only', label: 'Só pagamento online (sem opção de entregar)' },
              ]"
              :error="eventErrors.physicalGiftDeliveryMode"
            />

            <div class="flex justify-end">
              <UiButton type="submit" :disabled="isEventSubmitting">Salvar dados do evento</UiButton>
            </div>
          </form>
        </UiCard>
      </template>

      <template #aparencia>
        <UiCard>
          <form class="flex flex-col gap-8" @submit="onThemeSubmit">
            <section class="flex flex-col gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Branding</h3>
              <UiAccordion :items="brandingItems">
                <template #content="{ item }">
                  <div class="px-5 pb-5">
                    <AdminCoverImageUploader
                      v-if="item.id === 'cover'"
                      :model-value="coverImageUrl"
                      :focal-point="coverFocalPoint"
                      @update:model-value="() => refresh()"
                      @update:focal-point="() => refresh()"
                    />
                    <AdminStoryImageUploader
                      v-if="item.id === 'story'"
                      :model-value="storyImageUrl"
                      :focal-point="storyFocalPoint"
                      @update:model-value="() => refresh()"
                      @update:focal-point="() => refresh()"
                    />
                  </div>
                </template>
              </UiAccordion>
            </section>

            <section class="flex flex-col gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Tema</h3>
              <UiAccordion :items="temaItems">
                <template #content="{ item }">
                  <div class="px-5 pb-5">
                    <AdminThemePresetPicker
                      v-if="item.id === 'preset'"
                      :model-value="activePresetId"
                      @update:model-value="applyPreset"
                    />

                    <AdminFontPairPicker
                      v-if="item.id === 'tipografia'"
                      v-model="fontPairId"
                      :sample-text="coupleNames || 'Ana & João'"
                    />

                    <div v-if="item.id === 'cores'" class="flex flex-col gap-4">
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

                      <div class="flex flex-col gap-3 rounded-lg border border-border p-4">
                        <UiCheckbox
                          v-model="advancedColorEnabled"
                          label="Personalização avançada (cor de título e de corpo de texto)"
                        />
                        <p class="text-xs text-text-muted">
                          Opcional — sem isso, títulos e textos usam a cor neutra padrão da plataforma. Cada
                          cor continua validada por contraste, como a primária e a secundária.
                        </p>

                        <div v-if="advancedColorEnabled" class="flex flex-col gap-4 sm:flex-row">
                          <div class="flex flex-1 flex-col gap-1">
                            <label class="text-sm font-medium text-text" for="title-color">Cor de título</label>
                            <div class="flex items-center gap-3">
                              <input
                                id="title-color"
                                v-model="titleColor"
                                type="color"
                                class="h-10 w-14 cursor-pointer rounded-md border border-border"
                              />
                              <UiInput v-model="titleColor" class="flex-1" :error="themeErrors.titleColor" />
                            </div>
                            <p
                              v-if="titleContrastPreview"
                              class="text-xs"
                              :class="titleContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
                            >
                              Contraste: {{ titleContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
                              {{ WCAG_AA_MIN_CONTRAST }}:1 —
                              {{ titleContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
                            </p>
                          </div>

                          <div class="flex flex-1 flex-col gap-1">
                            <label class="text-sm font-medium text-text" for="body-color">Cor de corpo de texto</label>
                            <div class="flex items-center gap-3">
                              <input
                                id="body-color"
                                v-model="bodyColor"
                                type="color"
                                class="h-10 w-14 cursor-pointer rounded-md border border-border"
                              />
                              <UiInput v-model="bodyColor" class="flex-1" :error="themeErrors.bodyColor" />
                            </div>
                            <p
                              v-if="bodyContrastPreview"
                              class="text-xs"
                              :class="bodyContrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
                            >
                              Contraste: {{ bodyContrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
                              {{ WCAG_AA_MIN_CONTRAST }}:1 —
                              {{ bodyContrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </UiAccordion>
            </section>

            <section class="flex flex-col gap-3">
              <h3 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Experiência</h3>
              <UiAccordion :items="experienciaItems">
                <template #content="{ item }">
                  <div class="px-5 pb-5">
                    <UiCheckbox
                      v-if="item.id === 'countdown'"
                      v-model="showCountdown"
                      label="Mostrar contagem regressiva no site"
                    />

                    <div v-if="item.id === 'hero-buttons'" class="flex flex-col gap-3">
                      <p class="text-xs text-text-muted">
                        Escolha quais botões aparecem logo abaixo da contagem regressiva no topo do site e
                        qual fica em destaque (cor preenchida) — os demais aparecem em contorno.
                      </p>
                      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <UiCheckbox
                          v-for="button in HERO_BUTTON_CATALOG"
                          :key="button.id"
                          :model-value="isHeroButtonSelected(button.id)"
                          :label="button.label"
                          @update:model-value="(checked) => toggleHeroButton(button.id, checked)"
                        />
                      </div>
                      <UiSelect
                        v-if="heroFeaturedButtonOptions.length"
                        v-model="heroFeaturedButton"
                        label="Atalho em destaque"
                        :options="heroFeaturedButtonOptions"
                      />
                      <p v-else class="text-xs text-text-muted">
                        Selecione ao menos um atalho acima para escolher qual fica em destaque.
                      </p>
                    </div>
                  </div>
                </template>
              </UiAccordion>
            </section>

            <div class="flex justify-end">
              <UiButton type="submit" :disabled="isThemeSubmitting">Salvar aparência</UiButton>
            </div>
          </form>
        </UiCard>
      </template>

      <template #conteudo>
        <UiCard>
          <form class="flex flex-col gap-6" @submit="onContentSubmit">
            <p class="text-xs text-text-muted">
              Cada mensagem já vem preenchida com o texto padrão da plataforma — edite à vontade para contar a
              sua própria história, ou deixe como está.
            </p>

            <UiAccordion :items="conteudoItems">
              <template #content="{ item }">
                <div class="flex flex-col gap-4 px-5 pb-5">
                  <template v-if="item.id === 'boas-vindas'">
                    <UiInput v-model="welcomeTitle" label="Título" :error="contentErrors.welcomeTitle" />
                    <UiTextarea
                      v-model="welcomeMessage"
                      label="Mensagem"
                      :rows="4"
                      :error="contentErrors.welcomeMessage"
                    />
                    <p class="-mt-2 text-xs text-text-muted">
                      Separe parágrafos deixando uma linha em branco entre eles.
                    </p>
                  </template>

                  <template v-if="item.id === 'historia'">
                    <UiTextarea
                      v-model="storyMessage"
                      label="Mensagem"
                      :rows="6"
                      :error="contentErrors.storyMessage"
                    />
                    <p class="-mt-2 text-xs text-text-muted">
                      Separe parágrafos deixando uma linha em branco entre eles.
                    </p>
                  </template>

                  <template v-if="item.id === 'dress-code'">
                    <UiTextarea
                      v-model="dressCodeDescription"
                      label="Descrição"
                      :rows="3"
                      :error="contentErrors.dressCodeDescription"
                    />
                    <div class="flex flex-col gap-2">
                      <span class="text-sm font-medium text-text">Sugestões</span>
                      <div
                        v-for="(tip, index) in dressCodeSuggestions"
                        :key="index"
                        class="flex items-center gap-2"
                      >
                        <UiInput
                          class="flex-1"
                          :model-value="tip"
                          @update:model-value="(value) => updateDressCodeSuggestion(index, value)"
                        />
                        <UiButton type="button" size="sm" variant="ghost" @click="removeDressCodeSuggestion(index)">
                          <Icon name="lucide:trash-2" class="h-4 w-4" />
                        </UiButton>
                      </div>
                      <UiButton type="button" variant="outline" class="self-start" @click="addDressCodeSuggestion">
                        <Icon name="lucide:plus" class="h-4 w-4" />
                        Adicionar sugestão
                      </UiButton>
                    </div>
                  </template>

                  <template v-if="item.id === 'manual'">
                    <UiTextarea
                      v-model="guestManualIntro"
                      label="Introdução"
                      :rows="2"
                      :error="contentErrors.guestManualIntro"
                    />
                    <AdminManualTopicsEditor
                      :model-value="guestManualTopics ?? []"
                      @update:model-value="(value) => (guestManualTopics = value)"
                    />
                  </template>

                  <template v-if="item.id === 'presentes'">
                    <UiTextarea
                      v-model="giftsIntroMessage"
                      label="Mensagem"
                      :rows="4"
                      :error="contentErrors.giftsIntroMessage"
                    />
                  </template>

                  <template v-if="item.id === 'faq'">
                    <AdminFaqItemsEditor
                      :model-value="faqItems ?? []"
                      @update:model-value="(value) => (faqItems = value)"
                    />
                  </template>
                </div>
              </template>
            </UiAccordion>

            <div class="flex justify-end">
              <UiButton type="submit" :disabled="isContentSubmitting">Salvar conteúdo</UiButton>
            </div>
          </form>
        </UiCard>
      </template>
    </UiTabs>
  </AdminSection>
</template>
