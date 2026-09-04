<script setup lang="ts">
// O cadastro virou modal na própria listagem (`?novo=1`). A rota antiga
// sobrevive só como redirecionamento: link salvo, atalho externo e o
// tratamento de URL legada (`/admin/convidados/novo`) continuam chegando
// no lugar certo.
definePageMeta({
  middleware: [
    (to) =>
      navigateTo(
        { path: `/admin/${to.params.slug}/convidados`, query: { novo: '1' } },
        { replace: true },
      ),
  ],
})
</script>

<template>
  <div />
</template>
