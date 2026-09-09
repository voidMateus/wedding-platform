<!--
  Grupo de escolha única — em cartões empilhados ou em pílulas numa fileira.

  Headless via `RadioGroupRoot`/`Item`/`Indicator` do Reka, e NÃO um
  `<input type="radio">` em `sr-only`: o input escondido tira o foco de vista
  e faz o navegador rolar o documento até um elemento de 1px — salto real e
  medido no ToggleRow, mesma causa. Aqui o item é um `<button role="radio">`
  visível, e o primitive ainda entrega a navegação por setas (roving focus)
  que um grupo de inputs só tem quando compartilham `name`.

  A opção ativa ganha borda e fundo na cor primária. Antes só existia estado
  de hover: nada distinguia a escolhida das outras, e num grupo de duas
  opções lado a lado a tela ficava sem resposta ao clique. É esse estado que
  torna o componente uma alternativa honesta ao dropdown quando há poucas
  opções e cada uma precisa de uma linha de explicação (ex.: lista de
  convidados aberta vs. fechada em Configurações).
-->
<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'

interface RadioOption {
  value: string
  label: string
  /** Ignorada no layout 'inline' — pílula não tem espaço para uma linha de apoio. */
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
   *
   * 'inline' é a fileira de pílulas: rótulo curto, sem descrição e sem o
   * disco do radio, para o campo cujas opções são um vocabulário fechado que
   * cabe na largura (ex.: a categoria do convidado). Existe para substituir o
   * dropdown nesse caso — num conjunto de 4 ou 5 valores, o select esconde as
   * alternativas atrás de um clique e, no celular, abre a folha nativa do
   * sistema para escolher entre "Adulto" e "Criança". A pílula mostra tudo de
   * uma vez e responde num toque.
   */
  layout?: 'stack' | 'grid' | 'inline'
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

const labelId = useId()

const LAYOUT_CLASSES: Record<NonNullable<Props['layout']>, string> = {
  stack: 'flex flex-col gap-2',
  grid: 'grid gap-2 sm:grid-cols-2',
  inline: 'flex flex-wrap gap-2',
}

const ITEM_CLASSES: Record<NonNullable<Props['layout']>, string> = {
  stack: 'flex items-start gap-3 rounded-md border p-3 text-left text-sm',
  grid: 'flex items-start gap-3 rounded-md border p-3 text-left text-sm',
  // px/py generosos de propósito: no celular esta pílula é o controle de
  // categoria, e um alvo de ~32px (a altura do UiChip) erra o toque.
  inline: 'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm',
}

// A pílula selecionada usa o mesmo preenchimento do UiChip marcado — é o
// único tratamento de "pílula ativa" da plataforma, e dois desenhos
// diferentes para o mesmo estado ensinariam duas coisas.
const SELECTED_CLASSES: Record<NonNullable<Props['layout']>, string> = {
  stack: 'border-primary bg-primary/[0.04] text-text',
  grid: 'border-primary bg-primary/[0.04] text-text',
  inline: 'border-primary bg-primary font-medium text-primary-foreground',
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <span v-if="label" :id="labelId" class="text-sm font-medium text-text">{{ label }}</span>

    <RadioGroupRoot
      :model-value="modelValue"
      :disabled="disabled"
      :aria-labelledby="label ? labelId : undefined"
      :class="LAYOUT_CLASSES[layout]"
      @update:model-value="(value) => emit('update:modelValue', String(value))"
    >
      <RadioGroupItem
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :class="[
          ITEM_CLASSES[layout],
          'transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          modelValue === option.value ? SELECTED_CLASSES[layout] : 'border-border text-text',
          disabled
            ? 'opacity-50'
            : 'cursor-pointer hover:border-primary/40 hover:bg-surface-muted/50',
        ]"
      >
        <span
          v-if="layout !== 'inline'"
          class="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-brand"
          :class="modelValue === option.value ? 'border-primary bg-primary' : 'border-border'"
          aria-hidden="true"
        >
          <RadioGroupIndicator class="block h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        </span>

        <Icon
          v-if="option.icon && layout === 'inline'"
          :name="option.icon"
          class="h-4 w-4 shrink-0"
          aria-hidden="true"
        />
        <span v-if="layout === 'inline'">{{ option.label }}</span>

        <span v-else class="flex min-w-0 flex-col gap-0.5">
          <span class="flex items-center gap-1.5 font-medium">
            <Icon
              v-if="option.icon"
              :name="option.icon"
              class="h-4 w-4 shrink-0"
              :class="modelValue === option.value ? 'text-primary' : 'text-text-muted'"
              aria-hidden="true"
            />
            {{ option.label }}
          </span>
          <span v-if="option.description" class="text-xs leading-relaxed text-text-muted">
            {{ option.description }}
          </span>
        </span>
      </RadioGroupItem>
    </RadioGroupRoot>

    <p v-if="hint" class="text-xs leading-relaxed text-text-muted">{{ hint }}</p>
    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>
  </div>
</template>
