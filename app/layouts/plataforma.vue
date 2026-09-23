<script setup lang="ts">
// O painel INTERNO da equipe. Contexto próprio (docs/PLANO-SAAS.md, Passo 8):
// nunca reaproveita `layouts/admin.vue`, que chama `getWedding()`
// incondicionalmente — o que não faz sentido sem um casamento ativo.
//
// O que ele compartilha com o painel do casal é a linguagem, não o código: a
// mesma casca de altura fixa (quem rola é o <main>, nunca o documento), o
// mesmo cabeçalho de 56/64px, o mesmo escopo `.admin-ui` no <body>. Trocar de
// painel não deveria parecer trocar de produto.
//
// A cor vem de `.marca-da-plataforma` (app/assets/css/main.css), a mesma das
// outras telas em que nenhum evento está aberto — login e lista da conta.
// Dentro de `/admin/{slug}` a primária é a cor DAQUELE casamento; aqui não há
// casamento, então vale a do produto. Foi essa a padronização de 2026-09-16:
// antes o login usava o marrom que é só o default de um preset de casal.
//
// Nav primária: não existe, porque não há um segundo destino. Item de menu que
// promete e não entrega é pior que item ausente (mesma regra de
// `app/utils/admin-nav.ts`), e o dia em que houver dois assuntos aqui, a nav
// nasce com dois.
provide(ADMIN_UI_CONTEXT_KEY, true)

const authStore = useAuthStore()

useHead({
  // Mesma trava do painel do casal: com o shell em altura de tela, um
  // documento rolável por baixo dá dois eixos de rolagem competindo.
  htmlAttrs: { class: 'overflow-hidden' },
  // As duas juntas, e nesta ordem: `.marca-da-plataforma` é uma cor sobre a
  // linguagem do painel, nunca um substituto dela. No <body> porque todo modal
  // sai por `DialogPortal`, filho de <body> — fora de qualquer div do layout
  // (docs/DESIGN-SYSTEM.md).
  bodyAttrs: { class: 'admin-ui marca-da-plataforma' },
})

const email = computed(() => authStore.user?.email ?? '')

// O caminho de volta só aparece para quem tem para onde voltar: operador sem
// casamento próprio não tem painel de casal nenhum, e o link levaria a uma
// tela que o middleware devolve para cá.
const { proprios } = useMinhasMemberships()
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-surface">
    <header
      class="z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:h-16 lg:gap-4 lg:px-6"
    >
      <!-- A identidade aqui é a do PRODUTO, não a de um casamento: este painel
           olha todos eles, e nenhum está aberto. -->
      <NuxtLink
        to="/plataforma"
        class="shrink-0 rounded-lg transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <UiBrandMark legenda="Painel interno" />
      </NuxtLink>

      <div class="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
        <NuxtLink
          v-if="proprios.length"
          to="/admin"
          class="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:inline-flex"
        >
          <Icon name="lucide:heart" class="h-4 w-4" />
          Meus casamentos
        </NuxtLink>

        <AdminAccountMenu
          :email="email"
          legenda="Plataforma"
          class="lg:border-l lg:border-border lg:pl-3"
        />
      </div>
    </header>

    <!-- O scroller da tela, como no painel do casal: `overflow-y-auto` aqui, e
         não no documento, é o que torna o cabeçalho imune à trava de rolagem
         que os dropdowns do Reka aplicam ao <body>.

         O respiro de cima é do CONTEÚDO, nunca do scroller: `padding-top` num
         contêiner de rolagem entra no scrollport, e um `thead` com `top: 0`
         passa a grudar no fim desse padding — abrindo uma faixa de 28px em que
         as linhas rolam ACIMA do cabeçalho de colunas. Medido nesta tela: o
         cabeçalho grudava em 92px com o topo visível em 64px. Padding lateral
         pode ficar aqui; o de cima, não. -->
    <main class="min-w-0 flex-1 overflow-y-auto px-4 pb-10 sm:px-6">
      <!-- 7xl, e não 6xl: a listagem interna tem sete colunas de dado, e a
           largura extra é a diferença entre a tabela caber e a última coluna
           — a única que age — ficar fora da vista. -->
      <div class="mx-auto w-full max-w-7xl pt-5 lg:pt-7">
        <slot />
      </div>
    </main>
  </div>
</template>
