<script setup lang="ts">
import { onKeyStroke } from '@vueuse/core'

// Navegação por âncora (Fase Editorial) — curada deliberadamente (não um
// link por seção; 13 seções num menu seriam ruído visual, contrário ao
// "luxo discreto" pedido). Links usam caminho absoluto com hash ("/#id"),
// não só "#id", para funcionar também a partir de /presentes e /rsvp/[code]
// (mesmo layout, CLAUDE.md seção 5), navegando de volta para "/" e rolando
// até a seção. Exceção: "Confirmar Presença" vai direto pra rota /rsvp (a
// busca por nome), não pra âncora — mesmo racional/menos cliques já
// aplicado ao atalho equivalente do Hero (shared/hero-buttons.ts).
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
   * Id do atalho em destaque do Hero (config_tema.heroFeaturedButton) —
   * o link correspondente do menu ganha o mesmo destaque visual, pedido
   * do usuário ("o menu tem o destaque sincronizado com o botão do
   * hero"). Resolvido pelo layout, não aqui (mesmo racional dos outros
   * props vindos de useRoute()/dados já carregados).
   */
  featuredButtonId?: string
  /**
   * `config_tema.hiddenSections` — seções desligadas pelo casal. O menu filtra
   * por elas pelo mesmo motivo do Hero: âncora para seção que não existe na
   * página é um link que não faz nada quando clicado.
   */
  hiddenSections?: string[]
  /**
   * Caminho da rota atual (`route.path`), resolvido pelo layout. Alimenta o
   * `aria-current` dos links — ver isCurrent().
   */
  currentPath?: string
  /**
   * Arte própria do monograma (config_tema.monogramImageUrl), quando existe —
   * o PublicMonogram cai nas iniciais do casal sem ela. Resolvido pelo
   * layout, como os demais props vindos de dados já carregados.
   */
  monogramImageUrl?: string | null
}

const {
  coupleNames,
  slug,
  code,
  featuredButtonId,
  monogramImageUrl,
  hiddenSections = [],
  currentPath,
} = defineProps<Props>()

// "/{slug}/presentes" fica de fora da lista de texto — vira um CTA
// destacado (UiButton, formato pill) tanto no menu desktop quanto no topo
// do drawer mobile, mesmo papel do botão "Presentear" do concorrente:
// sempre visível, sempre a ação com mais destaque visual da navegação. A
// lista de presentes tem página própria dedicada (não fica mais embutida na
// home como vitrine completa — só um teaser lá, ver GiftsShowcaseSection) —
// pensada para escalar quando a lista crescer bastante (ex.: 100+ itens).
// `id` casa com o id do catálogo de atalhos do Hero (shared/hero-buttons.ts)
// — usado só para sincronizar o destaque, não pra navegação.
// Ordem casa exatamente com a ordem das seções na home (index.vue) — Hero
// → Boas-vindas → Nossa História → O Grande Dia → Dress Code → Manual dos
// Convidados → Confirme sua Presença → Presentes → FAQ → Nossos Momentos.
// Dress Code/Presentes/FAQ ficam fora do menu por curadoria deliberada
// (ver comentário abaixo), mas os que entram seguem a sequência real.
const NAV_LINKS = computed(() =>
  [
    // `id` é sempre o id da seção no catálogo (shared/home-sections.ts) — é o
    // que faz o filtro de ocultas e o destaque sincronizado com o Hero
    // encontrarem o link certo. 'cronograma'/'galeria' eram os ids antigos do
    // catálogo de atalhos, antes de ele ser unificado com o de seções.
    { id: 'historia', to: `/${slug}/#historia`, label: 'Nossa História' },
    { id: 'grande-dia', to: `/${slug}/#grande-dia`, label: 'O Grande Dia' },
    { id: 'manual-convidados', to: `/${slug}/#manual-convidados`, label: 'Manual do Convidado' },
    { id: 'confirmar-presenca', to: `/${slug}/rsvp`, label: 'Confirmar Presença' },
    { id: 'nossos-momentos', to: `/${slug}/#nossos-momentos`, label: 'Nossos Momentos' },
  ].filter((link) => !hiddenSections.includes(link.id)),
)

const homeLink = computed(() => `/${slug}`)

// Preserva ?code= na navegação real para /presentes — diferente de uma
// âncora na mesma página, trocar de rota sem isso perderia a autorização de
// reservar/contribuir.
const giftsLink = computed(() => `/${slug}/presentes${code ? `?code=${code}` : ''}`)

const isMobileMenuOpen = ref(false)
// Liga o botão ao painel que ele controla (aria-controls). Gerado, não fixo:
// o layout público pode aparecer mais de uma vez numa mesma árvore em teste.
const mobileMenuId = useId()

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

