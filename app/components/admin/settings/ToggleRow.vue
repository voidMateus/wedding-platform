<!--
  Linha de configuração booleana: rótulo + explicação à esquerda, chave à
  direita, com a linha inteira clicável. É a forma do modelo para "ligar/
  desligar um recurso" — diferente do UiCheckbox, que é para selecionar itens
  de uma lista (quais atalhos do Hero aparecem).

  Headless via `SwitchRoot` do Reka, e NÃO um `<input type="checkbox">` em
  `sr-only`. O input escondido causava um salto de página real e medido:
  clicar na linha movia o foco para um elemento de 1px posicionado em
  `absolute`, e o navegador rolava o documento até ele — 111px → 708px de
  `document.scrollTop` num único clique, sem o `<main>` (o scroller da tela)
  mexer um pixel. O `SwitchRoot` é um `<button role="switch">` visível e já no
  lugar, então o foco não leva a rolagem a nenhum canto, e `aria-checked`,
  Espaço e Enter vêm do primitive.

  O SwitchRoot é a própria linha (e não só a chavinha) para que clicar no
  texto também alterne — com um `<label for>` isso não funcionaria, porque o
  primitive renderiza um `<button>`, que `<label>` não rotula.
-->
<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

interface Props {
  modelValue?: boolean
  label: string
  hint?: string
  /** Ícone lucide antes do rótulo — reforça a identidade de cada linha em listas longas. */
  icon?: string
  disabled?: boolean
}

const { modelValue = false, label, hint, icon, disabled = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <SwitchRoot
    :model-value="modelValue"
    :disabled="disabled"
    class="flex w-full items-start justify-between gap-4 rounded-md border border-border px-4 py-3 text-left transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="disabled ? 'opacity-50' : 'cursor-pointer hover:bg-surface-muted/40'"
    @update:model-value="(value) => emit('update:modelValue', Boolean(value))"
  >
    <span class="min-w-0">
      <span class="flex items-center gap-2 text-sm font-medium text-text">
        <Icon
          v-if="icon"
          :name="icon"
          class="h-4 w-4 shrink-0"
          :class="modelValue ? 'text-primary' : 'text-text-muted'"
          aria-hidden="true"
        />
        <span class="min-w-0 truncate">{{ label }}</span>
      </span>
      <span v-if="hint" class="mt-0.5 block text-xs leading-relaxed text-text-muted">
        {{ hint }}
      </span>
    </span>

    <span
      class="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-brand"
      :class="modelValue ? 'bg-primary' : 'bg-border'"
      aria-hidden="true"
    >
      <SwitchThumb
        class="block h-4 w-4 rounded-full bg-surface-elevated transition-brand"
        :class="modelValue && 'translate-x-4'"
      />
    </span>
  </SwitchRoot>
</template>
