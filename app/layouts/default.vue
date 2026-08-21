<script setup lang="ts">
import type { ThemeConfig } from '#shared/schemas/theme'

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

// Sincroniza o destaque do menu com o atalho em destaque do Hero
// (config_tema.heroFeaturedButton) — pedido do usuário.
const heroFeaturedButton = computed(() => {
  const theme = (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>
  return theme.heroFeaturedButton
})

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
  <div class="flex min-h-screen flex-col bg-surface text-text">
    <PublicNavBar
      :couple-names="wedding?.nomes_noivos"
      :slug="slug"
      :code="code"
      :featured-button-id="heroFeaturedButton"
    />
    <main class="flex-1">
      <slot />
    </main>
    <PublicFooter :couple-names="wedding?.nomes_noivos" :event-date="wedding?.data_evento" />
    <PublicScrollToTopButton />
  </div>
</template>
