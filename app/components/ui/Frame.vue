<script setup lang="ts">
// Moldura — par de filetes concêntricos ao redor do slot (CLAUDE.md, Fase
// Premium Experience, sistema de ornamentos): a borda externa flutua fora
// do conteúdo (efeito de moldura dupla, linguagem de papelaria fina), a
// interna encosta nele. Puramente decorativo (aria-hidden) — não adiciona
// padding ao slot, quem usa decide o respiro ao redor para a borda externa
// não ficar cortada por um elemento vizinho.
</script>

<template>
  <div class="relative">
    <div aria-hidden="true" role="presentation" class="pointer-events-none absolute -inset-2 border border-secondary/30" />
    <div aria-hidden="true" role="presentation" class="pointer-events-none absolute inset-0 border border-border" />
    <slot />
  </div>
</template>
