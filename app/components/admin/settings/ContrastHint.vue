<!--
  Leitura de contraste de uma cor da paleta, em linguagem de gente.

  Antes era "Contraste 3.76:1 · mínimo 4.5:1 — insuficiente": uma razão
  matemática, um limiar do WCAG e um veredito seco, sem dizer o que está em
  risco nem o que fazer. Um casal escolhendo a cor do site não tem por que
  saber o que é 4.5:1.

  Agora diz a consequência ("texto difícil de ler") e oferece a saída em um
  clique — o mesmo tom, só mais fechado, calculado por `suggestAccessibleColor`
  (que preserva matiz e saturação de propósito: a correção devolve a cor
  escolhida, não outra). A razão continua acessível no `title`, para quem
  quiser o número.
-->
<script setup lang="ts">
import {
  WCAG_AA_MIN_CONTRAST,
  checkColorContrast,
  isValidHexColor,
  suggestAccessibleColor,
} from '#shared/utils/contrast'

interface Props {
  color: string | undefined
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Casal aceitou o tom sugerido. */
  apply: [value: string]
}>()

const contrast = computed(() => {
  if (!props.color || !isValidHexColor(props.color)) return null
  return checkColorContrast(props.color)
})

const suggestion = computed(() => (props.color ? suggestAccessibleColor(props.color) : null))

const ratioLabel = computed(() =>
  contrast.value
    ? `Contraste ${contrast.value.ratioAgainstSurface.toFixed(2)}:1 — o mínimo recomendado (WCAG AA) é ${WCAG_AA_MIN_CONTRAST}:1.`
    : undefined,
)
</script>

<template>
  <div v-if="contrast" class="flex flex-col gap-2">
    <p
      v-if="contrast.meetsMinimum"
      class="flex items-center gap-1.5 text-xs text-success"
      :title="ratioLabel"
    >
      <Icon name="lucide:check-circle-2" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Boa legibilidade sobre o fundo do site.
    </p>

    <div v-else class="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/5 p-2.5">
      <p class="flex items-start gap-1.5 text-xs leading-relaxed text-warning" :title="ratioLabel">
        <Icon name="lucide:alert-triangle" class="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span> Este tom é claro demais para o fundo do site e deixa o texto difícil de ler. </span>
      </p>

      <button
        v-if="suggestion"
        type="button"
        class="flex items-center gap-2 self-start rounded-md border border-border bg-surface-elevated px-2.5 py-1.5 text-xs font-medium text-text transition-brand hover:border-primary/40 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="emit('apply', suggestion)"
      >
        <span
          class="h-3.5 w-3.5 shrink-0 rounded-sm border border-border"
          :style="{ backgroundColor: suggestion }"
          aria-hidden="true"
        />
        Usar este tom, um pouco mais escuro
      </button>
    </div>
  </div>
</template>
