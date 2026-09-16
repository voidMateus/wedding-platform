<script setup lang="ts">
// A porta de entrada, e a única tela do produto que alguém encontra sem estar
// logado. Duas colunas porque ela é uma fronteira: à esquerda a MARCA, na
// linguagem do convite (creme, serifada, filete) — que é o que a pessoa
// reconhece de fora —, à direita a FERRAMENTA, na linguagem do painel (cinza,
// Sora/Manrope), que é onde ela está entrando. Entrar é literalmente atravessar
// da esquerda para a direita.
//
// `admin-ui` no <body> pelo mesmo motivo de `layouts/admin.vue`: é o escopo
// que vale para o documento inteiro, inclusive para o que sair por portal. A
// coluna da marca desfaz esse escopo com `.superficie-do-convite`
// (app/assets/css/main.css) — o mesmo mecanismo da prévia de tema.
//
// `marca-da-plataforma` acompanha: a cor aqui é a do PRODUTO, e ela é a mesma
// da lista de eventos e do painel interno. Antes esta tela caía no
// `--color-primary` do `@theme`, que é o marrom do preset "Clássico Elegante"
// — o produto pegava emprestada a cor de um tema de casal, e a porta de
// entrada acabava de uma cor e o painel interno de outra.
//
// Sem `provide(ADMIN_UI_CONTEXT_KEY)`: o lift de hover dos botões é ruído numa
// tela com dezenas deles, e aqui existem dois.
useHead({ bodyAttrs: { class: 'admin-ui marca-da-plataforma' } })
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface lg:flex-row">
    <!-- No celular vira uma faixa curta no topo: a marca continua sendo a
         primeira coisa que se vê, sem comer a tela do formulário. -->
    <aside
      class="superficie-do-convite flex shrink-0 items-center border-b border-border bg-surface px-6 py-7 lg:w-[42%] lg:border-r lg:border-b-0 lg:px-12 lg:py-16"
    >
      <div
        class="mx-auto flex w-full max-w-md flex-col items-center gap-6 text-center lg:items-start lg:text-left"
      >
        <UiBrandMark tamanho="lg" />

        <UiSectionDivider class="hidden lg:block" />

        <p class="hidden font-display text-2xl leading-snug text-balance text-text lg:block">
          O casamento inteiro organizado num lugar só.
        </p>
        <p class="hidden text-sm leading-relaxed text-text-muted lg:block">
          A lista de convidados, as confirmações, o orçamento, os presentes e o site que os seus
          convidados visitam.
        </p>
      </div>
    </aside>

    <main class="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:py-16">
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </main>
  </div>
</template>
