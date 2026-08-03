<script setup lang="ts">
// Painel admin herda a cor do tema do casal (deixa de ser neutro), mas
// preserva --font-sans fixo — nunca troca de fonte por casamento, mesmo que
// o casal tenha escolhido um fontPairId diferente (CLAUDE.md, seção 21).
const { signOut } = useAuth()
const uiStore = useUiStore()
const { getWedding } = useWedding()
const { data: wedding } = await getWedding()

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

// Sidebar colapsável (CLAUDE.md, seção 24) — mobile vira overlay/drawer.
// sidebarOpen começa true (default do ui.store.ts, assume desktop no SSR);
// corrigido no mount para telas estreitas, onde um drawer aberto por
// padrão cobriria o conteúdo assim que a página carrega.
const route = useRoute()

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: 'lucide:layout-dashboard' },
  { to: '/admin/convidados', label: 'Convidados', icon: 'lucide:users' },
  { to: '/admin/convites', label: 'Convites', icon: 'lucide:mail' },
  { to: '/admin/grupos', label: 'Grupos', icon: 'lucide:users-round' },
  { to: '/admin/cronograma', label: 'Cronograma', icon: 'lucide:calendar-clock' },
  { to: '/admin/presentes', label: 'Presentes', icon: 'lucide:gift' },
  { to: '/admin/galeria', label: 'Galeria', icon: 'lucide:image' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: 'lucide:settings' },
]

function isActive(to: string): boolean {
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}

const MOBILE_BREAKPOINT_PX = 640

function handleNavClick(): void {
  if (window.innerWidth < MOBILE_BREAKPOINT_PX) {
    uiStore.sidebarOpen = false
  }
}

onMounted(() => {
  if (window.innerWidth < MOBILE_BREAKPOINT_PX) {
    uiStore.sidebarOpen = false
  }
})
</script>

<template>
  <div class="flex min-h-screen bg-surface-muted">
    <div
      v-if="uiStore.sidebarOpen"
      class="fixed inset-0 z-30 bg-black/40 sm:hidden"
      @click="uiStore.sidebarOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-40 flex w-56 flex-col border-r border-border bg-surface transition-transform duration-200 sm:static sm:z-auto sm:translate-x-0 sm:transition-[width]"
      :class="[
        uiStore.sidebarOpen ? 'translate-x-0 sm:w-56' : '-translate-x-full sm:w-16',
      ]"
    >
      <div class="flex items-center justify-between gap-2 border-b border-border px-3 py-4">
        <span v-if="uiStore.sidebarOpen" class="truncate text-sm font-medium text-text">
          Wedding Platform
        </span>
        <button
          type="button"
          class="shrink-0 rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :aria-label="uiStore.sidebarOpen ? 'Recolher menu' : 'Expandir menu'"
          @click="uiStore.sidebarOpen = !uiStore.sidebarOpen"
        >
          <Icon
            :name="uiStore.sidebarOpen ? 'lucide:panel-left-close' : 'lucide:panel-left-open'"
            class="h-5 w-5"
          />
        </button>
      </div>

      <nav class="flex flex-1 flex-col gap-1 p-2">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
            !uiStore.sidebarOpen && 'sm:justify-center',
          ]"
          @click="handleNavClick"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0" />
          <span v-if="uiStore.sidebarOpen">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="border-t border-border p-2">
        <UiButton
          variant="ghost"
          size="sm"
          class="w-full gap-3"
          :class="uiStore.sidebarOpen ? 'justify-start' : 'justify-center'"
          @click="signOut"
        >
          <Icon name="lucide:log-out" class="h-5 w-5 shrink-0" />
          <span v-if="uiStore.sidebarOpen">Sair</span>
        </UiButton>
      </div>
    </aside>

    <div class="flex flex-1 flex-col">
      <header class="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 sm:hidden">
        <button
          type="button"
          class="rounded-md p-1.5 text-text-muted hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-label="Abrir menu"
          @click="uiStore.sidebarOpen = true"
        >
          <Icon name="lucide:menu" class="h-5 w-5" />
        </button>
        <span class="text-sm font-medium text-text">Wedding Platform</span>
      </header>
      <header class="hidden items-center border-b border-border bg-surface px-6 py-3 sm:flex">
        <AdminGlobalSearch />
      </header>
      <main class="flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
