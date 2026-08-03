<script setup lang="ts">
// noindex quando personalizado por código (CLAUDE.md, seção 26) — a versão
// sem código continua pública/indexável, como a home (ARCHITECTURE.md 2.2).
definePageMeta({ layout: 'default' })

const route = useRoute()
const code = typeof route.query.code === 'string' ? route.query.code : undefined

useSeoMeta({
  title: 'Lista de presentes',
  robots: code ? 'noindex, nofollow' : undefined,
})
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
    <div>
      <h1 class="text-2xl font-semibold text-text">Lista de presentes</h1>
      <p v-if="!code" class="mt-2 text-sm text-text-muted">
        Acesse pelo link enviado a você para poder reservar ou contribuir.
      </p>
    </div>

    <GiftsShowcase :code="code" />
  </div>
</template>
