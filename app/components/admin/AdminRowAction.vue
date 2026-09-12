<!--
  Ação de linha de tabela: ícone discreto, sempre visível, com rótulo só para
  leitor de tela e como title.

  Por que não UiButton: numa tabela densa, dois ou três botões com fundo por
  linha viram o elemento mais pesado da tela — e o `destructive` vermelho
  saturado rouba a hierarquia do próprio nome do registro. O compromisso com
  a segurança fica no modal de confirmação, que é onde a decisão acontece;
  aqui o vermelho só aparece no hover.

  Sempre visível, não só no hover (que era o desenho original): controle que
  aparece no hover não existe em toque e não é descobrível por teclado.
-->
<script setup lang="ts">
interface Props {
  icon: string
  /** Rótulo acessível — some da tela, fica no title e para leitor de tela. */
  label: string
  /**
   * Número ao lado do ícone (ex.: quantas propostas estão anexadas). Só
   * aparece acima de zero: "0" desenhado não informa nada que a ausência já
   * não diga, e engorda uma fileira que se repete linha a linha.
   */
  count?: number | null
  tone?: 'default' | 'danger'
  /** Quando definido, renderiza como link (ex.: abrir a tela de edição). */
  to?: string
  /**
   * Desabilitado em vez de escondido: numa fileira de ações repetidas (as
   * setas que reordenam um acompanhante), sumir na ponta faz as outras
   * deslizarem para debaixo do cursor entre um clique e o seguinte.
   * Ignorado quando `to` está definido — link não tem estado desabilitado.
   */
  disabled?: boolean
}

const { icon, label, count = null, tone = 'default', to, disabled = false } = defineProps<Props>()

// `click` declarado como emit de propósito: sem isso o @click do pai chegaria
// aqui como listener nativo no <button> E pelo $emit — o handler rodaria duas
// vezes (o modal abriria e fecharia no mesmo clique).
const emit = defineEmits<{
  click: []
}>()

const toneClasses: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-text-muted hover:bg-surface-muted hover:text-text',
  danger: 'text-text-muted hover:bg-surface-muted hover:text-danger',
}

const temContagem = computed(() => typeof count === 'number' && count > 0)

// `relative` não é decoração: o rótulo abaixo é um `sr-only`, que o Tailwind
// implementa com `position: absolute`. Sem um ancestral posicionado, o bloco
// contêiner dele passa a ser o bloco contêiner inicial — ou seja, o span
// escapa de QUALQUER `overflow` no caminho e se assenta na posição estática
// dele dentro do documento.
//
// Numa tabela longa isso rolava a tela inteira: a grade tem altura limitada
// (`.table-scroll`, max-height 60vh), mas os rótulos das ações vazavam dela e
// o último, na linha 196, ficava a 5646px do topo — exatamente a altura de
// rolagem que o documento passava a ter, com a página rolando para um vazio
// enorme abaixo do painel. Medido no navegador; o `overflow: hidden` do body
// não segura porque `main.css` põe `overflow-x: hidden` no `html`, e daí é o
// `html` que rola, não o body.
//
// Com `relative`, o span resolve contra o próprio botão: 1px dentro da linha,
// e a grade volta a cortá-lo como corta o resto.
const classes = computed(() => [
  'relative inline-flex items-center justify-center gap-1 rounded-md p-1.5 transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  disabled ? 'cursor-not-allowed text-text-muted opacity-40' : toneClasses[tone],
])
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :title="label">
    <Icon :name="icon" class="h-4 w-4" />
    <span v-if="temContagem" class="num text-xs font-medium">{{ count }}</span>
    <span class="sr-only">{{ label }}</span>
  </NuxtLink>
  <button
    v-else
    type="button"
    :class="classes"
    :title="label"
    :disabled="disabled"
    @click="emit('click')"
  >
    <Icon :name="icon" class="h-4 w-4" />
    <span v-if="temContagem" class="num text-xs font-medium">{{ count }}</span>
    <span class="sr-only">{{ label }}</span>
  </button>
</template>