// Esc fecha o menu — é o gesto que qualquer pessoa espera de um painel
// sobreposto, e sem ele quem navega por teclado fica preso tendo que tabular
// até o botão de fechar.
onKeyStroke('Escape', () => {
  if (isMobileMenuOpen.value) closeMobileMenu()
})

/**
 * Marca o link da rota que o convidado está vendo. `aria-current="page"` é o
 * que um leitor de tela anuncia como "página atual" — o destaque visual
 * sozinho não diz nada para quem não vê a tela.
 *
 * Compara só o caminho, sem o hash: as âncoras da home apontam todas para o
 * mesmo documento, e acompanhar qual seção está em vista exigiria observar a
 * rolagem, que é outro problema.
 *
 * O caminho vem por prop, não de `useRoute()` aqui dentro, pelo mesmo motivo
 * dos demais: chamar o composable de rota neste componente exige app Nuxt
 * completo no mount e derruba as catorze suítes que o montam com
 * @vue/test-utils puro.
 */
function isCurrent(to: string): boolean {
  if (!currentPath) return false
  const path = (to.split('#')[0] ?? '').replace(/\/+$/, '')
  return path !== '' && currentPath.replace(/\/+$/, '') === path
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
    <nav
      aria-label="Navegação principal"
      class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3"
    >
      <!--
        Monograma + nome, na mesma linha: a marca do convite passa a assinar
        também a navegação (Fase Rebrand do Convite). O monograma é
        aria-hidden e o nome continua sendo o texto acessível do link — quem
        usa leitor de tela ouve o nome do casal, não duas iniciais soltas.
        Some abaixo do sm para não disputar largura com o botão do menu.
      -->
      <NuxtLink
        :to="homeLink"
        class="flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap font-display text-lg font-semibold text-heading"
        @click="closeMobileMenu"
      >
        <PublicMonogram
          v-if="coupleNames"
          :couple-names="coupleNames"
          :image-url="monogramImageUrl"
          size="sm"
          class="hidden sm:inline-flex"
        />
        {{ coupleNames || 'MeuSiteCasamento' }}
      </NuxtLink>

      <div class="hidden items-center gap-1 text-sm lg:flex">
        <NuxtLink
          v-for="link in NAV_LINKS"
          :key="link.to"
          :to="link.to"
          :aria-current="isCurrent(link.to) ? 'page' : undefined"
          class="shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 transition-all duration-200 hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            link.id === featuredButtonId
              ? 'bg-secondary/10 font-semibold text-primary'
              : 'text-text-muted'
          "
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
        :aria-expanded="isMobileMenuOpen"
        :aria-controls="mobileMenuId"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
      >
        <Icon :name="isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-5 w-5" />
      </button>
    </nav>
  </header>

  <!--
    Teleport pro <body>: o header tem backdrop-blur, e backdrop-filter cria
    um novo "containing block" pra descendentes fixed (mesmo efeito de
    transform/filter/perspective) — o drawer, como filho do <header>, tinha
    seu `fixed inset-y-0` resolvido contra a caixa do header (~68px) em vez
    do viewport inteiro, ficando espremido e "vazando" o conteúdo por trás
    (achado real, celular). Teleportar escapa completamente desse contexto.
  -->
  <Teleport to="body">
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-40 bg-black/40 lg:hidden"
      aria-hidden="true"
      @click="closeMobileMenu"
    />
    <!--
      `inert` fechado: o painel continua no DOM (é o que permite a transição de
      deslize), e sem isso seus links seguem focáveis fora da tela — tabular na
      home levava o foco para um menu invisível. `aria-hidden` sozinho esconde
      do leitor de tela mas não tira da ordem de foco.
    -->
    <div
      :id="mobileMenuId"
      class="fixed inset-y-0 right-0 z-50 flex w-64 flex-col gap-1 overflow-y-auto border-l border-border bg-surface p-4 shadow-lg transition-transform duration-200 lg:hidden"
      :class="isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'"
      :aria-hidden="!isMobileMenuOpen"
      :inert="!isMobileMenuOpen || undefined"
    >
      <!-- `size="lg"` (48px) e não o padrão de 40px: é o CTA principal do menu
           no celular, onde a área de toque mínima de 44px vale de fato. -->
      <UiButton
        :to="giftsLink"
        rounded="full"
        size="lg"
        class="mb-2 w-full"
        @click="closeMobileMenu"
      >
        <Icon name="lucide:gift" class="h-4 w-4" />
        Presentear
      </UiButton>
      <NuxtLink
        v-for="link in NAV_LINKS"
        :key="link.to"
        :to="link.to"
        :aria-current="isCurrent(link.to) ? 'page' : undefined"
        class="flex min-h-11 items-center rounded-md px-3 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="link.id === featuredButtonId ? 'font-semibold text-primary' : 'text-text'"
        @click="closeMobileMenu"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </Teleport>
</template>
