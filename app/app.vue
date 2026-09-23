<!--
  A raiz do app.

  `TooltipProvider` vive aqui, e não em cada `UiTooltip`: ele é só contexto (não
  desenha nada), e é o que dá aos tooltips vizinhos o "pular o atraso" — depois
  do primeiro balão, passar para o controle do lado abre na hora, em vez de
  esperar 300ms de novo. Um provider por tooltip perderia isso e faria cada
  linha de tabela remontar a mesma máquina de estado.
-->
<script setup lang="ts">
import { TooltipProvider } from 'reka-ui'
</script>

<template>
  <TooltipProvider>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </TooltipProvider>
  <UiToastViewport />
</template>
