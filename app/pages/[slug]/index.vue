<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { resolveHomeSections, type HomeSectionTone } from '#shared/home-sections'
import { resolveHomeSectionContent } from '~/utils/home-section-content'
import { groupEventSegmentsByVenue } from '~/utils/group-event-segments-by-venue'

const { getPublicWedding } = usePublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()
const { getPublicPhotos } = usePublicPhotos()

// Aguardado (não só destructuring): sem `await`, o setup continua antes de a
// requisição resolver e a checagem de 404 abaixo rodaria sempre com o dado
// ainda pendente — o servidor responderia 200 para um slug inexistente e o
// erro só apareceria depois, no cliente.
const { data: wedding, status: weddingStatus } = await getPublicWedding()
const { data: segmentsResponse } = getPublicEventSegments()
// Mesma chave de cache que a GallerySection já usa — o Nuxt deduplica, então
// isto não é uma segunda requisição. A página precisa da contagem para saber
// se a Galeria vai aparecer, que é o que decide o tom de fundo das vizinhas.
const { data: photosResponse } = getPublicPhotos()

// Repassado a Hero como prop (em vez de useRoute() direto) — mantém o
// componente testável com @vue/test-utils puro. Presentes não usa mais
// token de convite (CLAUDE.md §18.2/4.5), então GiftsShowcaseSection não
// precisa mais deste valor.
const route = useRoute()
const code = computed(() => (typeof route.query.code === 'string' ? route.query.code : undefined))

// Todo item do cronograma alimenta a seção única "O Grande Dia"
// (GrandeDiaSection) — substitui a antiga lista "Programação" e a versão
// anterior com uma seção própria por item (feedback de produto: nome fixo
// e previsível é melhor que título dinâmico por segmento). A classificação
// por palavra-chave (shared/utils/event-segment-keywords.ts) só decide o
// ícone/badge de cada card e as âncoras internas de compatibilidade
// (#cerimonia/#recepcao).
const resolvedSegments = computed(() => {
  const segments = segmentsResponse.value?.data ?? []
  return segments.map((segment) => resolveEventSegmentVenue(segment, segments))
})

// Cerimônia/Recepção no mesmo endereço viram um único card dentro de "O
// Grande Dia" (CLAUDE.md, §12.2) — sem duplicar mapa/endereço; endereços
// diferentes viram dois cards lado a lado na mesma seção.
const eventSegmentGroups = computed(() => groupEventSegmentsByVenue(resolvedSegments.value))

/**
 * As seções a desenhar, na ordem do casal e já com o fundo resolvido.
 *
 * O tom sai daqui, e não de dentro de cada componente, porque ele depende da
 * POSIÇÃO entre as seções que de fato aparecem: com a ordem e a visibilidade
 * configuráveis, um tom fixo por componente colocava duas seções claras
 * seguidas na tela assim que o casal reordenava a página.
 */
const sections = computed(() => {
  const theme = (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>
  return resolveHomeSections({
    order: theme.sectionOrder,
    hidden: theme.hiddenSections,
    hasContent: resolveHomeSectionContent({
      contentConfig: wedding.value?.config_conteudo,
      eventSegmentCount: eventSegmentGroups.value.length,
      photoCount: photosResponse.value?.data?.length ?? 0,
    }),
  })
})

/**
 * Seção alternante recebe só 'default' ou 'muted'. O estreitamento vive numa
 * função em vez de um ternário repetido em cada seção do template — dez cópias
 * da mesma condição é um lugar a mais para uma delas ficar diferente.
 */
function alternating(tone: HomeSectionTone): 'default' | 'muted' {
  return tone === 'muted' ? 'muted' : 'default'
}

/**
 * O RSVP é a única seção de tom fixo que ainda passa por
 * PublicEditorialSection ('accent'). O 'primary' é do Versículo, que tem
 * componente próprio e nunca chega aqui — o estreitamento existe para o
 * compilador, não para um caso real.
 */
function editorialTone(tone: HomeSectionTone): Exclude<HomeSectionTone, 'primary'> {
  return tone === 'primary' ? 'default' : tone
}

// Slug inexistente é 404 de verdade, com status HTTP — não uma página bonita
// respondendo 200. `fatal` para que o erro suba no SSR e o servidor responda o
// código certo: sem isso um buscador indexaria "Casamento não encontrado" como
// se fosse conteúdo válido, e um monitor de uptime nunca veria o problema.
if (!wedding.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casamento não encontrado', fatal: true })
}

// Meta social, canonical e JSON-LD de Evento (ver useWeddingSeo) — essencial
// para o preview correto ao compartilhar o link no WhatsApp.
useWeddingSeo({ wedding, segments: resolvedSegments })
</script>

<template>
  <div>
    <div v-if="weddingStatus === 'pending'" class="flex flex-col items-center gap-4 px-4 py-20">
      <UiSkeleton class="h-10 w-64" />
      <UiSkeleton class="h-6 w-40" />
    </div>

    <template v-else-if="wedding">
      <!-- O Hero é a capa, não um capítulo: fica fora da ordem configurável. -->
      <PublicHero :wedding="wedding" :segments="resolvedSegments" :code="code" />

      <!--
        `v-for` sobre a ordem resolvida com um `v-if` por seção, em vez de
        `<component :is>`: cada seção recebe props diferentes, então um mapa
        id → componente precisaria de um mapa id → props ao lado — mais
        indireção para ler exatamente a mesma coisa.

        Cada seção mantém o próprio `v-if` de conteúdo vazio; a lista daqui
        usa os MESMOS predicados (resolveHomeSectionContent), então as duas
        decisões não têm como divergir.
      -->
      <template v-for="section in sections" :key="section.id">
        <PublicWelcomeSection
          v-if="section.id === 'boas-vindas'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
        <PublicVerseSection v-else-if="section.id === 'versiculo'" :wedding="wedding" />
        <PublicStorySection
          v-else-if="section.id === 'historia'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
        <PublicGrandeDiaSection
          v-else-if="section.id === 'grande-dia'"
          :groups="eventSegmentGroups"
          :event-date="wedding.data_evento"
          :tone="alternating(section.tone)"
        />
        <PublicRsvpTeaserSection
          v-else-if="section.id === 'confirmar-presenca'"
          :wedding="wedding"
          :tone="editorialTone(section.tone)"
        />
        <PublicDressCodeSection
          v-else-if="section.id === 'dress-code'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
        <PublicGuestManualSection
          v-else-if="section.id === 'manual-convidados'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
        <PublicGroomsmenManualSection
          v-else-if="section.id === 'manual-padrinhos'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
        <PublicGiftsShowcaseSection
          v-else-if="section.id === 'presentes'"
          :tone="alternating(section.tone)"
        />
        <PublicGallerySection
          v-else-if="section.id === 'nossos-momentos'"
          :tone="alternating(section.tone)"
        />
        <PublicFaqSection
          v-else-if="section.id === 'faq'"
          :wedding="wedding"
          :tone="alternating(section.tone)"
        />
      </template>
    </template>
  </div>
</template>
