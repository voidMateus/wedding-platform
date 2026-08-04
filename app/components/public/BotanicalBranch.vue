<script setup lang="ts">
// Ramo folhado em traço fino (estilo oliveira/eucalipto) para cantos do Hero
// e da seção de boas-vindas — folhas alternadas ao longo de um caule curvo,
// preenchimento quase transparente. Puramente decorativo (aria-hidden),
// exibição condicionada a theme_config.showHeroBotanicals.
</script>

<template>
  <svg viewBox="0 0 220 220" fill="none" aria-hidden="true">
    <path d="M14 208 C 62 168 128 104 202 26" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
    <g stroke="currentColor" stroke-width="1" fill="currentColor" fill-opacity="0.12" stroke-linejoin="round">
      <path d="M34 192 q-20 -6 -28 -24 q22 -2 28 24 Z" />
      <path d="M56 174 q-4 -22 8 -38 q10 20 -8 38 Z" />
      <path d="M84 148 q-22 -4 -32 -20 q22 -4 32 20 Z" />
      <path d="M106 128 q-2 -22 12 -36 q8 20 -12 36 Z" />
      <path d="M132 104 q-22 -2 -34 -16 q22 -6 34 16 Z" />
      <path d="M152 84 q0 -22 14 -34 q6 20 -14 34 Z" />
      <path d="M176 60 q-20 0 -32 -12 q20 -8 32 12 Z" />
      <path d="M192 42 q2 -20 16 -30 q4 18 -16 30 Z" />
    </g>
  </svg>
</template>
