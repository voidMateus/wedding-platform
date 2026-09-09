<!--
  O cabeçalho da seção Convidados — o MESMO nas duas visões (organizada e Modo
  lista).

  Compartilhado, e não duplicado, por dois motivos: as duas telas mostram o
  mesmo cadastro, então um cabeçalho diferente em cada uma sugeriria que são
  áreas diferentes do sistema; e com marcação própria em cada página, altura,
  ordem dos controles e rótulos divergiriam na primeira mudança — trocar de
  visão passaria a "pular".

  Os contadores NÃO ficam aqui: como faixa própria, ocupavam uma fileira
  inteira e tiravam o destaque da lista. Eles vivem no cabeçalho do painel da
  tabela (`GuestListCounters`), dividindo a linha do "N exibidas".
-->
<script setup lang="ts">
interface Props {
  slug: string
  busca: string
  exportando?: boolean
}

const { slug, busca, exportando = false } = defineProps<Props>()

const emit = defineEmits<{
  'update:busca': [valor: string]
  adicionar: []
  exportar: []
}>()

const route = useRoute()

const emModoLista = computed(() => route.path.endsWith('/convidados/lista'))
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <!-- `tracking-tight` porque Sora é geométrica: no tamanho de display o
             espacejamento padrão dela abre demais e o título perde o bloco.
             Sem serifada aqui — a decisão de manter o admin em sans continua
             valendo (uma tela de dados não pede a emoção da serifada); a
             hierarquia vem de escala, peso e espaço. -->
        <h1 class="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl">
          Lista de convidados
        </h1>
        <p class="mt-1.5 max-w-md text-sm leading-relaxed text-text-muted">
          Monte a lista, organize em grupos e acompanhe as confirmações.
        </p>
      </div>

      <!-- Escondido abaixo de `lg`: ali o menu da seção já é uma fileira com as
           duas visões logo acima, e repetir empilharia dois controles idênticos
           em cima da lista. -->
      <div class="hidden shrink-0 rounded-lg border border-border p-0.5 lg:flex">
        <NuxtLink
          :to="`/admin/${slug}/convidados`"
          class="rounded-md px-3 py-1.5 text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            emModoLista
              ? 'text-text-muted hover:text-text'
              : 'bg-primary font-medium text-primary-foreground'
          "
        >
          Visão Geral
        </NuxtLink>
        <NuxtLink
          :to="`/admin/${slug}/convidados/lista`"
          class="rounded-md px-3 py-1.5 text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="
            emModoLista
              ? 'bg-primary font-medium text-primary-foreground'
              : 'text-text-muted hover:text-text'
          "
        >
          Modo lista
        </NuxtLink>
      </div>
    </div>

    <!-- Buscar e acrescentar à esquerda, levar dados para fora à direita. No
         celular empilha em largura cheia: alvo de toque antes de densidade. -->
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
      <UiInput
        :model-value="busca"
        icon="lucide:search"
        tone="muted"
        aria-label="Buscar convidado por nome"
        placeholder="Digite um nome..."
        class="w-full sm:max-w-sm"
        @update:model-value="emit('update:busca', $event)"
      />
      <UiButton class="w-full sm:w-auto" @click="emit('adicionar')">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar convidado
      </UiButton>

      <div class="flex gap-2 sm:ml-auto">
        <!-- Chega na fase da entrada rápida; desabilitado com o motivo, nunca
             escondido — o casal precisa saber que a capacidade está prevista. -->
        <UiButton
          variant="ghost"
          class="flex-1 sm:flex-none"
          disabled
          title="Em breve — colar várias linhas do Excel de uma vez."
        >
          <Icon name="lucide:clipboard-paste" class="h-4 w-4" />
          Colar do Excel
        </UiButton>
        <UiButton
          variant="ghost"
          class="flex-1 sm:flex-none"
          :disabled="exportando"
          @click="emit('exportar')"
        >
          <Icon name="lucide:download" class="h-4 w-4" />
          {{ exportando ? 'Exportando...' : 'Exportar' }}
        </UiButton>
      </div>
    </div>
  </div>
</template>
