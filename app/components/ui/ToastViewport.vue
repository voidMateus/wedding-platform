<!--
  A pilha de toasts, ancorada no `app.vue` (fora de qualquer layout).

  `z-[60]` porque o modal do Reka (`UiModal`) é portalado para o `body` com
  `z-50`: empatado em 50, quem vem depois no DOM ganha — e o portal SEMPRE vem
  depois. O resultado era o aviso do erro aparecendo atrás da própria janela
  que o provocou.
-->
<script setup lang="ts">
const uiStore = useUiStore()
</script>

<template>
  <TransitionGroup
    tag="div"
    class="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
    enter-active-class="transition-brand"
    enter-from-class="opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-4"
    enter-to-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-active-class="transition-brand absolute"
    leave-from-class="opacity-100 translate-y-0 sm:translate-x-0"
    leave-to-class="opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-4"
  >
    <div
      v-for="toast in uiStore.toasts"
      :key="toast.id"
      class="pointer-events-auto w-full max-w-sm"
    >
      <UiToast
        :tone="toast.tone"
        :message="toast.message"
        @dismiss="uiStore.dismissToast(toast.id)"
      />
    </div>
  </TransitionGroup>
</template>
