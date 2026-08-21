<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { themeConfigSchema, type ThemeConfig } from '#shared/schemas/theme'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'
import { DEFAULT_FONT_PAIR_ID, findThemePreset } from '#shared/theme-presets'
import {
  DEFAULT_HERO_BUTTONS,
  DEFAULT_HERO_FEATURED_BUTTON,
  HERO_BUTTON_CATALOG,
} from '#shared/hero-buttons'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
  coupleNames: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  /** Tema salvo, ou foto/foco de capa/história atualizados — o pai recarrega o `wedding` compartilhado. */
  refresh: []
}>()

const toast = useToast()
const { updateWeddingTheme } = useWedding()

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

const coverImageUrl = computed(() => {
  const theme = (props.wedding?.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.coverImageUrl ?? null
})
const storyImageUrl = computed(() => {
  const theme = (props.wedding?.theme_config ?? {}) as Partial<ThemeConfig>
  return theme.storyImageUrl ?? null
})
const coverFocalPoint = computed(() => {
  const theme = (props.wedding?.theme_config ?? {}) as Partial<ThemeConfig>
  return { x: theme.coverFocalX ?? 50, y: theme.coverFocalY ?? 50 }
})
const storyFocalPoint = computed(() => {
  const theme = (props.wedding?.theme_config ?? {}) as Partial<ThemeConfig>
  return { x: theme.storyFocalX ?? 50, y: theme.storyFocalY ?? 50 }
})

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(themeConfigSchema),
})

const [presetId] = defineField('presetId')
const [primaryColor] = defineField('primaryColor')
const [secondaryColor] = defineField('secondaryColor')
const [titleColor] = defineField('titleColor')
const [bodyColor] = defineField('bodyColor')
const [fontPairId] = defineField('fontPairId')
const [showCountdown] = defineField('showCountdown')
const [heroButtons] = defineField('heroButtons')
const [heroFeaturedButton] = defineField('heroFeaturedButton')

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
  () => props.wedding,
  (value) => {
    if (!value) return
    const theme = (value.theme_config ?? {}) as Partial<ThemeConfig>
    resetForm({
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

const activePresetId = computed(() =>
  presetId.value === 'custom' ? null : (presetId.value ?? null),
)

const onSubmit = handleSubmit(async (values) => {
  try {
    await updateWeddingTheme(values)
    emit('refresh')
    toast.success('Aparência salva.')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível salvar a aparência.'))
  }
})
</script>

<template>
  <UiCard>
    <form class="flex flex-col gap-8" @submit="onSubmit">
      <section class="flex flex-col gap-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-text-muted">Branding</h3>
        <UiAccordion :items="brandingItems">
          <template #content="{ item }">
            <div class="px-5 pb-5">
              <AdminCoverImageUploader
                v-if="item.id === 'cover'"
                :model-value="coverImageUrl"
                :focal-point="coverFocalPoint"
                @update:model-value="() => emit('refresh')"
                @update:focal-point="() => emit('refresh')"
              />
              <AdminStoryImageUploader
                v-if="item.id === 'story'"
                :model-value="storyImageUrl"
                :focal-point="storyFocalPoint"
                @update:model-value="() => emit('refresh')"
                @update:focal-point="() => emit('refresh')"
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

              <AdminSettingsColorFields
                v-if="item.id === 'cores'"
                v-model:primary-color="primaryColor"
                v-model:secondary-color="secondaryColor"
                v-model:title-color="titleColor"
                v-model:body-color="bodyColor"
                v-model:advanced-color-enabled="advancedColorEnabled"
                :primary-error="errors.primaryColor"
                :secondary-error="errors.secondaryColor"
                :title-error="errors.titleColor"
                :body-error="errors.bodyColor"
              />
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
        <UiButton type="submit" :disabled="isSubmitting">Salvar aparência</UiButton>
      </div>
    </form>
  </UiCard>
</template>
