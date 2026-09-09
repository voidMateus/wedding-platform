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
  /**
   * 'campo' (default) é o campo de formulário com moldura. 'quiet' tira a
   * borda e o fundo até o hover/foco, para o seletor que se repete linha a
   * linha numa tabela: com moldura, vinte e nove caixas vazias viravam o
   * elemento mais pesado da tela e competiam com os nomes das pessoas — que
   * são o conteúdo. Continua sendo o mesmo controle, com o mesmo alvo de
   * clique; só para de se anunciar quando não está em uso.
   */
  variant?: 'campo' | 'quiet'
  /** Linha de apoio abaixo do campo — mesmo contrato do UiInput. */
  hint?: string
  disabled?: boolean
  /**
   * Nome acessível quando o campo não tem `label` desenhado — mesmo contrato
   * do `UiInput`. É o caso de um seletor repetido linha a linha, onde o rótulo
   * visível é o texto ao lado (ex.: escolher o campo de cada coluna da
   * planilha no importador): um `<label>` por linha seria ruído visual, mas
   * sem nome nenhum o leitor de tela anuncia só "combobox".
   */
  ariaLabel?: string
}

const {
  modelValue = '',
  label,
  options,
  placeholder = 'Selecione uma opção',
  error,
  hint,
  disabled = false,
  ariaLabel,
  variant = 'campo',
} = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const VARIANT_CLASSES: Record<NonNullable<Props['variant']>, string> = {
  campo: 'h-10 justify-between border border-border bg-surface hover:border-primary/40',
  // Borda transparente (e não ausente): sem ela o campo mudaria de largura
  // no hover e a coluna inteira daria um pulo de 2px.
  // `justify-start`, não `justify-between`: sem moldura o `between` empurrava o
  // chevron para a outra ponta da largura da coluna, e valor e seta ficavam
  // dois elementos soltos a noventa pixels um do outro. A largura da célula
  // continua fixa (a coluna não pode pular), só o conteúdo se agrupa.
  // `h-8`: dentro de uma linha de tabela o campo de 40px era o elemento mais
  // alto da linha e ditava a altura dela sozinho. A variante existe só para
  // tabela de desktop (no celular a linha vira o slot `#stacked`, que não
  // desenha este seletor), então não há alvo de toque em jogo aqui.
  quiet:
    'h-8 justify-start gap-1.5 border border-transparent bg-transparent hover:border-border hover:bg-surface data-[state=open]:border-border data-[state=open]:bg-surface',
}

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
        class="flex w-full items-center gap-2 rounded-md px-3 text-left text-sm text-text transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-text-muted"
        :class="VARIANT_CLASSES[variant]"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        :aria-label="label ? undefined : ariaLabel"
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
