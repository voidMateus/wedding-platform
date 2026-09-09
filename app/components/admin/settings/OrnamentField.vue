<!--
  Cor de ornamento — o dourado do convite (Fase Rebrand do Convite).

  Por que não é só mais um AdminSettingsColorPicker: aquele mede toda cor
  contra o fundo claro do site e reprova o que não passa em 4.5:1. Um dourado
  de filete nunca passa nessa medida, e não precisa passar — ele não é texto.
  Aqui o campo aceita o tom claro sem reclamar.

  O aviso que sobra é o único que de fato importa, e só aparece quando faz
  sentido: se a seção Versículo tem texto, ali o ornamento vira letra sobre a
  faixa na cor primária, e é ESSE par que precisa ser legível. Sem versículo,
  não há nada a avisar — o ornamento só desenha filete.

  É aviso, não bloqueio: quem escolheu um dourado específico do próprio
  convite pode ter razões que o cálculo não conhece, e o schema não reprova.
-->
<script setup lang="ts">
import { THEME_PRESETS } from '#shared/theme-presets'
import {
  WCAG_AA_MIN_CONTRAST,
  checkOrnamentOnPrimary,
  isValidHexColor,
} from '#shared/utils/contrast'

interface Props {
  modelValue: string | undefined
  /** Cor primária em edição no formulário — é contra ela que o versículo é lido. */
  primaryColor: string | undefined
  /** A seção Versículo tem texto? Sem ela, o ornamento nunca vira texto e não há o que avisar. */
  verseActive: boolean
  error?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/**
 * Ornamentos já desenhados nos presets, seguidos das secundárias — que são
 * candidatas legítimas, já que é justamente a secundária que o ornamento herda
 * quando ninguém escolhe nada. Só o dourado do preset "Convite de Luxo"
 * deixaria a faixa de sugestões com uma bolinha só.
 */
const suggestions = computed(() => [
  ...new Set([
    ...THEME_PRESETS.map((preset) => preset.ornamentColor).filter((color): color is string =>
      Boolean(color),
    ),
    ...THEME_PRESETS.map((preset) => preset.secondaryColor),
  ]),
])

const verseContrast = computed(() => {
  const ornament = props.modelValue
  const primary = props.primaryColor
  if (!props.verseActive) return null
  if (!ornament || !isValidHexColor(ornament)) return null
  if (!primary || !isValidHexColor(primary)) return null
  return checkOrnamentOnPrimary(ornament, primary)
})

const ratioLabel = computed(() =>
  verseContrast.value
    ? `Contraste ${verseContrast.value.ratio.toFixed(2)}:1 contra a cor primária — o mínimo recomendado (WCAG AA) é ${WCAG_AA_MIN_CONTRAST}:1.`
    : undefined,
)
</script>

<template>
  <div class="flex flex-1 flex-col gap-2">
    <UiColorPicker
      :model-value="modelValue"
      label="Cor de ornamento"
      hint="Filetes, divisores, o “&” da capa e o monograma. Não é usada em texto — por isso pode ser bem mais clara que as outras."
      :error="error"
      :suggestions="suggestions"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <p
      v-if="verseContrast && verseContrast.meetsMinimum"
      class="flex items-center gap-1.5 text-xs text-success"
      :title="ratioLabel"
    >
      <Icon name="lucide:check-circle-2" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Legível no Versículo, sobre a cor primária.
    </p>

    <p
      v-else-if="verseContrast"
      class="flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/5 p-2.5 text-xs leading-relaxed text-warning"
      :title="ratioLabel"
    >
      <Icon name="lucide:alert-triangle" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>
        Como filete este tom funciona, mas no Versículo ele vira texto sobre a cor primária — e ali
        fica difícil de ler. Um dourado um pouco mais claro, ou uma cor primária mais escura,
        resolve.
      </span>
    </p>
  </div>
</template>
