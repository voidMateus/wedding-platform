<script setup lang="ts">
// Galho decorativo em traço fino (CLAUDE.md, Fase Premium Experience —
// referência visual trazida pelo usuário: ilustração botânica sangrando
// pelas bordas do Hero). Versão simplificada e abstrata, não uma flor
// específica reconhecível — um nod à mesma ideia, em `currentColor`, para
// herdar a cor de quem usa (ex.: `text-secondary`). Puramente decorativo.
interface Props {
  /** Espelha o traço horizontalmente — útil para usar o mesmo desenho em cantos opostos. */
  flip?: boolean
}

const { flip = false } = defineProps<Props>()
</script>

<template>
  <svg
    viewBox="0 0 160 160"
    fill="none"
    role="presentation"
    aria-hidden="true"
    class="pointer-events-none"
    :class="flip ? '-scale-x-100' : ''"
  >
    <path
      d="M18 152 C 44 126, 32 96, 48 68 C 60 46, 52 24, 72 10"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
    <path d="M48 68 C 62 64, 74 72, 80 58" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M34 108 C 20 106, 12 116, 8 104" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <path d="M26 132 C 14 134, 6 128, 2 138" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    <ellipse cx="80" cy="56" rx="8" ry="3.4" transform="rotate(-35 80 56)" fill="currentColor" opacity="0.6" />
    <ellipse cx="8" cy="102" rx="7" ry="3" transform="rotate(20 8 102)" fill="currentColor" opacity="0.6" />
    <ellipse cx="58" cy="34" rx="7" ry="3" transform="rotate(-55 58 34)" fill="currentColor" opacity="0.5" />
    <ellipse cx="4" cy="136" rx="6" ry="2.6" transform="rotate(35 4 136)" fill="currentColor" opacity="0.55" />
    <circle cx="72" cy="10" r="2.8" fill="currentColor" opacity="0.65" />
  </svg>
</template>
