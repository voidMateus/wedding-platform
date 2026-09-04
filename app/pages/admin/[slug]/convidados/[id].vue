<script setup lang="ts">
// A edição virou modal na própria listagem (`?editar=<id>`). A rota antiga
// sobrevive só como redirecionamento — é para onde apontam os links já
// salvos e a lista de membros de um convite.
definePageMeta({
  middleware: [
    (to) =>
      navigateTo(
        {
          path: `/admin/${to.params.slug}/convidados`,
          query: { editar: String(to.params.id) },
        },
        { replace: true },
      ),
  ],
})
</script>

<template>
  <div />
</template>
