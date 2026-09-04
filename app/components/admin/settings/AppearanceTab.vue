<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { themeConfigSchema, type ThemeConfig } from '#shared/schemas/theme'
import { DEFAULT_PRIMARY_COLOR, DEFAULT_SECONDARY_COLOR } from '#shared/utils/contrast'
import { DEFAULT_FONT_PAIR_ID, findThemePreset } from '#shared/theme-presets'
import { DEFAULT_HERO_BUTTONS, DEFAULT_HERO_FEATURED_BUTTON } from '#shared/hero-buttons'
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

const coverImageUrl = computed(() => {
  const theme = (props.wedding?.config_tema ?? {}) as Partial<ThemeConfig>
  return theme.coverImageUrl ?? null
})
const storyImageUrl = computed(() => {
  const theme = (props.wedding?.config_tema ?? {}) as Partial<ThemeConfig>
  return theme.storyImageUrl ?? null
})

const { handleSubmit, defineField, errors, resetForm, isSubmitting, meta } = useForm({
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

// Personalização avançada (Fase Editorial, CLAUDE.md seção 22.3): título e
// corpo de texto continuam opcionais mesmo com o modo ligado — o toggle só
// controla a visibilidade dos campos, nunca força um valor.
const advancedColorEnabled = ref(false)

// Mesma função no watcher e no "Descartar" da barra de salvamento — os dois
// querem "voltar ao que está no servidor", e é o resetForm que zera
// meta.dirty (ver GeneralTab).
function applyWeddingToForm() {
  const value = props.wedding
  if (!value) return
  const theme = (value.config_tema ?? {}) as Partial<ThemeConfig>
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
}

watch(() => props.wedding, applyWeddingToForm, { immediate: true })

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

const activePresetLabel = computed(() => {
  const preset = activePresetId.value ? findThemePreset(activePresetId.value) : null
  return preset?.label ?? null
})

/**
 * As opções avançadas nascem abertas quando o tema já é personalizado — sem
 * isso, quem salvou cores próprias voltaria à tela vendo só a grade de
 * presets, sem nenhum deles marcado e sem pista de onde estão os valores em
 * vigor.
 */
const advancedThemeItems = [
  {
    id: 'avancado',
    trigger: 'Personalizar manualmente',
    hint: 'Tipografia, cor primária, cor secundária e cores de texto.',
  },
]
const defaultOpenAdvancedId = computed(() => (activePresetId.value ? undefined : 'avancado'))

const onSubmit = handleSubmit(
  async (values) => {
    try {
      await updateWeddingTheme(values)
      emit('refresh')
      toast.success('Aparência salva.')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar a aparência.'))
    }
  },
  // Segundo argumento do handleSubmit: sem ele, um formulário reprovado na
  // validação não faz absolutamente nada ao clicar em salvar — nenhuma
  // requisição e nenhum retorno. Numa aba longa o botão fica longe do campo
  // com erro, então quem clicou precisa saber que NADA foi salvo. Vale mais
  // ainda para o contraste de cor, cujo erro de campo é suprimido de
  // propósito para não repetir o aviso (ver AdminSettingsColorPicker).
  () => {
    toast.error('Há campos que precisam de ajuste nesta aba — confira os destaques acima.')
  },
)
</script>

<template>
  <form class="flex flex-col gap-5" @submit="onSubmit">
    <!-- As duas fotos persistem sozinhas, no próprio upload: não passam pelo
         formulário nem pela barra de salvamento, e por isso o meta.dirty da
         aba não as cobre. Daí a descrição avisar que são salvas na hora. -->
    <AdminSettingsSectionCard
      section-id="branding"
      title="Branding"
      description="As duas fotos que aparecem no site dos convidados — cada uma é salva no próprio envio."
    >
      <div class="grid gap-4 md:grid-cols-2">
        <AdminCoverImageUploader
          :model-value="coverImageUrl"
          @update:model-value="() => emit('refresh')"
        />
        <AdminStoryImageUploader
          :model-value="storyImageUrl"
          @update:model-value="() => emit('refresh')"
        />
      </div>
    </AdminSettingsSectionCard>

    <!--
      Tema em dois blocos, e não mais preset + fonte + cores no mesmo nível.
      O preset JÁ define tipografia e as duas cores, então tê-los lado a lado
      dava a impressão de configurar a mesma coisa duas vezes (achado do
      usuário). Agora a leitura é uma escolha: ou um preset pronto, ou as
      opções avançadas.
    -->
    <AdminSettingsSectionCard
      section-id="tema"
      title="Opções de tema"
      description="Um preset pronto já define a tipografia e as cores do site de uma vez."
    >
      <AdminThemePresetPicker :model-value="activePresetId" @update:model-value="applyPreset" />

      <p class="flex items-center gap-1.5 text-xs text-text-muted">
        <Icon
          :name="activePresetLabel ? 'lucide:check-circle-2' : 'lucide:sliders-horizontal'"
          class="h-3.5 w-3.5 shrink-0"
          aria-hidden="true"
        />
        <span v-if="activePresetLabel">
          Usando o preset <strong class="font-medium text-text">{{ activePresetLabel }}</strong
          >.
        </span>
        <span v-else>
          Tema personalizado — os valores em vigor estão nas opções avançadas abaixo.
        </span>
      </p>
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="avancado"
      title="Opções avançadas"
      description="Para quando o preset é só o ponto de partida: cada peça do tema pode ser definida à mão."
    >
      <UiAccordion
        :items="advancedThemeItems"
        variant="plain"
        :default-open-id="defaultOpenAdvancedId"
      >
        <template #content>
          <div class="flex flex-col gap-5 px-4 pb-4">
            <AdminSettingsField
              label="Tipografia"
              hint="Escolha independente das cores — combine qualquer fonte com qualquer paleta."
            >
              <!-- coupleNames vazio cai no exemplo padrão do próprio picker. -->
              <AdminFontPairPicker v-model="fontPairId" :sample-text="coupleNames || undefined" />
            </AdminSettingsField>

            <AdminSettingsColorFields
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
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="experiencia"
      title="Experiência"
      description="Recursos opcionais exibidos para os convidados."
    >
      <AdminSettingsToggleRow
        v-model="showCountdown"
        label="Contagem regressiva"
        hint="Mostra dias, horas e minutos até o evento no topo do site."
      />

      <AdminSettingsHeroShortcutsField
        :model-value="heroButtons"
        :featured="heroFeaturedButton"
        @update:model-value="(value) => (heroButtons = value)"
        @update:featured="(value) => (heroFeaturedButton = value)"
      />
    </AdminSettingsSectionCard>

    <AdminSettingsSaveBar
      action="Salvar aparência"
      :dirty="meta.dirty"
      :submitting="isSubmitting"
      @discard="applyWeddingToForm"
    />
  </form>
</template>
