<script setup lang="ts">
interface Props {
  title: string
  /**
   * Contagem/resumo curto ao lado do título ("42 pessoas · 30 confirmados") —
   * a linha de metadado da direção "livro de registro". Fica na mesma
   * baseline do título, nunca abaixo dele.
   */
  meta?: string
  /** Frase de apoio abaixo do título — telas que explicam o próprio conceito. */
  description?: string
  /**
   * Título só para leitor de tela — o dashboard abre direto no bloco de
   * contagem, sem heading desenhado (o item ativo da sidebar já diz onde
   * você está). A página continua tendo um <h1>, que é o que a navegação
   * por leitor de tela e os testes E2E procuram. Ignora meta/description/
   * actions: quem esconde o heading não tem o que pendurar nele.
   */
  titleHidden?: boolean
}

defineProps<Props>()
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 v-if="titleHidden" class="sr-only">{{ title }}</h1>
    <div v-else class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-baseline gap-3">
          <h1 class="font-display text-2xl font-semibold text-text">{{ title }}</h1>
          <span v-if="meta" class="text-xs text-text-muted">{{ meta }}</span>
        </div>
        <p v-if="description" class="mt-1 text-sm text-text-muted">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
        <slot name="actions" />
      </div>
    </div>
    <slot />
  </div>
</template>
