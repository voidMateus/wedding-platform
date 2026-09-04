<!--
  Campo de data da plataforma. Substitui o `<input type="date">` nativo, que
  tinha dois problemas reais: só abre o calendário quando se acerta o ícone
  (clicar no campo não faz nada) e o calendário é o do navegador — sem raio,
  sem a paleta do tema, com aparência diferente em cada sistema operacional.

  Aqui o campo INTEIRO é o gatilho, e o calendário é desenhado por nós
  (headless via Reka UI: `PopoverRoot` + `CalendarRoot`). O primitive cuida
  do que não se reimplementa sem bug — navegação por setas dentro da grade,
  `role="grid"` com rótulos de dia da semana, foco inicial no dia
  selecionado e semântica de célula desabilitada.

  A navegação tem dois passos porque data de casamento costuma estar a anos
  de distância: mês a mês (‹ ›) e ano a ano (« »). Só com mês a mês, marcar
  dezembro de 2027 a partir de hoje seriam ~27 cliques.

  Contrato de valor: `v-model` é sempre a string `YYYY-MM-DD` (o formato que
  o Postgres e os schemas Zod já usam) — o `CalendarDate` do
  `@internationalized/date` fica contido aqui dentro, e nenhum formulário
  precisou mudar de tipo.
-->
<script setup lang="ts">
import {
  type CalendarDate,
  type DateValue,
  getLocalTimeZone,
  parseDate,
  today,
} from '@internationalized/date'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarRoot,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
  PopoverTrigger,
} from 'reka-ui'

interface Props {
  /** Data no formato `YYYY-MM-DD`, ou string vazia quando não há data. */
  modelValue?: string
  label?: string
  placeholder?: string
  error?: string
  /** Linha de apoio abaixo do campo — mesmo contrato do UiInput. */
  hint?: string
  disabled?: boolean
  /** Permite limpar a data (campos opcionais). */
  clearable?: boolean
}

