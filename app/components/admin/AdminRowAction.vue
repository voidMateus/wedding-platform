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
  tone?: 'default' | 'danger'
  /** Quando definido, renderiza como link (ex.: abrir a tela de edição). */
  to?: string
}

const { icon, label, tone = 'default', to } = defineProps<Props>()

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

const classes = [
  'inline-flex items-center justify-center rounded-md p-1.5 transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
  toneClasses[tone],
]
</script>

<template>
  <NuxtLink v-if="to" :to="to" :class="classes" :title="label">
    <Icon :name="icon" class="h-4 w-4" />
    <span class="sr-only">{{ label }}</span>
  </NuxtLink>
  <button v-else type="button" :class="classes" :title="label" @click="emit('click')">
    <Icon :name="icon" class="h-4 w-4" />
    <span class="sr-only">{{ label }}</span>
  </button>
</template>
