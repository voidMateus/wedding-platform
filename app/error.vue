<script setup lang="ts">
import type { NuxtError } from '#app'

interface Props {
  error: NuxtError
}

const { error } = defineProps<Props>()

const route = useRoute()

const naoEncontrado = computed(() => error.statusCode === 404)

// Erro dentro do painel volta pro painel, não pra raiz pública: /admin já tem
// a landing que resolve o casamento certo, enquanto "/" só explica que o
// acesso do convidado é pelo link do casal.
const contextoInterno = computed(
  () => route.path.startsWith('/admin') || route.path.startsWith('/plataforma'),
)

const titulo = computed(() => (naoEncontrado.value ? 'Página não encontrada' : 'Algo deu errado'))

const descricao = computed(() => {
  if (naoEncontrado.value) {
    return contextoInterno.value
      ? 'Este endereço do painel não existe ou mudou. Volte e navegue pelo menu lateral.'
      : 'O endereço que você abriu não existe. Confira o link que você recebeu do casal.'
  }
  return 'Tivemos um problema para carregar esta página. Tente de novo em alguns instantes.'
})

const rotuloAcao = computed(() => (contextoInterno.value ? 'Voltar ao painel' : 'Voltar ao início'))

useSeoMeta({
  title: `${titulo.value} — MeuSiteCasamento`,
  robots: 'noindex, nofollow',
})

function voltar(): void {
  clearError({ redirect: contextoInterno.value ? '/admin' : '/' })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-surface-muted px-4">
    <div
      class="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center shadow-sm"
    >
      <div
        class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-text-muted"
      >
        <Icon
          :name="naoEncontrado ? 'lucide:map-pin-off' : 'lucide:triangle-alert'"
          class="h-6 w-6"
        />
      </div>

      <p class="text-sm font-medium text-text-muted">{{ error.statusCode }}</p>
      <h1 class="mt-1 text-lg font-semibold text-text">{{ titulo }}</h1>
      <p class="mt-2 text-sm text-text-muted">{{ descricao }}</p>

      <div class="mt-6">
        <UiButton @click="voltar">{{ rotuloAcao }}</UiButton>
      </div>
    </div>
  </div>
</template>
