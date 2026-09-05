<!--
  Dropdown da plataforma. Deixou de ser um `<select>` nativo: a lista do
  sistema operacional não aceita raio, sombra, marca de check nem destaque
  do item ativo, e no Windows/Android ela lê como um controle de 2010 ao
  lado do resto do Design System. Agora é headless via Reka UI, com a lista
  desenhada por nós — mesma decisão já tomada em `Tabs`/`Accordion`.

  O primitive entrega o que não se reimplementa à mão sem bug: navegação
  por setas/Home/End, busca por digitação, `aria-activedescendant`,
  rolagem automática até o item ativo e devolução do foco ao gatilho.

  A API pública é a mesma de antes (`modelValue`, `label`, `options`,
  `placeholder`, `error`, `hint`, `disabled`) — nenhum chamador mudou.
-->
<script setup lang="ts">
import {
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

interface SelectOption {
  value: string
  label: string
}

interface Props {
  modelValue?: string
  label?: string
  options: SelectOption[]
  placeholder?: string
  error?: string
  /** Linha de apoio abaixo do campo — mesmo contrato do UiInput. */
  hint?: string
  disabled?: boolean
}

const {
  modelValue = '',
  label,
  options,
  placeholder = 'Selecione uma opção',
  error,
  hint,
  disabled = false,
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectId = useId()

const describedBy = computed(() => {
  const ids = [hint ? `${selectId}-hint` : '', error ? `${selectId}-error` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})

// A string vazia é reservada pelo primitive para "sem seleção": `SelectItem`
// com `value=""` lança em tempo de execução ("must have a value prop that is
// not an empty string") e derruba a tela inteira. Só que "Nenhum"/"Não
// informada" é uma opção legítima de vários formulários do admin — e nesses
// casos ela precisa aparecer selecionada, com o próprio rótulo, não como
// placeholder. O sentinel abaixo existe só dentro do primitive: entra no
// lugar do '' nos itens e volta a ser '' no emit, então nenhum chamador
// precisa saber que ele existe.
const EMPTY_OPTION_SENTINEL = '__ui-select-empty__'

const hasEmptyOption = computed(() => options.some((option) => option.value === ''))

function toItemValue(value: string): string {
  return value === '' ? EMPTY_OPTION_SENTINEL : value
}

// Sem opção vazia declarada, '' segue virando `undefined` para o placeholder
// aparecer (comportamento de sempre — ex.: "Sexo (opcional)").
const selected = computed({
  get: () => {
    if (modelValue !== '') return modelValue
    return hasEmptyOption.value ? EMPTY_OPTION_SENTINEL : undefined
  },
  set: (value: string | undefined) =>
    emit('update:modelValue', value === EMPTY_OPTION_SENTINEL ? '' : (value ?? '')),
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="selectId" class="text-sm font-medium text-text">
      {{ label }}
    </label>

    <SelectRoot v-model="selected" :disabled="disabled">
      <SelectTrigger
        :id="selectId"
        class="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 text-left text-sm text-text transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-text-muted"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
      >
        <SelectValue :placeholder="placeholder" class="truncate" />
        <SelectIcon class="shrink-0 text-text-muted">
          <Icon name="lucide:chevron-down" class="h-4 w-4" />
        </SelectIcon>
      </SelectTrigger>

      <!--
        Portal + z-60: o dropdown precisa passar por cima do UiModal (z-50) —
        vários formulários do admin abrem em modal e o campo de seleção fica
        dentro dele. `position="popper"` ancora no gatilho e vira pra cima
        sozinho quando não cabe abaixo.
      -->
      <SelectPortal>
        <SelectContent
          position="popper"
          :side-offset="6"
          class="z-60 max-h-72 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-lg border border-border bg-surface-elevated p-1 shadow-lg data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
        >
          <SelectViewport class="flex flex-col gap-0.5">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="toItemValue(option.value)"
              class="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-text transition-brand outline-none select-none data-[highlighted]:bg-surface-muted data-[state=checked]:bg-primary/[0.06] data-[state=checked]:font-medium data-[state=checked]:text-primary"
            >
              <SelectItemText class="min-w-0">{{ option.label }}</SelectItemText>
              <SelectItemIndicator class="shrink-0 text-primary">
                <Icon name="lucide:check" class="h-4 w-4" />
              </SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>

    <p v-if="hint" :id="`${selectId}-hint`" class="text-xs leading-relaxed text-text-muted">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${selectId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
