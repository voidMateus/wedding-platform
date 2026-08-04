<script setup lang="ts">
// Textura sutil — grão discreto de pontos, para dar profundidade tátil a um
// fundo sem introduzir cor nova (CLAUDE.md, Fase Premium Experience,
// sistema de ornamentos). Usa currentColor: herda a cor de texto do
// elemento ancestral mais próximo que a definir. Sempre absolutamente
// posicionada preenchendo o pai — quem usa precisa garantir que o pai tem
// `position: relative` (ou equivalente) e, de preferência, `overflow-hidden`.
</script>

<template>
  <div
    aria-hidden="true"
    role="presentation"
    class="pointer-events-none absolute inset-0 opacity-[0.04]"
    style="background-image: radial-gradient(currentColor 1px, transparent 1px); background-size: 16px 16px"
  />
</template>
