<script setup lang="ts">
// Raiz sem slug — não existe mais "o" casamento (CLAUDE.md, seção 4.4/33:
// cada casamento vive em /{slug}). Sem layout: 'default' faria a página
// buscar tema/NavBar de um casamento que não existe aqui. Página neutra,
// nunca indexada.
definePageMeta({ layout: false })

useSeoMeta({
  title: 'Wedding Platform',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
    <h1 class="text-xl font-semibold text-text">Wedding Platform</h1>
    <p class="text-sm text-text-muted">
      Acesse pelo link do casamento que você recebeu — algo como
      <span class="font-medium text-text">wedding-platform.com/nome-do-casal</span>.
    </p>
  </div>
</template>
