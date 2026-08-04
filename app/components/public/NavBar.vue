<script setup lang="ts">
// Navegação por âncora (Fase Editorial) — curada deliberadamente (não um
// link por seção; 13 seções num menu seriam ruído visual, contrário ao
// "luxo discreto" pedido). Links usam caminho absoluto com hash ("/#id"),
// não só "#id", para funcionar também a partir de /presentes e /rsvp/[code]
// (mesmo layout, CLAUDE.md seção 5), navegando de volta para "/" e rolando
// até a seção.
interface Props {
  coupleNames?: string | null
  /** Slug do casamento atual (CLAUDE.md, seção 4.4/33) — prefixa todo link interno. */
  slug: string
  /**
   * Token de acesso do convidado (?code=, CLAUDE.md §4.5/14), se presente na
   * URL atual — resolvido pelo layout (que já tem contexto de rota real) em
   * vez de chamar useRoute() aqui dentro: mantém este componente testável
   * com @vue/test-utils puro, sem precisar de app Nuxt completo no mount.
   */
  code?: string
  /**
   * Id do atalho em destaque do Hero (theme_config.heroFeaturedButton) —
   * o link correspondente do menu ganha o mesmo destaque visual, pedido
   * do usuário ("o menu tem o destaque sincronizado com o botão do
   * hero"). Resolvido pelo layout, não aqui (mesmo racional dos outros
   * props vindos de useRoute()/dados já carregados).
   */
  featuredButtonId?: string
}

const { coupleNames, slug, code, featuredButtonId } = defineProps<Props>()

// "/{slug}/presentes" fica de fora da lista de texto — vira um CTA
// destacado (UiButton, formato pill) tanto no menu desktop quanto no topo
// do drawer mobile, mesmo papel do botão "Presentear" do concorrente:
// sempre visível, sempre a ação com mais destaque visual da navegação. A
// lista de presentes tem página própria dedicada (não fica mais embutida na
// home como vitrine completa — só um teaser lá, ver GiftsShowcaseSection) —
// pensada para escalar quando a lista crescer bastante (ex.: 100+ itens).
// `id` casa com o id do catálogo de atalhos do Hero (shared/hero-buttons.ts)
// — usado só para sincronizar o destaque, não pra navegação.
const NAV_LINKS = computed(() => [
  { id: 'historia', to: `/${slug}/#historia`, label: 'Nossa História' },
  { id: 'cronograma', to: `/${slug}/#grande-dia`, label: 'O Grande Dia' },
  { id: 'confirmar-presenca', to: `/${slug}/#confirmar-presenca`, label: 'Confirmar Presença' },
  { id: 'galeria', to: `/${slug}/#nossos-momentos`, label: 'Nossos Momentos' },
  { id: 'manual-convidados', to: `/${slug}/#manual-convidados`, label: 'Manual do Convidado' },
])

const homeLink = computed(() => `/${slug}`)

// Preserva ?code= na navegação real para /presentes — diferente de uma
// âncora na mesma página, trocar de rota sem isso perderia a autorização de
// reservar/contribuir.
const giftsLink = computed(() => `/${slug}/presentes${code ? `?code=${code}` : ''}`)

const isMobileMenuOpen = ref(false)

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
    <nav class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
      <NuxtLink
        :to="homeLink"
        class="flex min-h-11 shrink-0 items-center whitespace-nowrap font-display text-lg font-semibold text-heading"
        @click="closeMobileMenu"
      >
        {{ coupleNames || 'MeuSiteCasamento' }}
      </NuxtLink>

      <div class="hidden items-center gap-1 text-sm lg:flex">
        <NuxtLink
          v-for="link in NAV_LINKS"
          :key="link.to"
          :to="link.to"
          class="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 transition-all duration-200 hover:bg-surface-muted hover:text-text"
          :class="link.id === featuredButtonId ? 'bg-secondary/10 font-semibold text-primary' : 'text-text-muted'"
        >
          {{ link.label }}
        </NuxtLink>
        <UiButton :to="giftsLink" rounded="full" size="sm" class="ml-2">
          <Icon name="lucide:gift" class="h-3.5 w-3.5" />
          Presentear
        </UiButton>
      </div>

      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
        :aria-label="isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
      </button>
    </nav>

    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-20 bg-black/40 lg:hidden"
      aria-hidden="true"
      @click="closeMobileMenu"
    />
    <div
      class="fixed inset-y-0 right-0 z-30 flex w-64 flex-col gap-1 border-l border-border bg-surface p-4 shadow-lg transition-transform duration-200 lg:hidden"
      :class="isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <UiButton :to="giftsLink" rounded="full" class="mb-2 w-full" @click="closeMobileMenu">
        <Icon name="lucide:gift" class="h-4 w-4" />
        Presentear
      </UiButton>
      <NuxtLink
        v-for="link in NAV_LINKS"
        :key="link.to"
        :to="link.to"
        class="flex min-h-11 items-center rounded-md px-3 hover:bg-surface-muted"
        :class="link.id === featuredButtonId ? 'font-semibold text-primary' : 'text-text'"
        @click="closeMobileMenu"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </header>
</template>
