<script setup lang="ts">
// Botão flutuante "voltar ao topo" — pedido do usuário: a home ficou longa
// (9 seções) e rolar de volta manualmente até o Hero é incômodo. Pequeno e
// discreto (não uma sidebar fixa) — só aparece depois que o Hero sai da
// tela, some de volta perto do topo.
const SHOW_AFTER_PX = 480

const isVisible = ref(false)

function handleScroll() {
  isVisible.value = window.scrollY > SHOW_AFTER_PX
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 translate-y-2 scale-90"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 translate-y-2 scale-90"
  >
    <button
      v-if="isVisible"
      type="button"
      aria-label="Voltar ao topo"
      class="shadow-glow-primary fixed bottom-6 right-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      @click="scrollToTop"
    >
      <Icon name="lucide:arrow-up" class="h-5 w-5" />
    </button>
  </Transition>
</template>
