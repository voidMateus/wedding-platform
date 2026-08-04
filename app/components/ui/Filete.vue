<script setup lang="ts">
// Filete — traço fino de separação (CLAUDE.md, Fase Premium Experience,
// sistema de ornamentos). Diferente de UiSectionDivider (que sempre inclui
// a marca central em --color-secondary e serve para separar capítulos),
// este é só a linha, usada para separar elementos inline dentro de uma
// mesma seção (ex.: unidades da contagem regressiva, itens de uma lista
// horizontal).
interface Props {
  orientation?: 'horizontal' | 'vertical'
}

const { orientation = 'horizontal' } = defineProps<Props>()
</script>

<template>
  <span
    aria-hidden="true"
    role="presentation"
    class="block shrink-0 bg-border"
    :class="orientation === 'vertical' ? 'h-4 w-px sm:h-5' : 'h-px w-full'"
  />
</template>
