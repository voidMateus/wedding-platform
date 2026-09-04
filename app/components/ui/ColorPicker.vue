<!--
  Seletor de cor da plataforma. Substitui o `<input type="color">`, que abre o
  diálogo de cor do sistema operacional — aparência diferente em cada SO, fora
  da paleta do produto e sem nenhuma das ajudas que o casal precisa (paleta
  sugerida, leitura de contraste).

  Headless via Reka UI (`ColorArea` + `ColorSlider` + `ColorField`), então o
  arraste, o teclado (setas ajustam canal) e a semântica de slider vêm do
  primitive. As primitivas aceitam e devolvem hex, o que mantém o contrato de
  valor deste componente em `#rrggbb` — o mesmo que os schemas Zod e o
  `config_tema` já usam.

  A faixa de sugestões existe porque escolher cor de casamento numa roda
  contínua é intimidante: os presets do tema dão um ponto de partida bom em
  um clique, e o campo hex atende quem já tem a cor da identidade na mão.
-->
<script setup lang="ts">
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorFieldInput,
  ColorFieldRoot,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  colorToHex,
  type Color,
} from 'reka-ui'
import { isValidHexColor } from '#shared/utils/contrast'

interface Props {
  modelValue: string | undefined
  label?: string
  error?: string
  /** Cores sugeridas na faixa do rodapé (ex.: as cores dos presets de tema). */
  suggestions?: string[]
  disabled?: boolean
}

const { modelValue, label, error, suggestions = [], disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fieldId = useId()
const isOpen = ref(false)

/**
 * As primitivas do Reka lançam em valor inválido, e o valor vem de um campo
 * que o casal pode estar editando (um hex a meio digitar é estado normal).
 * Enquanto estiver inválido, as primitivas recebem o último tom válido — em
 * vez de derrubar o render.
 */
const FALLBACK = '#000000'
const lastValid = ref(isValidHexColor(modelValue ?? '') ? (modelValue as string) : FALLBACK)

watch(
  () => modelValue,
  (value) => {
    if (value && isValidHexColor(value)) lastValid.value = value
  },
)

const safeColor = computed(() =>
  isValidHexColor(modelValue ?? '') ? modelValue! : lastValid.value,
)

function emitColor(color: Color) {
  emit('update:modelValue', colorToHex(color).toLowerCase())
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label v-if="label" :for="fieldId" class="text-sm font-medium text-text">{{ label }}</label>

    <PopoverRoot v-model:open="isOpen">
      <PopoverTrigger
        :id="fieldId"
        :disabled="disabled"
        class="flex h-10 w-full items-center gap-2.5 rounded-md border border-border bg-surface px-2.5 text-left text-sm text-text transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        :aria-invalid="Boolean(error)"
      >
        <span
          class="h-6 w-6 shrink-0 rounded border border-border"
          :style="{ backgroundColor: safeColor }"
          aria-hidden="true"
        />
        <span class="min-w-0 flex-1 truncate font-mono text-xs uppercase">
          {{ modelValue || 'Escolher cor' }}
        </span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-text-muted" />
      </PopoverTrigger>

      <!-- z-60: precisa passar por cima do UiModal (z-50). -->
      <PopoverPortal>
        <PopoverContent
          :side-offset="6"
          align="start"
          class="z-60 w-64 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg"
        >
          <div class="flex flex-col gap-3">
            <ColorAreaRoot
              :model-value="safeColor"
              color-space="hsl"
              x-channel="saturation"
              y-channel="lightness"
              class="relative h-36 w-full overflow-hidden rounded-md border border-border"
              @update:color="emitColor"
            >
              <ColorAreaArea class="h-full w-full">
                <ColorAreaThumb
                  class="h-4 w-4 rounded-full border-2 border-white shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </ColorAreaArea>
            </ColorAreaRoot>

            <ColorSliderRoot
              :model-value="safeColor"
              channel="hue"
              color-space="hsl"
              class="relative flex h-4 w-full touch-none items-center"
              @update:color="emitColor"
            >
              <ColorSliderTrack class="h-3 w-full rounded-full border border-border">
                <ColorSliderThumb
                  class="h-4 w-4 rounded-full border-2 border-white shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
              </ColorSliderTrack>
            </ColorSliderRoot>

            <ColorFieldRoot
              :model-value="safeColor"
              class="flex items-center gap-2"
              @update:color="emitColor"
            >
              <ColorFieldInput
                class="h-9 w-full rounded-md border border-border bg-surface px-2.5 font-mono text-xs uppercase text-text transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Código hexadecimal da cor"
              />
            </ColorFieldRoot>

            <div
              v-if="suggestions.length"
              class="flex flex-col gap-1.5 border-t border-border pt-3"
            >
              <p class="text-xs font-medium text-text-muted">Cores dos temas prontos</p>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="suggestion in suggestions"
                  :key="suggestion"
                  type="button"
                  class="h-6 w-6 rounded border transition-brand hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  :class="
                    suggestion.toLowerCase() === (modelValue ?? '').toLowerCase()
                      ? 'border-text ring-2 ring-primary ring-offset-1'
                      : 'border-border'
                  "
                  :style="{ backgroundColor: suggestion }"
                  :aria-label="`Usar a cor ${suggestion}`"
                  @click="emit('update:modelValue', suggestion.toLowerCase())"
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
