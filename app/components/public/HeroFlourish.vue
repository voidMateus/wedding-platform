<script setup lang="ts">
// Pequeno ornamento em line-art entre o eyebrow e o nome do casal no Hero —
// "sensação de convite" pedida pelo usuário. Puramente decorativo
// (aria-hidden), mesma linguagem de traço fino já usada em
// SectionDivider/DressCodeIllustration.
</script>

<template>
  <svg viewBox="0 0 60 20" class="h-4 w-14" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
    <path d="M30 10 C24 4 14 4 6 10" />
    <path d="M30 10 C36 4 46 4 54 10" />
    <path d="M18 7.5 q2.5 -3 5 0" />
    <path d="M42 7.5 q-2.5 -3 -5 0" />
    <circle cx="30" cy="10" r="1.3" fill="currentColor" stroke="none" />
  </svg>
</template>
