<!--
  A nav primária do desktop, no cabeçalho: os destinos do painel, lado a lado.

  Sai da barra lateral porque ali dividia espaço com o menu da seção, e as duas
  coisas respondem perguntas diferentes ("onde estou" contra "como estou
  olhando"). Com as duas na mesma coluna, trocar a forma de ver a lista parecia
  trocar de área do sistema.

  Só do `lg` pra cima: no celular quem carrega estes destinos é a barra de abas
  inferior (`AdminBottomTabs`), que é o alcance do polegar.
-->
<script setup lang="ts">
import { ehItemAtivo, type AdminNavItem } from '~/utils/admin-nav'

interface Props {
  itens: readonly AdminNavItem[]
}

const { itens } = defineProps<Props>()

const route = useRoute()

function ativo(item: AdminNavItem): boolean {
  return ehItemAtivo(item, { path: route.path, query: route.query })
}
</script>

<template>
  <nav aria-label="Seções do painel" class="hidden items-center gap-0.5 lg:flex">
    <NuxtLink
      v-for="item in itens"
      :key="item.label"
      :to="item.to"
      :aria-current="ativo(item) ? 'page' : undefined"
      :title="item.label"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="
        ativo(item)
          ? 'bg-surface-muted font-medium text-text'
          : 'text-text-muted hover:bg-surface-muted hover:text-text'
      "
    >
      <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
      <span class="hidden xl:inline">{{ item.label }}</span>
    </NuxtLink>
  </nav>
</template>
