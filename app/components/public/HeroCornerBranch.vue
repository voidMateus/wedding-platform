<script setup lang="ts">
// Ramo decorativo em line-art para os cantos do Hero (referência visual real
// do usuário) — puramente decorativo (aria-hidden), traço na cor secundária
// do tema (mesmo token usado no resto dos ornamentos do Hero).
</script>

<template>
  <svg viewBox="0 0 120 160" class="h-28 w-24 sm:h-40 sm:w-32" fill="none" stroke="currentColor" stroke-width="1.25" aria-hidden="true">
    <path d="M8 8 C 28 38, 40 68, 56 112" stroke-linecap="round" />
    <path d="M18 24 q11 -7 18 2" stroke-linecap="round" />
    <path d="M27 44 q12 -6 19 3" stroke-linecap="round" />
    <path d="M35 64 q12 -5 20 4" stroke-linecap="round" />
    <path d="M43 84 q12 -4 20 5" stroke-linecap="round" />
    <path d="M49 100 q11 -3 18 6" stroke-linecap="round" />
  </svg>
</template>
