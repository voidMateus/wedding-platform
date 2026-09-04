<!--
  Linha de configuração booleana: rótulo + explicação à esquerda, chave à
  direita, tudo dentro de uma moldura clicável. É a forma do modelo para
  "ligar/desligar um recurso" — diferente do UiCheckbox, que é para
  selecionar itens de uma lista (quais atalhos do Hero aparecem).

  O controle real é um <input type="checkbox"> em sr-only, com a chave
  desenhada por `peer-*`: mantém semântica, teclado e associação de rótulo
  nativos, sem reimplementar role="switch" à mão.
-->
<script setup lang="ts">
interface Props {
  /** Opcional como no UiCheckbox: `defineField` do VeeValidate devolve `boolean | undefined` antes do primeiro resetForm. */
  modelValue?: boolean
  label: string
  hint?: string
  disabled?: boolean
}

const { modelValue = false, label, hint, disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label
    class="flex items-start justify-between gap-4 rounded-md border border-border px-4 py-3 transition-brand"
    :class="disabled ? 'opacity-50' : 'cursor-pointer hover:bg-surface-muted/40'"
  >
    <span class="min-w-0">
      <span class="block text-sm font-medium text-text">{{ label }}</span>
      <span v-if="hint" class="mt-0.5 block text-xs leading-relaxed text-text-muted">
        {{ hint }}
      </span>
    </span>

    <input
      type="checkbox"
      class="peer sr-only"
      :checked="modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span
      class="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-brand peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
      :class="modelValue ? 'bg-primary' : 'bg-border'"
      aria-hidden="true"
    >
      <span
        class="h-4 w-4 rounded-full bg-surface-elevated transition-brand"
        :class="modelValue && 'translate-x-4'"
      />
    </span>
  </label>
</template>
