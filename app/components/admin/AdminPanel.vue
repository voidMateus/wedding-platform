<!--
  Painel do admin na direção "livro de registro": borda de 1px, sem sombra —
  o peso visual da tela fica reservado a um único bloco (o hero do
  dashboard), e não distribuído entre vários cartões elevados.

  Não é UiCard: UiCard é o cartão "premium" (radius/shadow xl, padding
  próprio) usado pelo site público e pelos blocos de destaque. Aqui o
  conteúdo precisa encostar na borda (tabela densa sangrando até a régua) e
  o cabeçalho é uma faixa separada por divisor — duas coisas que UiCard não
  faz sem virar exceção.
-->
<script setup lang="ts">
interface Props {
  title?: string
  /** Contagem curta ao lado do título ("18 exibidos"). */
  meta?: string
}

defineProps<Props>()
</script>

<template>
  <section class="overflow-hidden rounded-lg border border-border bg-surface-elevated">
    <div
      v-if="title || $slots.headerActions"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5"
    >
      <div class="flex flex-wrap items-baseline gap-3">
        <h2 v-if="title" class="font-display text-lg font-semibold text-text">{{ title }}</h2>
        <span v-if="meta" class="text-xs text-text-muted">{{ meta }}</span>
      </div>
      <div v-if="$slots.headerActions" class="flex flex-wrap items-center gap-2">
        <slot name="headerActions" />
      </div>
    </div>
    <slot />
  </section>
</template>
