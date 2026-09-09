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
  <div class="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
    <PublicPageHeader
      eyebrow="Para essa nova fase"
      title="Lista de Presentes"
      :description="giftsIntroMessage"
      :back-to="backToSiteLink"
    >
      <!--
        Âncoras internas no mesmo formato de cápsula dos atalhos do Hero — a
        página é longa, e são elas que dão acesso direto a cada bloco da lista.
      -->
      <nav class="flex flex-wrap justify-center gap-2 pt-2" aria-label="Seções desta página">
        <a
          v-for="link in SECTION_LINKS"
          :key="link.id"
          :href="`#${link.id}`"
          class="rounded-full border border-ornament/50 px-4 py-2 text-xs tracking-[0.12em] text-heading uppercase transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {{ link.label }}
        </a>
      </nav>
    </PublicPageHeader>

    <GiftsShowcase />
  </div>
</template>
