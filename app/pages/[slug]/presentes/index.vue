<script setup lang="ts">
// noindex quando personalizado por código (CLAUDE.md, seção 26) — a versão
// sem código continua pública/indexável, como a home (ARCHITECTURE.md 2.2).
// Página dedicada, não mais um teaser embutido na home — pensada pra
// escalar bem quando a lista crescer (ex.: 100+ itens).
definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = useWeddingSlug()
const code = typeof route.query.code === 'string' ? route.query.code : undefined

useSeoMeta({
  title: 'Lista de presentes',
  robots: code ? 'noindex, nofollow' : undefined,
})

const backToSiteLink = computed(() => `/${slug}${code ? `?code=${code}` : ''}`)
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
    <NuxtLink
      :to="backToSiteLink"
      class="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Voltar ao site
    </NuxtLink>

    <div class="flex flex-col items-center gap-3 text-center">
      <span class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon name="lucide:gift" class="h-6 w-6" />
      </span>
      <div>
        <h1 class="font-display text-3xl font-semibold text-heading">Lista de Presentes</h1>
        <p v-if="!code" class="mt-2 text-sm text-text-muted">
          Acesse pelo link enviado a você para poder reservar ou contribuir.
        </p>
        <p v-else class="mt-2 max-w-md text-sm leading-relaxed text-text-muted">
          Sua presença já é o presente mais importante — mas se quiser nos ajudar a começar essa
          nova fase, preparamos esta lista com carinho.
        </p>
      </div>
    </div>

    <GiftsShowcase :code="code" />
  </div>
</template>
