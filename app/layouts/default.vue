<script setup lang="ts">
// Layout do site público (CLAUDE.md, seção 5) — busca o tema uma vez aqui
// para que /, /presentes e /rsvp/[code] herdem a mesma personalização
// visual sem precisar buscar theme_config individualmente (CLAUDE.md,
// seção 22.3). Aguardado (não só destructuring de useFetch) para que
// theme_config já esteja resolvido no primeiro render, em SSR e client —
// evita o mesmo mismatch de hidratação já corrigido em /admin/configuracoes.
const uiStore = useUiStore()
const slug = useWeddingSlug()
const { getPublicWedding } = usePublicWedding()
const { data: wedding } = await getPublicWedding()

watch(
  wedding,
  (value) => {
    uiStore.setThemeConfig(value?.theme_config ?? null)
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
    <PublicNavBar :couple-names="wedding?.couple_names" :slug="slug" />
    <main class="flex-1">
      <slot />
    </main>
    <PublicFooter :couple-names="wedding?.couple_names" />
  </div>
</template>
