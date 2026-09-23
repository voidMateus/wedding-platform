<!--
  O bloco de ajuda da tela — três perguntas, sempre as mesmas.

  Fica no topo do conteúdo, acima dos filtros, e é dispensável. Não é tour
  guiado (interrompe, e é clicado fora antes de ser lido) nem modal (precisa
  ser fechado antes de qualquer coisa): quem já sabe o que a tela faz fecha
  uma vez e não vê mais; quem esqueceu reabre pelo ponto de interrogação do
  cabeçalho (rodada de usabilidade de 20/09/2026, ponto 8).

  O texto vem de `shared/ajuda-de-tela.ts` e este componente não conhece tela
  nenhuma — é o que impede as trinta telas de divergirem de formato.

  `no-print` porque ajuda impressa é ruído puro, como o botão de imprimir.
-->
<script setup lang="ts">
const { ajuda, visivel, dispensar } = useAjudaDeTela()
</script>

<template>
  <section
    v-if="visivel && ajuda"
    class="no-print mb-4 rounded-lg border border-border bg-surface-muted/60 p-4 sm:p-5"
    aria-labelledby="ajuda-da-tela"
  >
    <div class="flex items-start justify-between gap-4">
      <p id="ajuda-da-tela" class="text-sm leading-relaxed font-medium text-text">
        {{ ajuda.responde }}
      </p>
      <button
        type="button"
        class="-m-1 shrink-0 rounded-md p-1 text-text-muted transition-brand hover:bg-surface hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label="Dispensar esta explicação"
        title="Dispensar esta explicação"
        @click="dispensar"
      >
        <Icon name="lucide:x" class="h-4 w-4" />
      </button>
    </div>

    <ul class="mt-3 flex flex-col gap-1.5">
      <li
        v-for="acao in ajuda.acoes"
        :key="acao"
        class="flex items-start gap-2 text-sm leading-relaxed text-text-muted"
      >
        <Icon name="lucide:check" class="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {{ acao }}
      </li>
    </ul>

    <p class="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-text-muted">
      {{ ajuda.comece }}
    </p>
  </section>
</template>
