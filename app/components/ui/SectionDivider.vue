<script setup lang="ts">
// Filete sob o título de seção. Desde a rodada 3 da Fase Rebrand do Convite é
// um traço simples, e não mais o losango entre pontos: o protótipo do convite
// não tem ornamento composto em lugar nenhum — a página respira por espaço em
// branco e por um único traço curto, e o losango repetido dez vezes ao descer
// a home virava um enfeite insistente.
//
// Tingido por --color-ornament (que, sem ornamento escolhido, ainda herda a
// secundária): é a peça mais "filete de convite" do site, e é justamente isso
// que a cor de ornamento existe para pintar.
</script>

<template>
  <span class="block h-px w-14 bg-ornament/80" role="presentation" aria-hidden="true" />
</template>
