<script setup lang="ts">
// O detalhe do convite virou modal na própria listagem (`?editar=<id>`) —
// convidados, etiquetas, link de acesso e Linha do Tempo agora vivem lá. A
// rota antiga sobrevive só como redirecionamento, para link salvo e para o
// tratamento de URL legada (`/admin/convites/<id>`).
definePageMeta({
  middleware: [
    (to) =>
      navigateTo(
        {
          path: `/admin/${to.params.slug}/convites`,
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
