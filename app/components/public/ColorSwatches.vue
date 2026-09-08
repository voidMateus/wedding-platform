<script setup lang="ts">
// "Paleta de Cores" em bolinhas, como a do Manual dos Padrinhos impresso
// (Fase Rebrand do Convite).
//
// O nome ao lado de cada bolinha não é legenda decorativa: é a informação em
// si para quem não distingue aquele tom — e a bolinha, sozinha, não tem como
// passar em contraste (o conteúdo dela É a cor). Por isso a cor entra por
// `style` e não por token do tema: aqui ela é dado do casal, não identidade
// visual da plataforma.
import type { PaletteSwatch } from '#shared/wedding-content'

interface Props {
  swatches: PaletteSwatch[]
}

defineProps<Props>()
</script>

<template>
  <ul class="flex flex-wrap items-start justify-center gap-x-6 gap-y-5">
    <li
      v-for="swatch in swatches"
      :key="`${swatch.name}-${swatch.hex}`"
      class="flex w-20 flex-col items-center gap-2"
    >
      <span
        class="h-12 w-12 rounded-full border border-ornament/40 shadow-sm"
        :style="{ backgroundColor: swatch.hex }"
        aria-hidden="true"
      />
      <span class="text-center text-xs leading-tight text-body">{{ swatch.name }}</span>
    </li>
  </ul>
</template>
