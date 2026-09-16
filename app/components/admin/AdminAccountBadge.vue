<!--
  Quem está logado, no cabeçalho — iniciais, nome e uma linha de contexto.

  Vive aqui, e não em cada layout, porque são três cascas com o mesmo bloco: o
  painel do casal (onde a legenda é o papel naquele casamento), a lista de
  eventos da conta e o painel interno da equipe. Escrito três vezes, as
  iniciais divergiriam na primeira mudança.

  Não existe nome de exibição no modelo (`membros_casamento` não tem coluna de
  nome), então o rótulo é a parte do e-mail antes do @ e o endereço completo
  fica no `title` e no leitor de tela. Nenhuma consulta nova: só o que a sessão
  já expõe.
-->
<script setup lang="ts">
interface Props {
  email: string
  /** Linha de baixo — o papel no casamento aberto, ou o contexto da tela. */
  legenda?: string
}

const { email } = defineProps<Props>()

const parteLocal = computed(() => email.split('@')[0] ?? '')
const nome = computed(() => parteLocal.value || 'Conta')

const iniciais = computed(() => {
  const letras = parteLocal.value
    .split(/[._-]+/)
    .map((parte) => parte.charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('')
  return letras || '·'
})
</script>

<template>
  <div class="flex items-center gap-2">
    <span
      class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted font-display text-xs font-semibold text-text"
      aria-hidden="true"
    >
      {{ iniciais }}
    </span>
    <div class="hidden leading-tight lg:block">
      <p class="max-w-40 truncate text-xs font-semibold text-text" :title="email">{{ nome }}</p>
      <p v-if="legenda" class="text-xs text-text-muted">{{ legenda }}</p>
    </div>
    <span class="sr-only">{{ email }}</span>
  </div>
</template>
