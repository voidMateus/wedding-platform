<script setup lang="ts">
import { adminPrimaryNav, adminSectionMenu } from '~/utils/admin-nav'

// Painel admin herda a cor do tema do casal (deixa de ser neutro), mas
// preserva --font-sans fixo — nunca troca de fonte por casamento, mesmo que
// o casal tenha escolhido um fontPairId diferente (CLAUDE.md, seção 21).
provide(ADMIN_UI_CONTEXT_KEY, true)

const route = useRoute()
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
  // Só o admin: o shell tem altura de tela e quem rola é o <main>, então o
  // documento não deveria rolar — sem travar aqui ele ainda rolava (medido:
  // `document.scrollTop` ia a 708 num clique). Documento rolável por baixo de
  // um app shell dá dois eixos de rolagem competindo, e é o de fora que o
  // navegador move quando precisa revelar um elemento focado.
  // `admin-ui` no BODY, e nao na div do shell: todo modal da plataforma sai por
  // `DialogPortal`, que renderiza como filho de <body> -- fora da div. Variavel
  // CSS herda pela arvore do DOM, entao com o escopo la dentro os modais do
  // painel caiam nos tokens do site publico: creme no lugar do cinza, borda tan
  // e Playfair/Inter no lugar de Sora/Manrope. No body, o portal herda igual ao
  // resto do painel.
  bodyAttrs: { class: 'admin-ui overflow-hidden' },
})

const activeSlug = computed(() => {
  const slug = route.params.slug
  return typeof slug === 'string' ? slug : ''
})

// Duas listas, duas perguntas: a nav primária diz onde se está no painel, o
// menu da seção diz como se está olhando aquela parte. Ver `admin-nav.ts`.
const navPrimaria = computed(() => adminPrimaryNav(activeSlug.value))
const menuDaSecao = computed(() => adminSectionMenu(activeSlug.value, route.path))
const temMenuDeSecao = computed(() => menuDaSecao.value.length > 0)