const {
  modelValue = '',
  label,
  placeholder = 'Selecione uma data',
  error,
  hint,
  disabled = false,
  clearable = false,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fieldId = useId()

const describedBy = computed(() => {
  const ids = [hint ? `${fieldId}-hint` : '', error ? `${fieldId}-error` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})

const isOpen = ref(false)

/**
 * `parseDate` lança em string malformada — e o valor chega de um formulário,
 * que pode estar a meio caminho de ser preenchido. Um valor inválido conta
 * como "sem data" (o campo mostra o placeholder), nunca como exceção de
 * render.
 */
function parseOrUndefined(value: string): CalendarDate | undefined {
  if (!value) return undefined
  try {
    return parseDate(value)
  } catch {
    return undefined
  }
}

const selectedDate = computed(() => parseOrUndefined(modelValue))

// Mês exibido quando ainda não há data escolhida: o do valor atual, ou o
// mês corrente.
//
// shallowRef, não ref: `ref()` embrulha o valor em `reactive()`, e um
// `CalendarDate` é uma classe imutável — o proxy profundo quebra os
// `instanceof` que o Reka faz internamente e ainda faz o TypeScript perder o
// tipo (o proxy não satisfaz mais `DateValue`). Trocar o mês sempre substitui
// o objeto inteiro, então rastreio profundo não serviria pra nada aqui.
const displayedMonth = shallowRef<DateValue>(selectedDate.value ?? today(getLocalTimeZone()))

watch(selectedDate, (value) => {
  if (value) displayedMonth.value = value
})

const formattedValue = computed(() => {
  const date = selectedDate.value
  if (!date) return ''
  return date.toDate(getLocalTimeZone()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

const headingLabel = computed(() => {
  const label = displayedMonth.value
    .toDate(getLocalTimeZone())
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function shiftMonths(amount: number) {
  displayedMonth.value = displayedMonth.value.add({ months: amount })
}

function handleSelect(value: DateValue | DateValue[] | undefined) {
  // `multiple` não é usado aqui, então um array só apareceria por engano de
  // configuração — tratado como "nada selecionado" em vez de quebrar.
  if (!value || Array.isArray(value)) return
  emit(
    'update:modelValue',
    `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`,
  )
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

    <PopoverRoot v-model:open="isOpen">
      <PopoverTrigger
        :id="fieldId"
        :disabled="disabled"
        class="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        :class="formattedValue ? 'text-text' : 'text-text-muted'"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
      >
        <Icon name="lucide:calendar-days" class="h-4 w-4 shrink-0 text-text-muted" />
        <span class="min-w-0 flex-1 truncate">{{ formattedValue || placeholder }}</span>
        <Icon name="lucide:chevron-down" class="h-4 w-4 shrink-0 text-text-muted" />
      </PopoverTrigger>

      <!-- z-60: precisa passar por cima do UiModal (z-50). -->
      <PopoverPortal>
        <PopoverContent
          :side-offset="6"
          align="start"
          class="z-60 rounded-lg border border-border bg-surface-elevated p-3 shadow-lg"
        >
          <CalendarRoot
            v-slot="{ grid, weekDays }"
            :model-value="selectedDate"
            :placeholder="displayedMonth"
            locale="pt-BR"
            :week-starts-on="0"
            fixed-weeks
            initial-focus
            @update:model-value="handleSelect"
            @update:placeholder="(value) => (displayedMonth = value)"
          >
            <div class="mb-2 flex items-center justify-between gap-1">
              <div class="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Ano anterior"
                  class="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="shiftMonths(-12)"
                >
                  <Icon name="lucide:chevrons-left" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Mês anterior"
                  class="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="shiftMonths(-1)"
                >
                  <Icon name="lucide:chevron-left" class="h-4 w-4" />
                </button>
              </div>

              <span class="font-display text-sm font-semibold text-text">{{ headingLabel }}</span>

              <div class="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Mês seguinte"
                  class="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="shiftMonths(1)"
                >
                  <Icon name="lucide:chevron-right" class="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Ano seguinte"
                  class="grid h-7 w-7 place-items-center rounded-md text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  @click="shiftMonths(12)"
                >
                  <Icon name="lucide:chevrons-right" class="h-4 w-4" />
                </button>
              </div>
            </div>

            <CalendarGrid
              v-for="month in grid"
              :key="month.value.toString()"
              class="w-full border-collapse"
            >
              <CalendarGridHead>
                <CalendarGridRow class="flex">
                  <CalendarHeadCell
                    v-for="day in weekDays"
                    :key="day"
                    class="grid h-8 w-9 place-items-center text-xs font-medium text-text-muted"
                  >
                    {{ day.slice(0, 3) }}
                  </CalendarHeadCell>
                </CalendarGridRow>
              </CalendarGridHead>
              <CalendarGridBody>
                <CalendarGridRow
                  v-for="(weekDates, index) in month.rows"
                  :key="`week-${index}`"
                  class="flex"
                >
                  <CalendarCell
                    v-for="weekDate in weekDates"
                    :key="weekDate.toString()"
                    :date="weekDate"
                    class="grid h-9 w-9 place-items-center p-0.5"
                  >
                    <CalendarCellTrigger
                      :day="weekDate"
                      :month="month.value"
                      class="grid h-8 w-8 cursor-pointer place-items-center rounded-md text-sm text-text transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[outside-view]:text-text-muted/50 data-[selected]:bg-primary data-[selected]:font-semibold data-[selected]:text-primary-foreground data-[today]:font-semibold data-[today]:text-primary data-[disabled]:opacity-40 data-[selected]:data-[today]:text-primary-foreground"
                    />
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>

            <div
              v-if="clearable && modelValue"
              class="mt-2 flex justify-end border-t border-border pt-2"
            >
              <button
                type="button"
                class="rounded-md px-2 py-1 text-xs font-medium text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="clear"
              >
                Limpar data
              </button>
            </div>
          </CalendarRoot>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <p v-if="hint" :id="`${fieldId}-hint`" class="text-xs leading-relaxed text-text-muted">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${fieldId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
