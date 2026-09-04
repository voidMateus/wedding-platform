<!--
  Barra de salvamento flutuante da aba. Fica DENTRO do `<form>` (o botão é um
  submit nativo, então não precisa de ponte de evento até o formulário) e
  cada aba tem a sua, com o próprio rótulo de ação e o próprio estado de
  "sujo" vindo do VeeValidate — em vez de uma barra única na página, que
  teria de adivinhar qual formulário submeter.

  Só aparece quando há alteração pendente: sem nada para salvar, uma barra
  permanente ocupa a base da tela sem oferecer ação nenhuma. Ela acompanha a
  rolagem (`sticky bottom-4`) e é o último filho do formulário, então a
  posição estática já é o fim do formulário e o sticky só a puxa para cima
  enquanto o fim ainda está abaixo do viewport — exatamente o comportamento
  de "acompanhar a tela". Isso depende de nenhum ancestral ser contêiner de
  rolagem: ver a nota sobre `overflow-x` em `app/assets/css/main.css`.
-->
<script setup lang="ts">
interface Props {
  /** Rótulo do botão — específico por aba ("Salvar dados do evento"). */
  action: string
  /** `meta.dirty` do formulário da aba. */
  dirty: boolean
  submitting: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  /** Volta o formulário aos valores atualmente salvos no servidor. */
  discard: []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition-brand"
    enter-from-class="translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-brand"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-2 opacity-0"
  >
    <div
      v-if="dirty || submitting"
      class="sticky bottom-4 z-10 flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-surface-elevated/95 px-3 py-3 shadow-lg backdrop-blur sm:px-4"
    >
      <p class="flex min-w-0 items-center gap-2 text-xs text-text-muted">
        <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <span class="truncate">Alterações não salvas nesta aba.</span>
      </p>
      <div class="flex shrink-0 items-center gap-2">
        <UiButton type="button" variant="ghost" :disabled="submitting" @click="emit('discard')">
          Descartar
        </UiButton>
        <UiButton type="submit" :disabled="submitting">
          {{ submitting ? 'Salvando...' : action }}
        </UiButton>
      </div>
    </div>
  </Transition>
</template>
