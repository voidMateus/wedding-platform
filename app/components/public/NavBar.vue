<script setup lang="ts">
// Navegação por âncora (Fase Editorial) — curada deliberadamente (não um
// link por seção; 13 seções num menu seriam ruído visual, contrário ao
// "luxo discreto" pedido). Links usam caminho absoluto com hash ("/#id"),
// não só "#id", para funcionar também a partir de /presentes e /rsvp/[code]
// (mesmo layout, CLAUDE.md seção 5), navegando de volta para "/" e rolando
// até a seção.
interface Props {
  coupleNames?: string | null
}

const { coupleNames } = defineProps<Props>()

// "/#presentes" fica de fora da lista de texto — vira um CTA destacado
// (UiButton, formato pill) tanto no menu desktop quanto no topo do drawer
// mobile, mesmo papel do botão "Presentear" do concorrente: sempre visível,
// sempre a ação com mais destaque visual da navegação. A vitrine completa
// de presentes agora vive embutida na home (`/#presentes`, PublicEditorialSection
// id="presentes"); `/presentes` continua existindo como página própria
// (link direto/compartilhável), só deixou de ser o alvo do menu.
const NAV_LINKS = [
  { to: '/#historia', label: 'Nossa História' },
  { to: '/#cronograma', label: 'Cronograma' },
  { to: '/#confirmar-presenca', label: 'Confirmar Presença' },
  { to: '/#galeria', label: 'Galeria' },
  { to: '/#contato', label: 'Contato' },
]

const isMobileMenuOpen = ref(false)

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
    <nav class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <NuxtLink
        to="/"
        class="flex min-h-11 items-center font-display text-lg font-semibold text-heading"
        @click="closeMobileMenu"
      >
        {{ coupleNames || 'Wedding Platform' }}
      </NuxtLink>

      <div class="hidden items-center gap-6 text-sm text-text-muted sm:flex">
        <NuxtLink v-for="link in NAV_LINKS" :key="link.to" :to="link.to" class="hover:text-text">
          {{ link.label }}
        </NuxtLink>
        <UiButton to="/#presentes" rounded="full" size="sm">Presentear</UiButton>
      </div>

      <button
        type="button"
        class="flex h-11 w-11 items-center justify-center rounded-md text-text hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:hidden"
        :aria-label="isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
      </button>
    </nav>

    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-20 bg-black/40 sm:hidden"
      aria-hidden="true"
      @click="closeMobileMenu"
    />
    <div
      class="fixed inset-y-0 right-0 z-30 flex w-64 flex-col gap-1 border-l border-border bg-surface p-4 shadow-lg transition-transform duration-200 sm:hidden"
      :class="isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <UiButton to="/#presentes" rounded="full" class="mb-2 w-full" @click="closeMobileMenu">
        Presentear
      </UiButton>
      <NuxtLink
        v-for="link in NAV_LINKS"
        :key="link.to"
        :to="link.to"
        class="flex min-h-11 items-center rounded-md px-3 text-text hover:bg-surface-muted"
        @click="closeMobileMenu"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </header>
</template>
