<script setup lang="ts">
// Painel admin herda a cor do tema do casal (deixa de ser neutro), mas
// preserva --font-sans fixo — nunca troca de fonte por casamento, mesmo que
// o casal tenha escolhido um fontPairId diferente (CLAUDE.md, seção 21).
const { signOut } = useAuth()
const uiStore = useUiStore()
const { getWedding } = useWedding()
const { data: wedding } = await getWedding()

// watch (não uma atribuição única): a página de configurações usa a mesma
// chave 'wedding' (useWedding.ts) — ao salvar a Aparência e dar refresh()
// nela, este layout reflete a cor nova sem precisar de reload completo.
watch(
  wedding,
  (value) => {
    uiStore.setThemeConfig(value?.theme_config ?? null)
  },
  { immediate: true },
)

const themeStyleTag = computed(() => {
  const style = useWeddingTheme(uiStore.themeConfig, { includeFont: false })
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
  <div class="min-h-screen bg-surface-muted">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div class="flex items-center gap-6">
        <span class="text-sm font-medium text-text">Wedding Platform — Painel</span>
        <nav class="flex gap-4 text-sm text-text-muted">
          <NuxtLink to="/admin" class="hover:text-text">Dashboard</NuxtLink>
          <NuxtLink to="/admin/convidados" class="hover:text-text">Convidados</NuxtLink>
          <NuxtLink to="/admin/grupos" class="hover:text-text">Grupos</NuxtLink>
          <NuxtLink to="/admin/cronograma" class="hover:text-text">Cronograma</NuxtLink>
          <NuxtLink to="/admin/presentes" class="hover:text-text">Presentes</NuxtLink>
          <NuxtLink to="/admin/configuracoes" class="hover:text-text">Configurações</NuxtLink>
        </nav>
      </div>
      <UiButton variant="ghost" size="sm" @click="signOut">Sair</UiButton>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
