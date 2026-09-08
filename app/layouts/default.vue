<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'
import { PUBLIC_ORNAMENT_FRAME_KEY } from '~/utils/public-theme-context'

// Layout do site público (CLAUDE.md, seção 5) — busca o tema uma vez aqui
// para que /, /presentes e /rsvp/[code] herdem a mesma personalização
// visual sem precisar buscar config_tema individualmente (CLAUDE.md,
// seção 22.3). Aguardado (não só destructuring de useFetch) para que
// config_tema já esteja resolvido no primeiro render, em SSR e client —
// evita o mesmo mismatch de hidratação já corrigido em /admin/configuracoes.
const uiStore = useUiStore()
const slug = useWeddingSlug()
const { getPublicWedding } = usePublicWedding()
const { data: wedding } = await getPublicWedding()

// Repassado ao NavBar como prop (em vez do componente chamar useRoute()
// diretamente) — mantém o NavBar testável com @vue/test-utils puro.
const route = useRoute()
const code = computed(() => (typeof route.query.code === 'string' ? route.query.code : undefined))

const theme = computed(() => (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>)

// Sincroniza o destaque do menu com o atalho em destaque do Hero
// (config_tema.heroFeaturedButton) — pedido do usuário.
const heroFeaturedButton = computed(() => theme.value.heroFeaturedButton)

// Monograma do casal, quando o casal enviou uma arte própria — a navegação e
// o rodapé caem nas iniciais derivadas quando não há (ver PublicMonogram).
const monogramImageUrl = computed(() => theme.value.monogramImageUrl ?? null)

// Estilo tipográfico dos títulos (config_tema.headingStyle). Vai como atributo
// no wrapper DESTE layout, não em <html>: o painel administrativo compartilha
// o mesmo documento e não pode herdar a caixa alta do tema de um casamento.
// As regras que reagem a ele estão em main.css.
const headingStyle = computed(() => theme.value.headingStyle ?? 'classic')

// Moldura de filete das seções — provida aqui e injetada por
// PublicEditorialSection (ver PUBLIC_ORNAMENT_FRAME_KEY). O que viaja é um
// getter, não o booleano já lido: `provide` guarda o valor de uma vez, então
// um booleano cru travaria a moldura no estado anterior ao carregamento do
// tema.
provide(PUBLIC_ORNAMENT_FRAME_KEY, () => Boolean(theme.value.ornamentFrame))

watch(
  wedding,
  (value) => {
    uiStore.setThemeConfig(value?.config_tema ?? null)
  },
  { immediate: true },
)

const themeStyleTag = computed(() => {
  const style = useWeddingTheme(uiStore.themeConfig, { includeFont: true })
  const declarations = Object.entries(style)
    .map(([property, value]) => `${property}: ${value};`)
    .join(' ')
  return `:root { ${declarations} }`
})

useHead({
  style: [{ innerHTML: themeStyleTag }],
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface text-text" :data-heading-style="headingStyle">
    <PublicNavBar
      :couple-names="wedding?.nomes_noivos"
      :slug="slug"
      :code="code"
      :featured-button-id="heroFeaturedButton"
      :monogram-image-url="monogramImageUrl"
    />
    <main class="flex-1">
      <slot />
    </main>
    <PublicFooter
      :couple-names="wedding?.nomes_noivos"
      :event-date="wedding?.data_evento"
      :monogram-image-url="monogramImageUrl"
    />
    <PublicScrollToTopButton />
  </div>
</template>
