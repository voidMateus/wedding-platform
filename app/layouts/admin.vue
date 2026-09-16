<script setup lang="ts">
import { rotuloDoPapel } from '#shared/papeis-de-membro'
import { monogramaDoCasal } from '#shared/utils/nomes-casal'
import { hojeNoFusoDoEvento } from '#shared/utils/orcamento'
import { diasAteOEvento, rotuloDaContagem } from '#shared/utils/planejamento'
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
  // A trava de rolagem fica em <html>, NÃO em <body> (corrigido em 2026-09-13).
  // `main.css` declara `overflow-x: hidden` no html, o que faz o `overflow-y`
  // dele computar `auto` e torna o HTML o contêiner de rolagem do viewport —
  // daí o overflow do body deixar de propagar para lá: ele recortava só o
  // conteúdo do próprio body, e elemento absoluto/fixo ancorado no bloco
  // contêiner inicial continuava esticando a área de rolagem do html (foi
  // assim que 196 rótulos `sr-only` esticaram o documento para 5646px).
  //
  // Só o admin: o shell tem altura de tela e quem rola é o <main>, então o
  // documento não deveria rolar — sem travar, ele ainda rolava (medido:
  // `document.scrollTop` ia a 708 num clique). Documento rolável por baixo de
  // um app shell dá dois eixos de rolagem competindo, e é o de fora que o
  // navegador move quando precisa revelar um elemento focado. Sair do painel
  // devolve a rolagem sozinho: `useHead` de um layout é desfeito ao desmontar.
  // `admin-ui` no BODY, e nao na div do shell: todo modal da plataforma sai por
  // `DialogPortal`, que renderiza como filho de <body> -- fora da div. Variavel
  // CSS herda pela arvore do DOM, entao com o escopo la dentro os modais do
  // painel caiam nos tokens do site publico: creme no lugar do cinza, borda tan
  // e Playfair/Inter no lugar de Sora/Manrope. No body, o portal herda igual ao
  // resto do painel.
  htmlAttrs: { class: 'overflow-hidden' },
  bodyAttrs: { class: 'admin-ui' },
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

/**
 * Quanto falta para o casamento, ao lado da data.
 *
 * A data sozinha obriga a fazer a conta de cabeça, e é ela que dá escala a tudo
 * o que o painel mostra: "faltam 291 dias" muda o peso de uma tarefa vencida e
 * de uma parcela a vencer sem que nenhuma das duas telas precise repetir o
 * número. Some depois do casamento — contagem regressiva de evento passado não
 * informa, cobra (`rotuloDaContagem`).
 *
 * `hoje` é recalculado a cada navegação porque o painel é uma SPA que fica
 * aberta por horas: sem isso, quem abriu antes da meia-noite leria o dia
 * anterior até recarregar a página.
 */
const hoje = ref(hojeNoFusoDoEvento())
watch(
  () => route.path,
  () => {
    hoje.value = hojeNoFusoDoEvento()
  },
)

const contagemRegressiva = computed(() =>
  rotuloDaContagem(diasAteOEvento(wedding.value?.data_evento ?? null, hoje.value)),
)

/**
 * A data com a contagem junto, numa string só.
 *
 * Existe porque o mesmo texto tem DOIS donos desde a Fase 5: o `<NuxtLink>` de
 * quem tem um casamento e o `AdminWeddingSwitcher` de quem tem vários. Montar
 * a contagem só no template do link faria ela sumir exatamente para quem tem
 * mais de um evento — some em silêncio, que é o pior jeito de sumir.
 */
const rotuloDaDataComContagem = computed(() =>
  contagemRegressiva.value
    ? `${weddingDateLabel.value} · ${contagemRegressiva.value}`
    : weddingDateLabel.value,
)

const monograma = computed(() => monogramaDoCasal(wedding.value?.nomes_noivos))

// Quem está logado — o desenho do bloco vive em `AdminAccountBadge`, que as
// três cascas da conta compartilham (painel do casal, lista de eventos e
// painel interno).
const operatorEmail = computed(() => authStore.user?.email ?? '')
// Derivado da rota sobre as memberships, nunca lido de um estado que
// sobrevive à troca de evento (docs/fase5-multievento.md 5.2): quem é dono de
// um casamento e colaborador de outro via "Dono" nos dois.
const membershipAtiva = useActiveMembership()

// A troca de evento no cabeçalho só existe com mais de um casamento
// (docs/fase5-multievento.md 5.1). `hoje` local, não do servidor: a ordem é
// uma preferência de leitura da tela, não um cálculo de negócio.
// Só os casamentos do próprio operador aparecem na troca: um acesso de suporte
// é a porta de entrada no evento de um cliente, não um item da coleção dele
// (docs/fase5-multievento.md 6.7).
const { proprios } = useMinhasMemberships()
const casamentosOrdenados = computed(() =>
  sortWeddingsByEvent(proprios.value, new Date().toISOString().slice(0, 10)),
)

/**
 * Dentro do painel de um cliente, o menu existe mesmo com um casamento próprio
 * só — ou nenhum: sem ele, quem entrou para dar suporte fica sem saída visível
 * e depende do botão voltar do navegador.
 */
const emSuporte = computed(() => membershipAtiva.value?.acessoDeSuporte === true)
const temMaisDeUmCasamento = computed(() => proprios.value.length > 1 || emSuporte.value)
const operatorRoleLabel = computed(() =>
  membershipAtiva.value ? rotuloDoPapel(membershipAtiva.value.role) : '',
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
           (uma conta pode ter mais de um).

           Com mais de uma membership o mesmo bloco vira a troca de evento
           (docs/fase5-multievento.md 5.1); com uma só continua sendo um link,
           sem menu que abriria vazio. -->
      <AdminWeddingSwitcher
        v-if="temMaisDeUmCasamento"
        :memberships="casamentosOrdenados"
        :active-slug="activeSlug"
        :monograma="monograma"
        :nomes-noivos="wedding?.nomes_noivos ?? ''"
        :data-label="rotuloDaDataComContagem"
        :em-suporte="emSuporte"
      />
      <NuxtLink
        v-else
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
            {{ rotuloDaDataComContagem }}
          </span>
        </span>
      </NuxtLink>

      <AdminPrimaryNav :itens="navPrimaria" class="mx-auto shrink-0" />

      <div class="ml-auto flex shrink-0 items-center gap-2 lg:ml-0 lg:gap-3">
        <AdminAccountBadge
          :email="operatorEmail"
          :legenda="operatorRoleLabel"
          class="lg:border-l lg:border-border lg:pl-3"
        />

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
      <AdminSectionMenu :grupos="menuDaSecao" variant="fileira" class="no-print" />
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

    <AdminBottomTabs :itens="navPrimaria" class="no-print" @sair="signOut" />
  </div>
</template>
