<script setup lang="ts">
import { GIFTS_INTRO_CONTENT } from '#shared/wedding-content'

// Página pública, sempre indexável — sem token de convite (CLAUDE.md, seção
// 18.2/4.5): acessível a qualquer momento a partir do site do casamento,
// sem exigir um link personalizado por convite. Identificação de quem
// presenteia acontece no modal (nome/telefone), não na URL.
definePageMeta({ layout: 'default' })

const slug = useWeddingSlug()

const { getPublicWedding } = usePublicWedding()
const { data: wedding } = await getPublicWedding()

useSeoMeta({ title: 'Presentes' })

const backToSiteLink = computed(() => `/${slug}`)

const SECTION_LINKS = [
  { id: 'presentes-fisicos', label: 'Lista de Presentes' },
  { id: 'presentes-contribuicoes', label: 'Contribuições' },
  { id: 'presentes-emocionais', label: 'Presentes Emocionais' },
]
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
        <h1 class="font-display text-3xl font-semibold text-heading">
          Presentear{{ wedding?.couple_names ? ` ${wedding.couple_names}` : '' }}
        </h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          {{ GIFTS_INTRO_CONTENT.message }}
        </p>
      </div>

      <nav class="flex flex-wrap justify-center gap-2 pt-2">
        <a
          v-for="link in SECTION_LINKS"
          :key="link.id"
          :href="`#${link.id}`"
          class="rounded-full border border-border px-3 py-1.5 text-sm text-text-muted transition-brand hover:border-primary/50 hover:text-text"
        >
          {{ link.label }}
        </a>
      </nav>
    </div>

    <GiftsShowcase />
  </div>
</template>
