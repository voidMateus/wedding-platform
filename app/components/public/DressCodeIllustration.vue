<script setup lang="ts">
// Ilustração em line-art (traço fino, sem preenchimento) pra seção Dress
// Code não ficar só texto — pedido do usuário ("Fase Linguagem Visual").
// Puramente decorativa (aria-hidden), na mesma linguagem visual do
// SectionDivider (traço fino tingido na cor primária/secundária do tema).
</script>

<template>
  <svg
    viewBox="0 0 220 140"
    class="h-28 w-auto sm:h-32"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- vestido -->
    <g class="text-primary">
      <path d="M50 16 q5 -8 10 0" />
      <line x1="60" y1="16" x2="60" y2="24" />
      <line x1="30" y1="24" x2="90" y2="24" />
      <line x1="45" y1="24" x2="38" y2="40" />
      <line x1="75" y1="24" x2="82" y2="40" />
      <path d="M38 40 q22 10 44 0 l14 78 q-36 14 -72 0 z" />
      <path d="M52 40 q8 6 16 0" />
    </g>
    <!-- terno -->
    <g class="text-secondary">
      <path d="M150 16 q5 -8 10 0" />
      <line x1="160" y1="16" x2="160" y2="24" />
      <line x1="130" y1="24" x2="190" y2="24" />
      <path d="M138 24 L144 120 L176 120 L182 24" />
      <path d="M138 24 l14 20 l8 -14" />
      <path d="M182 24 l-14 20 l-8 -14" />
      <line x1="160" y1="44" x2="160" y2="110" />
    </g>
  </svg>
</template>