// Identidade do casamento no cabeçalho. Meia-noite local explícita (mesmo
// padrão do Hero público): `new Date('2026-09-14')` seria interpretado como
// UTC e voltaria um dia em fuso negativo.
const weddingDateLabel = computed(() => {
  if (!wedding.value) return ''
  return new Date(`${wedding.value.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

/** Monograma a partir dos nomes ("Mateus & Raquel" → "M&R"). */
const monograma = computed(() => {
  const nomes = (wedding.value?.nomes_noivos ?? '').split('&').map((parte) => parte.trim())
  const iniciais = nomes.map((nome) => nome.charAt(0).toUpperCase()).filter(Boolean)
  return iniciais.length > 1 ? iniciais.join('&') : (iniciais[0] ?? 'M')
})

// Bloco de quem está logado. Só o que a sessão já expõe (e-mail e papel) —
// nenhuma consulta nova. Não existe nome de exibição no modelo hoje
// (membros_casamento não tem coluna de nome), então o rótulo é a parte do
// e-mail antes do @ e o endereço completo fica no title/leitor de tela.
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

/**
 * O botão de recolher fica DENTRO da barra, então ao clicá-lo o ponteiro
 * continua sobre ela e a expansão por hover dispararia na hora — o clique
 * pareceria não ter feito nada. A expansão fica suprimida até o ponteiro sair
 * uma vez; daí em diante o hover volta a valer normalmente.
 */
const hoverSuprimido = ref(false)

function alternarMenuDaSecao() {
  uiStore.menuDaSecaoRecolhido = !uiStore.menuDaSecaoRecolhido
  hoverSuprimido.value = uiStore.menuDaSecaoRecolhido
}

const menuExpandeNoHover = computed(() => uiStore.menuDaSecaoRecolhido && !hoverSuprimido.value)
</script>

<template>
  <!--
    App shell de altura fixa: a raiz não rola, quem rola é o <main>. A chrome
    fora da rolagem do documento é o que a torna imune à trava de scroll dos
    dropdowns do Reka (ao abrir, o primitive mexe em `overflow`/`paddingRight`
    do `body`; com a chrome dependendo do documento, ela saltava de volta ao
    topo e desaparecia). Ver também a nota de `overflow-x` em
    app/assets/css/main.css.

    Coluna, e não linha: no celular o empilhamento (cabeçalho → menu da seção →
    conteúdo → abas) é a ordem de leitura, e no desktop a linha interna volta
    com a coluna do menu ao lado do conteúdo.
  -->
  <div class="flex h-screen flex-col overflow-hidden bg-surface">
    <header
      class="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:h-16 lg:gap-4 lg:px-6"
    >
      <!-- Identidade do casamento, não da plataforma: quem está aqui já sabe
           em que produto está, e precisa saber de qual casamento é esta lista
           (uma conta pode ter mais de um). -->
      <NuxtLink
        :to="`/admin/${activeSlug}`"
        class="flex shrink-0 items-center gap-2.5 rounded-lg transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-text font-display text-xs font-semibold text-surface-elevated"
          aria-hidden="true"
        >
          {{ monograma }}
        </span>
        <span class="min-w-0 leading-tight">
          <span class="block truncate font-display text-sm font-semibold text-text">
            {{ wedding?.nomes_noivos }}
          </span>
          <span class="hidden truncate text-xs text-text-muted sm:block">
            {{ weddingDateLabel }}
          </span>
        </span>
      </NuxtLink>

      <AdminPrimaryNav :itens="navPrimaria" class="mx-auto shrink-0" />

      <div class="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:gap-3">
        <div class="flex items-center gap-2 lg:border-l lg:border-border lg:pl-3">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted font-display text-xs font-semibold text-text"
            aria-hidden="true"
          >
            {{ operatorInitials }}
          </span>
          <div class="hidden leading-tight lg:block">
            <p class="max-w-40 truncate text-xs font-semibold text-text" :title="operatorEmail">
              {{ operatorName }}
            </p>
            <p class="text-xs text-text-muted">{{ operatorRoleLabel }}</p>
          </div>
          <span class="sr-only">{{ operatorEmail }}</span>
        </div>

        <!-- Só no desktop: no celular "Sair" vive no painel "Mais" da barra
             inferior, para não disputar os poucos alvos de toque do topo. -->
        <button
          type="button"
          aria-label="Sair"
          title="Sair"
          class="hidden shrink-0 rounded-md p-1.5 text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:block"
          @click="signOut"
        >
          <Icon name="lucide:log-out" class="h-5 w-5" />
        </button>
      </div>
    </header>

    <!-- Menu da seção no celular: fileira rolável logo abaixo do cabeçalho.
         Trocar entre "Visão organizada" e "Modo lista" é o gesto mais repetido
         da seção — atrás de um menu custaria dois toques por troca. -->
    <div v-if="temMenuDeSecao" class="shrink-0 border-b border-border bg-surface pt-2 lg:hidden">
      <AdminSectionMenu :grupos="menuDaSecao" variant="fileira" />
    </div>

    <div class="flex min-h-0 flex-1">
      <!--
        Recolhido, o menu vira uma trilha de ícones e o painel EXPANDE SOBRE o
        conteúdo no hover (`absolute` + sombra), em vez de empurrá-lo: se
        alargasse a coluna, passar o mouse reflowaria a tabela inteira a cada
        vez — o pior tipo de movimento numa tela de dados.

        A largura reservada continua sendo a do estado recolhido, então a
        expansão momentânea não muda o layout de nada.
      -->
      <aside
        v-if="temMenuDeSecao"
        class="group/menu relative hidden shrink-0 lg:block"
        :class="uiStore.menuDaSecaoRecolhido ? 'w-14' : 'w-52'"
        @mouseleave="hoverSuprimido = false"
      >
        <div
          class="absolute inset-y-0 left-0 z-20 flex flex-col overflow-y-auto border-r border-border bg-surface px-3 py-5 transition-brand transition-[width]"
          :class="
            !uiStore.menuDaSecaoRecolhido
              ? 'w-52'
              : menuExpandeNoHover
                ? 'w-14 group-hover/menu:w-52 group-hover/menu:bg-surface-elevated group-hover/menu:shadow-xl'
                : 'w-14'
          "
        >
          <AdminSectionMenu
            :grupos="menuDaSecao"
            variant="coluna"
            :compacto="uiStore.menuDaSecaoRecolhido"
            :hover-suprimido="hoverSuprimido"
          />

          <button
            type="button"
            class="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="uiStore.menuDaSecaoRecolhido && 'justify-center group-hover/menu:justify-start'"
            :aria-label="uiStore.menuDaSecaoRecolhido ? 'Expandir menu' : 'Recolher menu'"
            :aria-expanded="!uiStore.menuDaSecaoRecolhido"
            @click="alternarMenuDaSecao"
          >
            <Icon
              :name="
                uiStore.menuDaSecaoRecolhido ? 'lucide:panel-left-open' : 'lucide:panel-left-close'
              "
              class="h-4 w-4 shrink-0"
            />
            <span :class="uiStore.menuDaSecaoRecolhido && 'hidden group-hover/menu:inline'">
              Recolher menu
            </span>
          </button>
        </div>
      </aside>

      <!-- O scroller da tela. `overflow-y-auto` aqui (e não no documento) é o
           que torna a chrome imune à trava de scroll dos dropdowns. O padding
           inferior no celular libera a barra de abas fixa. -->
      <main class="min-w-0 flex-1 overflow-y-auto px-4 pt-5 pb-24 sm:px-6 lg:pt-7 lg:pb-8">
        <slot />
      </main>
    </div>

    <AdminBottomTabs :itens="navPrimaria" @sair="signOut" />
  </div>
</template>
