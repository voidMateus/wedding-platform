<script setup lang="ts">
import { formatCentsToAmount } from '#shared/utils/format-currency'

interface Props {
  /** Valor em centavos — `undefined`/`null` quando o campo está vazio. */
  modelValue?: number | null
  label?: string
  error?: string
  disabled?: boolean
  /** Teto de dígitos aceitos (padrão: 11 → R$ 999.999.999,99). */
  maxDigits?: number
}

const { modelValue = null, label, error, disabled = false, maxDigits = 11 } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number | undefined]
}>()

const inputId = useId()

const displayText = computed(() =>
  modelValue === null || modelValue === undefined ? '' : formatCentsToAmount(modelValue),
)

// Máscara de acumulação: o campo guarda centavos e só aceita dígitos, que
// entram sempre pela direita (digitar "1", "0", "0" percorre 0,01 → 0,10 →
// 1,00). É o comportamento padrão de campo de dinheiro no Brasil e evita o
// problema de reformatar texto livre a cada tecla, que empurrava os dígitos
// para a direita da vírgula ("1.00000").
function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  const digits = el.value
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, maxDigits)
  const cents = digits === '' ? undefined : Number(digits)
  // O DOM é reescrito à mão porque o texto formatado pode não mudar (letra
  // digitada, dígito além do teto): nesse caso o Vue não repinta o `:value`
  // e o campo ficaria com o lixo digitado.
  el.value = cents === undefined ? '' : formatCentsToAmount(cents)
  emit('update:modelValue', cents)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-text">
      {{ label }}
    </label>
    <div class="relative flex flex-col">
      <span
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted"
        aria-hidden="true"
      >
        R$
      </span>
      <input
        :id="inputId"
        type="text"
        inputmode="numeric"
        placeholder="0,00"
        :disabled="disabled"
        :value="displayText"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="h-10 rounded-md border border-border bg-surface pl-10 pr-3 text-sm tabular-nums text-text placeholder:text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        @input="onInput"
      />
    </div>
    <p v-if="error" :id="`${inputId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
