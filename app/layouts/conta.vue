<script setup lang="ts">
// A casca de quem está logado e ainda não está DENTRO de um evento: hoje, a
// lista "Seus casamentos".
//
// Layout próprio, e não mais o do login: aquela caixa de 384px existe para um
// formulário de duas linhas, e listar eventos dentro dela dava cartões
// espremidos numa coluna estreita com o resto da tela vazio. E não é o layout
// do painel: sem casamento ativo não há nav primária, menu de seção nem barra
// de abas — a casca aqui é só cabeçalho e conteúdo.
//
// Mesma linguagem do painel (`admin-ui` no <body>, cinza e Sora/Manrope), mesma
// altura de cabeçalho: entrar num evento a partir daqui não deve parecer trocar
// de produto. E a mesma cor do login e do painel interno
// (`marca-da-plataforma`): nenhum evento está aberto aqui, então vale a cor do
// produto — a do casamento só entra dentro de `/admin/{slug}`.
provide(ADMIN_UI_CONTEXT_KEY, true)

const authStore = useAuthStore()

useHead({ bodyAttrs: { class: 'admin-ui marca-da-plataforma' } })

const email = computed(() => authStore.user?.email ?? '')
</script>

<template>
  <div class="flex min-h-screen flex-col bg-surface">
    <header
      class="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur lg:h-16 lg:px-6"
    >
      <!-- A marca do produto, e não a de um casamento: é a única casca da
           conta em que nenhum evento está aberto. -->
      <UiBrandMark class="shrink-0" />

      <div class="ml-auto flex shrink-0 items-center gap-2 lg:gap-3">
        <!-- Sem `conta-href`: a tela de senha vive nas Configurações de um
             casamento, e aqui nenhum evento está aberto. -->
        <AdminAccountMenu :email="email" class="lg:border-l lg:border-border lg:pl-3" />
      </div>
    </header>

    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
      <slot />
    </main>
  </div>
</template>
