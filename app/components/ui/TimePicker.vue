<!--
  Campo de horário da plataforma. Substitui o `<input type="time">` nativo,
  que herda a aparência do sistema operacional (spinner do Windows, roda do
  iOS) e ignora a paleta do tema.

  Aqui o campo é segmentado (hora e minuto separados, headless via Reka
  `TimeFieldRoot`): cada segmento aceita digitação direta e as setas ↑/↓
  ajustam o valor, sem precisar acertar um spinner de 8px. Ao lado, um
  atalho para os horários mais comuns de cerimônia — a maioria dos casais
  escolhe uma hora cheia ou meia hora, e escolher da lista é mais rápido do
  que digitar.

  Contrato de valor: `v-model` é sempre a string `HH:mm` (o que os schemas
  Zod e a coluna `horario_evento` já usam), string vazia quando não há
  horário. O `Time` do `@internationalized/date` fica contido aqui dentro.
-->
<script setup lang="ts">
import { Time } from '@internationalized/date'
import {
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
  TimeFieldInput,
  TimeFieldRoot,
} from 'reka-ui'

interface Props {
  /** Horário no formato `HH:mm`, ou string vazia quando não há horário. */
  modelValue?: string
  label?: string
  error?: string
  /** Linha de apoio abaixo do campo — mesmo contrato do UiInput. */
  hint?: string
  disabled?: boolean
}

const { modelValue = '', label, error, hint, disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fieldId = useId()

const describedBy = computed(() => {
  const ids = [hint ? `${fieldId}-hint` : '', error ? `${fieldId}-error` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})

/** Horários de cerimônia mais escolhidos — atalho, não uma restrição. */
const COMMON_TIMES = [
  '10:00',
  '11:00',
  '15:00',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '19:00',
  '20:00',
]

const isOpen = ref(false)

/** `HH:mm` malformado conta como "sem horário", nunca como erro de render. */
const time = computed(() => {
  const match = /^(\d{1,2}):(\d{2})/.exec(modelValue)
  if (!match) return undefined
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return undefined
  return new Time(hour, minute)
})

function emitTime(value: Time | null | undefined) {
  if (!value) {
    emit('update:modelValue', '')
    return
  }
  emit(
    'update:modelValue',
    `${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`,
  )
}

function pickCommonTime(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

function clear() {
  emit('update:modelValue', '')
  isOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="fieldId" class="text-sm font-medium text-text">{{ label }}</label>

    <div
      class="flex h-10 items-center gap-1 rounded-md border border-border bg-surface pl-3 pr-1 transition-brand focus-within:border-primary/40"
      :class="disabled && 'cursor-not-allowed opacity-50'"
    >
      <Icon name="lucide:clock" class="h-4 w-4 shrink-0 text-text-muted" />

      <TimeFieldRoot
        :id="fieldId"
        v-slot="{ segments }"
        :model-value="time"
        granularity="minute"
        :hour-cycle="24"
        locale="pt-BR"
        :disabled="disabled"
        class="flex min-w-0 flex-1 items-center text-sm text-text"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        @update:model-value="(value) => emitTime(value as Time | null | undefined)"
      >
        <template v-for="item in segments" :key="item.part">
          <TimeFieldInput v-if="item.part === 'literal'" :part="item.part" class="text-text-muted">
            {{ item.value }}
          </TimeFieldInput>
          <TimeFieldInput
            v-else
            :part="item.part"
            class="rounded px-1 tabular-nums transition-brand focus:bg-primary/10 focus:text-primary focus:outline-none data-[placeholder]:text-text-muted"
          >
            {{ item.value }}
          </TimeFieldInput>
        </template>
      </TimeFieldRoot>

      <PopoverRoot v-model:open="isOpen">
        <PopoverTrigger
          :disabled="disabled"
          aria-label="Escolher um horário comum"
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed"
        >
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </PopoverTrigger>

        <!-- z-60: precisa passar por cima do UiModal (z-50). -->
        <PopoverPortal>
          <PopoverContent
            :side-offset="6"
            align="end"
            class="z-60 w-44 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
          >
            <p class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
              Horários comuns
            </p>
            <div class="grid grid-cols-2 gap-0.5">
              <button
                v-for="option in COMMON_TIMES"
                :key="option"
                type="button"
                class="flex items-center justify-between gap-1 rounded-md px-2 py-1.5 text-sm text-text transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                :class="option === modelValue && 'bg-primary/[0.06] font-medium text-primary'"
                @click="pickCommonTime(option)"
              >
                <span class="tabular-nums">{{ option }}</span>
                <Icon v-if="option === modelValue" name="lucide:check" class="h-3.5 w-3.5" />
              </button>
            </div>
            <div v-if="modelValue" class="mt-1 border-t border-border pt-1">
              <button
                type="button"
                class="w-full rounded-md px-2 py-1.5 text-left text-xs font-medium text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="clear"
              >
                Limpar horário
              </button>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>

    <p v-if="hint" :id="`${fieldId}-hint`" class="text-xs leading-relaxed text-text-muted">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${fieldId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
