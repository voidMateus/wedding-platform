<!--
  Bloco do modal de detalhe do convite (Convite / Convidados / Link de acesso /
  Linha do Tempo). Não é um `UiCard`: dentro de um modal, quatro cartões
  empilhados viram caixa dentro de caixa — aqui o separador é só o divisor de
  1px, mesma leitura de "livro de registro" das tabelas do painel.
-->
<script setup lang="ts">
interface Props {
  title: string
  /** Contagem/resumo curto ao lado do título, mesma linguagem de `AdminSection`. */
  meta?: string
}

defineProps<Props>()
</script>

<template>
  <section class="flex flex-col gap-3 border-t border-border pt-5 first:border-t-0 first:pt-0">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <div class="flex flex-wrap items-baseline gap-2">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-text-muted">{{ title }}</h3>
        <span v-if="meta" class="text-xs text-text-muted">{{ meta }}</span>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </section>
</template>
