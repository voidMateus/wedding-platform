<script setup lang="ts">
import { resolveWeddingContent } from '#shared/wedding-content'

// Página pública, sempre indexável — sem token de convite (CLAUDE.md, seção
// 18.2/4.5): acessível a qualquer momento a partir do site do casamento,
// sem exigir um link personalizado por convite. Identificação de quem
// presenteia acontece no modal (nome/telefone), não na URL.
definePageMeta({ layout: 'default' })

const slug = useWeddingSlug()

const { getPublicWedding } = usePublicWedding()
const { data: wedding } = await getPublicWedding()

// Slug inexistente responde 404 de verdade (mesma regra da home): a página não
// pode existir sem o casamento por trás dela. `fatal` para o erro subir no SSR
// e o status HTTP ser realmente 404, não uma tela de erro dentro de um 200.
if (!wedding.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casamento não encontrado', fatal: true })
}

const giftsIntroMessage = computed(
  () => resolveWeddingContent(wedding.value?.config_conteudo).giftsIntroMessage,
)

// Página pública e indexável — título e descrição próprios, não herdados da
// home: é ela que aparece quando alguém busca a lista de presentes do casal.
const canonicalUrl = useAbsoluteUrl(() => `/${slug}/presentes`)
const giftsTitle = computed(() =>
  wedding.value ? `Lista de presentes — ${wedding.value.nomes_noivos}` : 'Lista de presentes',
)
const giftsDescription = computed(() =>
  wedding.value
    ? `Escolha um presente para ${wedding.value.nomes_noivos} e contribua pelo Pix ou cartão.`
    : undefined,
)

useSeoMeta({
  title: () => giftsTitle.value,
  description: () => giftsDescription.value,
  ogTitle: () => giftsTitle.value,
  ogDescription: () => giftsDescription.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value || undefined,
  ogLocale: 'pt_BR',
  twitterCard: 'summary_large_image',
  twitterTitle: () => giftsTitle.value,
  twitterDescription: () => giftsDescription.value,
})

useHead({
  link: () => (canonicalUrl.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : []),
})

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
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon name="lucide:gift" class="h-6 w-6" />
      </span>
      <div>
        <h1 class="font-display text-3xl font-semibold text-heading">
          Presentear{{ wedding?.nomes_noivos ? ` ${wedding.nomes_noivos}` : '' }}
        </h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-text-muted">
          {{ giftsIntroMessage }}
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
