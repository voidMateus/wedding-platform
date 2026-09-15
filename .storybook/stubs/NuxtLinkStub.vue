<!--
  Substituto do `<NuxtLink>` dentro do Storybook.

  `UiButton` renderiza um link quando recebe `to` — e é justamente aí que mora a
  diferença de acessibilidade entre botão e âncora (papel, foco, comportamento
  do Enter). Um stub que renderizasse `<span>` esconderia essa metade do
  componente da varredura do axe, então aqui é uma âncora de verdade.

  `href` sempre presente: âncora sem `href` não entra na ordem de tabulação e
  não tem papel `link` — o axe ACEITARIA calada uma marcação que na aplicação
  seria navegável. O `to` vira o `href` tal como veio; navegar não leva a lugar
  nenhum, o que é o esperado numa vitrine.
-->
<script setup lang="ts">
interface Props {
  to: string
  target?: string
  rel?: string
}

defineProps<Props>()
</script>

<template>
  <a :href="to" :target="target" :rel="rel">
    <slot />
  </a>
</template>
