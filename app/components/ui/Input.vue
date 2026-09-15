<script setup lang="ts">
interface Props {
  modelValue?: string
  label?: string
  placeholder?: string
  type?:
    'text' | 'email' | 'tel' | 'password' | 'number' | 'date' | 'time' | 'datetime-local' | 'color'
  /** Só relevante para type="number" (ex.: "any" para permitir decimais). */
  step?: string | number
  error?: string
  /**
   * Linha de apoio abaixo do campo (o "porquê" da regra de negócio, não o
   * formato esperado — isso é `placeholder`). Fica em `aria-describedby`
   * junto com o erro, então o leitor de tela lê a orientação antes de o
   * usuário digitar, e não só depois de errar.
   */
  hint?: string
  disabled?: boolean
  /**
   * Nome acessível quando o campo não tem `label` desenhado — o rótulo
   * visível pertence a um grupo maior (ex.: o par swatch + hexadecimal de um
   * seletor de cor, onde o texto "Cor primária" nomeia os dois controles).
   */
  ariaLabel?: string
  /** Ícone lucide à esquerda dentro do campo — usado por campos de busca. */
  icon?: string
  /**
   * Valor do atributo `autocomplete` do HTML (`'email'`, `'current-password'`).
   *
   * Prop, e não atributo repassado: o elemento raiz deste componente é a `div`
   * que embrulha rótulo, campo e erro, então um `autocomplete` escrito na tag
   * `<UiInput>` pousaria na `div` e o navegador nunca o veria. Sem ele, o
   * gerenciador de senhas não reconhece o formulário de login — e o campo de
   * senha vira digitação manual toda vez.
   */
  autocomplete?: string
  /** 'muted' assenta o campo sobre a superfície de faixa/chip, para o campo não competir com o conteúdo (busca do header do admin). */
  tone?: 'default' | 'muted'
  /**
   * 'campo' (default) é o campo de formulário com moldura. 'quiet' tira a
   * borda e o fundo até o hover/foco — mesmo contrato do `UiSelect`, e pelo
   * mesmo motivo: numa tabela onde a célula é editável linha a linha, a
   * moldura repetida vira o elemento mais pesado da tela e compete com o
   * conteúdo (os nomes das pessoas). Continua o mesmo controle, com o mesmo
   * alvo de clique; só para de se anunciar quando não está em uso.
   *
   * Como a do `UiSelect`, a variante existe só para tabela de desktop — no
   * celular a linha vira o slot `#stacked`, que não desenha campo nenhum —,
   * então a altura de 32px não tira alvo de toque de ninguém.
   */
  variant?: 'campo' | 'quiet' | 'quiet-desktop'
  /**
   * Autocompletar a partir do que JÁ existe, sem fechar a lista de valores.
   *
   * É um `<datalist>` nativo de propósito: o campo continua sendo texto livre —
   * quem digita um nome novo não é corrigido nem barrado —, e o que a lista faz
   * é só poupar a redigitação de "Cerimonial Ana" na décima tarefa. Um seletor
   * de opções fixas resolveria o mesmo atrito e custaria a liberdade do campo,
   * que em vários lugares é a regra de negócio (o responsável de uma tarefa é
   * quase sempre alguém sem login).
   */
  suggestions?: readonly string[]
  /**
   * Põe o cursor no campo assim que ele monta — para o campo que É o motivo de
   * a área ter aberto (a busca do rascunho de acompanhante, que abre já
   * esperando um nome).
   *
   * Foco no `onMounted`, e não o atributo `autofocus` do HTML: o atributo só
   * vale para elemento presente no documento no carregamento da página, e
   * aqui o campo aparece depois, num bloco que o Vue insere.
   */
  autofocus?: boolean
}

const {
  modelValue = '',
  label,
  placeholder,
  type = 'text',
  step,
  error,
  hint,
  ariaLabel,
  disabled = false,
  icon,
  autocomplete,
  tone = 'default',
  variant = 'campo',
  suggestions,
  autofocus = false,
} = defineProps<Props>()

const campo = ref<HTMLInputElement | null>(null)
onMounted(() => {
  if (autofocus) campo.value?.focus()
})

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'bg-surface',
  muted: 'bg-surface-muted/70',
}

const variantClasses: Record<NonNullable<Props['variant']>, string> = {
  campo: 'h-10 border-border px-3',
  // `bg-transparent` depois do tom, para vencer o `bg-surface` do default: a
  // variante quiet não tem fundo próprio até encostarem nela.
  //
  // `w-full min-w-0` não é enfeite: um `<input>` sem `size` tem largura
  // intrínseca de ~20 caracteres, e numa `<table>` de layout automático é ela
  // que define a largura da coluna. Sem isto, duas colunas de campo empurravam
  // a tabela 130px além da área visível e jogavam a coluna de ações para fora
  // da vista — a largura do campo tem que vir da coluna, não o contrário.
  quiet:
    'h-8 w-full min-w-0 border-transparent bg-transparent px-2 hover:border-border hover:bg-surface focus:border-border focus:bg-surface',
  // A mesma sobriedade da `quiet`, mas SÓ onde a linha é uma linha.
  //
  // `quiet` pura vale para tabela de desktop, que no celular vira o slot
  // `#stacked` e não desenha campo nenhum. A linha do Planejamento não é
  // tabela: ela empilha em `sm`, e ali os campos voltam a ser os únicos
  // controles da tela — sem moldura e com 32px, um deles seria um campo que
  // não se anuncia num alvo de toque menor. Abaixo de `sm` isto é `campo`,
  // caractere por caractere; de `sm` para cima, `quiet`.
  'quiet-desktop':
    'h-10 w-full min-w-0 border-border px-3 sm:h-8 sm:border-transparent sm:bg-transparent sm:px-2 sm:hover:border-border sm:hover:bg-surface sm:focus:border-border sm:focus:bg-surface',
}

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const inputId = useId()

const describedBy = computed(() => {
  const ids = [hint ? `${inputId}-hint` : '', error ? `${inputId}-error` : ''].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})
</script>

<template>
  <div class="flex flex-col gap-1">
    <label v-if="label" :for="inputId" class="text-sm font-medium text-text">
      {{ label }}
    </label>
    <div class="relative flex flex-col">
      <Icon
        v-if="icon"
        :name="icon"
        class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
        aria-hidden="true"
      />
      <input
        :id="inputId"
        ref="campo"
        :type="type"
        :step="step"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :disabled="disabled"
        :value="modelValue"
        :aria-label="ariaLabel"
        :aria-invalid="Boolean(error)"
        :aria-describedby="describedBy"
        :list="suggestions?.length ? `${inputId}-suggestions` : undefined"
        class="rounded-md border text-sm text-text placeholder:text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        :class="[toneClasses[tone], variantClasses[variant], icon && 'pl-9']"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <datalist v-if="suggestions?.length" :id="`${inputId}-suggestions`">
        <option v-for="sugestao in suggestions" :key="sugestao" :value="sugestao" />
      </datalist>
    </div>
    <p v-if="hint" :id="`${inputId}-hint`" class="text-xs leading-relaxed text-text-muted">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${inputId}-error`" class="text-sm text-danger" role="alert">
      {{ error }}
    </p>
  </div>
</template>
