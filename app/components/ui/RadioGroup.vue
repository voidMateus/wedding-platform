<!--
  Grupo de escolha única em cartões. O `<input type="radio">` continua sendo
  o controle real (grupo nativo já dá navegação por setas e semântica de
  `radiogroup` sem JS), mas quem desenha o estado é o cartão em volta.

  Antes só existia estado de hover: nada distinguia visualmente a opção
  escolhida das outras, e num grupo de duas opções lado a lado isso deixava
  a tela sem resposta ao clique. Agora a opção ativa ganha borda e fundo na
  cor primária — é o que torna este componente uma alternativa honesta ao
  dropdown quando há poucas opções e cada uma precisa de uma linha de
  explicação (ex.: lista de convidados aberta vs. fechada em Configurações).
-->
<script setup lang="ts">
interface RadioOption {
  value: string
  label: string
  description?: string
  /** Ícone lucide opcional à esquerda — reforça a diferença entre as opções. */
  icon?: string
}

interface Props {
  modelValue?: string
  label?: string
  options: RadioOption[]
  error?: string
  /** Linha de apoio abaixo do grupo — mesmo contrato do UiInput. */
  hint?: string
  disabled?: boolean
  /**
   * 'stack' (default) empilha as opções — a leitura certa quando as
   * descrições são longas. 'grid' põe duas por linha a partir de `sm`, para
   * grupos curtos de 2 a 4 opções que caibam lado a lado.
   */
  layout?: 'stack' | 'grid'
}

const {
  modelValue = '',
  label,
  options,
  error,
  hint,
  disabled = false,
  layout = 'stack',
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const groupName = useId()

const LAYOUT_CLASSES: Record<NonNullable<Props['layout']>, string> = {
  stack: 'flex flex-col gap-2',
  grid: 'grid gap-2 sm:grid-cols-2',
}
</script>

<template>
  <fieldset class="flex flex-col gap-2">
    <legend v-if="label" class="mb-1 text-sm font-medium text-text">{{ label }}</legend>

    <div :class="LAYOUT_CLASSES[layout]">
      <label
        v-for="option in options"
        :key="option.value"
        class="flex items-start gap-3 rounded-md border p-3 text-sm transition-brand"
        :class="[
          modelValue === option.value
            ? 'border-primary bg-primary/[0.04] text-text'
            : 'border-border text-text',
          disabled
            ? 'opacity-50'
            : 'cursor-pointer hover:border-primary/40 hover:bg-surface-muted/50',
        ]"
      >
        <input
          type="radio"
          :name="groupName"
          :value="option.value"
          :checked="modelValue === option.value"
          :disabled="disabled"
          class="sr-only peer"
          @change="emit('update:modelValue', option.value)"
        />

        <span
          class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
          :class="modelValue === option.value ? 'border-primary bg-primary' : 'border-border'"
          aria-hidden="true"
        >
          <span
            v-if="modelValue === option.value"
            class="h-1.5 w-1.5 rounded-full bg-primary-foreground"
          />
        </span>

        <span class="flex min-w-0 flex-col gap-0.5">
          <span class="flex items-center gap-1.5 font-medium">
            <Icon
              v-if="option.icon"
              :name="option.icon"
              class="h-4 w-4 shrink-0"
              :class="modelValue === option.value ? 'text-primary' : 'text-text-muted'"
            />
            {{ option.label }}
          </span>
          <span v-if="option.description" class="text-xs leading-relaxed text-text-muted">
            {{ option.description }}
          </span>
        </span>
      </label>
    </div>

    <p v-if="hint" class="text-xs leading-relaxed text-text-muted">{{ hint }}</p>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
  </fieldset>
</template>
