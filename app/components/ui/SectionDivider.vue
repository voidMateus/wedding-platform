<script setup lang="ts">
// Filete + losango entre título e conteúdo de seção. Desde a Fase Rebrand do
// Convite ele é tingido por --color-ornament, não pela cor primária: é a peça
// mais "filete de convite" do site, e é justamente o que a cor de ornamento
// existe para pintar. Sem ornamento escolhido, --color-ornament ainda herda a
// secundária (main.css), então o divisor muda de tom em relação à versão
// anterior — de propósito, e no site inteiro de uma vez, que é o que faz a
// paleta parecer uma só.
</script>

<template>
  <div class="flex items-center justify-center gap-2 py-2" role="presentation" aria-hidden="true">
    <span class="h-px w-10 bg-ornament/40 sm:w-16" />
    <span class="h-1 w-1 rounded-full bg-ornament/60" />
    <span class="h-2.5 w-2.5 rotate-45 border border-ornament" />
    <span class="h-1 w-1 rounded-full bg-ornament/60" />
    <span class="h-px w-10 bg-ornament/40 sm:w-16" />
  </div>
</template>
