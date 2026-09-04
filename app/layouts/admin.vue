<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

// Painel admin herda a cor do tema do casal (deixa de ser neutro), mas
// preserva --font-sans fixo — nunca troca de fonte por casamento, mesmo que
// o casal tenha escolhido um fontPairId diferente (CLAUDE.md, seção 21).
provide(ADMIN_UI_CONTEXT_KEY, true)

const { signOut } = useAuth()
const uiStore = useUiStore()
const authStore = useAuthStore()
const { getWedding } = useWedding()
const { data: wedding } = await getWedding()

watch(
  wedding,
  (value) => {
    uiStore.setThemeConfig(value?.config_tema ?? null)
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
// Lido direto de useRoute() (reativo), não de useActiveWeddingSlug() — o
// layout não é remontado entre navegações de página (só as páginas em si
// são), então um valor capturado uma vez em setup() ficaria desatualizado
// ao trocar de casamento ativo sem recarregar a página.
const activeSlugParam = computed(() => {
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : ''
})

const navItems = computed(() => {
  const base = `/admin/${activeSlugParam.value}`
  return [
    { to: base, label: 'Dashboard', icon: 'lucide:layout-dashboard' },
    { to: `${base}/convidados`, label: 'Convidados', icon: 'lucide:users' },
    { to: `${base}/convites`, label: 'Convites', icon: 'lucide:mail' },
    { to: `${base}/grupos`, label: 'Grupos', icon: 'lucide:users-round' },
    { to: `${base}/cronograma`, label: 'Cronograma', icon: 'lucide:calendar-clock' },
    { to: `${base}/presentes`, label: 'Presentes', icon: 'lucide:gift' },
    { to: `${base}/galeria`, label: 'Galeria', icon: 'lucide:image' },
    { to: `${base}/configuracoes`, label: 'Configurações', icon: 'lucide:settings' },
  ]
})

function isActive(to: string): boolean {
  if (to === `/admin/${activeSlugParam.value}`) return route.path === to
  return route.path.startsWith(to)
}

// `lg` (1024px) é o ponto onde a sidebar deixa de ser drawer e passa a
// ocupar a coluna fixa — o corte visual é feito em CSS (`lg:sticky`), este
// valor só existe para o comportamento em JS (fechar no mount/navegação
// e prender o foco enquanto é drawer).
const MOBILE_BREAKPOINT_PX = 1024

const isDrawerMode = ref(false)
const isDrawerOpen = computed(() => isDrawerMode.value && uiStore.sidebarOpen)

const sidebarEl = ref<HTMLElement | null>(null)
const menuButtonEl = ref<HTMLButtonElement | null>(null)

function syncDrawerMode(): void {
  isDrawerMode.value = window.innerWidth < MOBILE_BREAKPOINT_PX
}

function handleNavClick(): void {
  if (isDrawerMode.value) {
    uiStore.sidebarOpen = false
  }
}

// Identidade do casamento no topo da sidebar. Meia-noite local explícita
// (mesmo padrão do Hero público): `new Date('2026-09-14')` seria
// interpretado como UTC e voltaria um dia em fuso negativo.
const weddingDateLabel = computed(() => {
  if (!wedding.value) return ''
  return new Date(`${wedding.value.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

// Bloco de quem está logado, no header. Só o que a sessão já expõe (e-mail e
// papel) — nenhuma consulta nova. Não existe nome de exibição no modelo hoje
// (membros_casamento não tem coluna de nome), então o rótulo é a parte do
// e-mail antes do @ e o endereço completo fica no title/leitor de tela: um
// e-mail inteiro estouraria a faixa de 64px do header.
const operatorEmail = computed(() => authStore.user?.email ?? '')
const operatorLocalPart = computed(() => operatorEmail.value.split('@')[0] ?? '')
const operatorName = computed(() => operatorLocalPart.value || 'Conta')
const operatorInitials = computed(() => {
  const initials = operatorLocalPart.value
    .split(/[._-]+/)
    .map((part) => part.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return initials || '·'
})
const operatorRoleLabel = computed(() =>
  authStore.weddingContext?.role === 'dono' ? 'Dono' : 'Colaborador',
)

// Data de hoje no header. Resolvida no mount, não em setup(): o SSR roda no
// fuso do servidor e um valor diferente do client dispararia mismatch de
// hidratação.
const todayLabel = ref('')

// Foco preso no drawer enquanto ele está aberto — sem isso, o Tab continua
// percorrendo o conteúdo por baixo do overlay.
function focusableInSidebar(): HTMLElement[] {
  if (!sidebarEl.value) return []
  return Array.from(
    sidebarEl.value.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
  ).filter((element) => element.offsetParent !== null)
}

function handleSidebarKeydown(event: KeyboardEvent): void {
  if (!isDrawerOpen.value || event.key !== 'Tab') return
  const focusable = focusableInSidebar()
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onKeyStroke('Escape', () => {
  if (isDrawerOpen.value) {
    uiStore.sidebarOpen = false
  }
})

watch(isDrawerOpen, async (open) => {
  if (open) {
    await nextTick()
    focusableInSidebar()[0]?.focus()
  } else {
    menuButtonEl.value?.focus()
  }
})

onMounted(() => {
  // As duas atribuições no mesmo tick de propósito: isDrawerOpen nunca
  // passa por true, então o watch acima não rouba o foco no carregamento.
  syncDrawerMode()
  if (isDrawerMode.value) {
    uiStore.sidebarOpen = false
  }
  const today = new Date()
  // "03 set 2025" — o formato 'short' do pt-BR devolve "03 de set. de 2025",
  // longo demais para a faixa do header; as partes são montadas à mão.
  const month = today.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  todayLabel.value = `${String(today.getDate()).padStart(2, '0')} ${month} ${today.getFullYear()}`
  window.addEventListener('resize', syncDrawerMode)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncDrawerMode)
})
</script>

<template>
  <div class="admin-ui flex min-h-screen bg-surface">
    <Transition
      enter-active-class="transition-brand"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-brand"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="uiStore.sidebarOpen"
        class="fixed inset-0 z-30 bg-text/40 lg:hidden"
        @click="uiStore.sidebarOpen = false"
      />
    </Transition>

    <!--
      Desktop: `lg:sticky lg:top-0 lg:h-screen lg:self-start` — a sidebar
      acompanha a rolagem em vez de sair de cena junto com o conteúdo. Não é
      `lg:static` (rolava embora) nem `fixed` no desktop (tiraria a coluna do
      fluxo e o conteúdo teria de compensar a largura à mão, quebrando a
      animação de recolher). `self-start` é obrigatório: sem ele o
      `align-items: stretch` do flex pai esticaria o aside até a altura da
      página e o `h-screen` não teria efeito, anulando o sticky.
      `overflow-y-auto` cobre o caso de a navegação passar da altura da tela.
    -->
    <aside
      ref="sidebarEl"
      class="fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col border-r border-border bg-surface px-3 py-5 transition-transform transition-brand lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 lg:self-start lg:overflow-y-auto lg:transition-[width]"
      :class="[uiStore.sidebarOpen ? 'translate-x-0 lg:w-56' : '-translate-x-full lg:w-16']"
      @keydown="handleSidebarKeydown"
    >
      <div
        class="mb-8 flex items-center gap-2.5 px-2"
        :class="!uiStore.sidebarOpen && 'lg:justify-center lg:px-0'"
      >
        <span
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-text font-display text-sm font-semibold text-surface-elevated"
          aria-hidden="true"
        >
          M
        </span>
        <div v-if="uiStore.sidebarOpen" class="min-w-0 leading-tight">
          <p class="truncate font-display text-sm font-semibold tracking-tight text-text">
            MeuSiteCasamento
          </p>
          <p class="-mt-0.5 truncate text-xs text-text-muted">Admin · Casamento</p>
        </div>
        <button
          v-if="uiStore.sidebarOpen"
          type="button"
          class="ml-auto shrink-0 rounded-md p-1 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          aria-label="Fechar menu"
          @click="uiStore.sidebarOpen = false"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

      <!-- Ícone SEMPRE visível, rótulo só quando a sidebar está aberta: antes
           o ícone aparecia apenas no modo recolhido, então expandir o menu
           trocava a coluna de ícones por uma coluna de texto puro e o item
           ativo perdia a única âncora visual que sobrevive à leitura rápida.
           É a linguagem do modelo — ícone + rótulo lado a lado, e o mesmo
           ícone segue sendo o item quando o rótulo sai de cena. -->
      <nav class="flex flex-col gap-0.5 text-sm">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :title="item.label"
          :aria-current="isActive(item.to) ? 'page' : undefined"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="[
            isActive(item.to)
              ? 'bg-surface-muted font-medium text-text'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
            !uiStore.sidebarOpen && 'lg:justify-center lg:px-0',
          ]"
          @click="handleNavClick"
        >
          <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
          <span v-if="uiStore.sidebarOpen" class="truncate">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="mt-auto flex flex-col gap-3 pt-4">
        <div v-if="uiStore.sidebarOpen" class="px-2 text-xs text-text-muted">
          <p class="truncate font-display font-semibold text-text">
            {{ wedding?.nomes_noivos }}
          </p>
          <p class="mt-0.5 truncate">{{ weddingDateLabel }}</p>
        </div>

        <button
          type="button"
          aria-label="Sair"
          class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="!uiStore.sidebarOpen && 'lg:justify-center lg:px-0'"
          @click="signOut"
        >
          <Icon name="lucide:log-out" class="h-4 w-4 shrink-0" />
          <span v-if="uiStore.sidebarOpen">Sair</span>
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface/80 px-4 backdrop-blur sm:px-6"
      >
        <button
          ref="menuButtonEl"
          type="button"
          class="shrink-0 rounded-md p-1.5 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden"
          aria-label="Abrir menu"
          :aria-expanded="isDrawerOpen"
          @click="uiStore.sidebarOpen = true"
        >
          <Icon name="lucide:menu" class="h-5 w-5" />
        </button>

        <!-- Mesma posição do hambúrguer do mobile: os dois controlam "mostrar ou
             não a navegação", e aqui o botão fica ancorado na régua do header e
             alinhado ao campo de busca. Solto no cabeçalho da sidebar ele não
             encostava em nada; no rodapé, ficava colado no "Sair" com um ícone
             de silhueta quase idêntica. -->
        <button
          type="button"
          class="hidden shrink-0 rounded-md p-1.5 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:block"
          :aria-label="uiStore.sidebarOpen ? 'Recolher menu' : 'Expandir menu'"
          :aria-expanded="uiStore.sidebarOpen"
          @click="uiStore.sidebarOpen = !uiStore.sidebarOpen"
        >
          <Icon
            :name="uiStore.sidebarOpen ? 'lucide:panel-left-close' : 'lucide:panel-left-open'"
            class="h-5 w-5"
          />
        </button>

        <AdminGlobalSearch />

        <div class="ml-auto flex shrink-0 items-center gap-3">
          <span class="hidden text-xs font-medium text-text-muted sm:block">{{ todayLabel }}</span>
          <div class="flex items-center gap-2 border-l border-border pl-3">
            <span
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-text font-display text-xs font-semibold text-surface-elevated"
              aria-hidden="true"
            >
              {{ operatorInitials }}
            </span>
            <div class="hidden leading-tight sm:block">
              <p class="max-w-40 truncate text-xs font-semibold text-text" :title="operatorEmail">
                {{ operatorName }}
              </p>
              <p class="text-xs text-text-muted">{{ operatorRoleLabel }}</p>
            </div>
            <span class="sr-only">{{ operatorEmail }}</span>
          </div>
        </div>
      </header>

      <main class="min-w-0 flex-1 px-4 py-7 sm:px-6">
        <slot />
      </main>
    </div>
  </div>
</template>
