<script setup lang="ts">
// Pequeno ramo de louro horizontal (folhas apontando pra fora do centro) —
// ornamento entre o eyebrow e o nome do casal no Hero e no topo da seção de
// boas-vindas. Puramente decorativo (aria-hidden), traço/preenchimento em
// currentColor — herda a cor de acento do contexto (secundária do tema).
</script>

<template>
  <svg viewBox="0 0 96 22" class="h-4 w-20" fill="none" aria-hidden="true">
    <g stroke="currentColor" stroke-width="1" stroke-linecap="round">
      <path d="M48 17 C 38 17 26 14 15 8" />
      <path d="M48 17 C 58 17 70 14 81 8" />
    </g>
    <g fill="currentColor" fill-opacity="0.55">
      <path d="M22 11.5 q-5.5 -4.5 -5 -9.5 q6 2.5 5 9.5 Z" />
      <path d="M31 14 q-5.5 -4.5 -5 -9.5 q6 2.5 5 9.5 Z" />
      <path d="M40 15.7 q-5.5 -4.5 -5 -9.5 q6 2.5 5 9.5 Z" />
      <path d="M74 11.5 q5.5 -4.5 5 -9.5 q-6 2.5 -5 9.5 Z" />
      <path d="M65 14 q5.5 -4.5 5 -9.5 q-6 2.5 -5 9.5 Z" />
      <path d="M56 15.7 q5.5 -4.5 5 -9.5 q-6 2.5 -5 9.5 Z" />
      <circle cx="48" cy="17" r="1.4" />
    </g>
  </svg>
</template>
