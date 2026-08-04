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
      d="M12 148 C 40 120, 30 90, 46 62 C 58 42, 50 20, 70 8"
      stroke="currentColor"
      stroke-width="1.25"
      stroke-linecap="round"
    />
    <path d="M46 62 C 60 58, 72 66, 78 52" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
    <path d="M34 96 C 20 94, 12 104, 8 92" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" />
    <ellipse cx="78" cy="50" rx="7" ry="3" transform="rotate(-35 78 50)" fill="currentColor" opacity="0.55" />
    <ellipse cx="8" cy="90" rx="6" ry="2.6" transform="rotate(20 8 90)" fill="currentColor" opacity="0.55" />
    <ellipse cx="58" cy="30" rx="6" ry="2.6" transform="rotate(-55 58 30)" fill="currentColor" opacity="0.4" />
    <circle cx="70" cy="8" r="2.5" fill="currentColor" opacity="0.6" />
  </svg>
</template>
