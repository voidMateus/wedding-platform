<!--
  Menu da seção Convidados — a coluna contextual que fica ao lado da tela,
  abaixo da navegação principal do admin (que segue na sidebar do layout).

  Existe porque Convidados deixou de ser uma tela e passou a ser uma seção com
  duas formas de trabalhar (Visão organizada e Modo lista) mais o que orbita a
  lista. Enfiar isso na navegação principal misturaria "onde estou no painel"
  com "como estou olhando a lista", que são perguntas diferentes.

  Abaixo de `lg` vira uma fileira rolável na horizontal, e não um segundo
  drawer: dois drawers na mesma tela disputariam o mesmo gesto.
-->
<script setup lang="ts">
interface Props {
  slug: string
}

const { slug } = defineProps<Props>()

const route = useRoute()

interface ItemDeMenu {
  to: string
  label: string
  icon: string
  /** Casamento exato do caminho — para o item que é a raiz da seção. */
  exact?: boolean
}

interface GrupoDeMenu {
  label: string
  itens: ItemDeMenu[]
}

const grupos = computed<GrupoDeMenu[]>(() => {
  const base = `/admin/${slug}`
  return [
    {
      label: 'Convidados',
      itens: [
        // `exact` porque `/convidados` é prefixo de `/convidados/lista`: sem
        // isso os dois acendem ao mesmo tempo e o menu deixa de dizer onde a
        // pessoa está.
        {
          to: `${base}/convidados`,
          label: 'Visão organizada',
          icon: 'lucide:users',
          exact: true,
        },
        { to: `${base}/convidados/lista`, label: 'Modo lista', icon: 'lucide:table-2' },
        // Importar e exportar são ações, não uma tela — o destino é a Visão
        // organizada com o importador aberto. É o mesmo padrão de modal
        // governado pela URL que o cadastro de convidado já usa; sem um alvo
        // de verdade, o item de menu seria decoração.
        {
          to: `${base}/convidados?importar=1`,
          label: 'Importar / Exportar',
          icon: 'lucide:arrow-down-up',
        },
      ],
    },
    {
      label: 'Gerenciar',
      itens: [{ to: `${base}/grupos`, label: 'Grupos', icon: 'lucide:users-round' }],
    },
  ]
})

function estaAtivo(item: ItemDeMenu): boolean {
  const caminho = item.to.split('?')[0] ?? item.to
  // Item com query só acende quando a query está de fato aplicada: "Importar /
  // Exportar" não pode ficar aceso na Visão organizada sem importador aberto.
  if (item.to.includes('?importar=1')) {
    return route.path === caminho && route.query.importar === '1'
  }
  if (item.exact) return route.path === caminho && route.query.importar !== '1'
  return route.path.startsWith(caminho)
}
</script>

<template>
  <nav aria-label="Seção de convidados" class="shrink-0 lg:w-52">
    <!-- Rolagem horizontal só onde a coluna não cabe; do `lg` pra cima é uma
         pilha normal. -->
    <div
      class="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      <div v-for="grupo in grupos" :key="grupo.label" class="flex flex-col gap-1">
        <p
          class="hidden px-3 text-xs font-semibold uppercase tracking-wide text-text-muted lg:block"
        >
          {{ grupo.label }}
        </p>
        <div class="flex gap-1 lg:flex-col">
          <NuxtLink
            v-for="item in grupo.itens"
            :key="item.to"
            :to="item.to"
            :aria-current="estaAtivo(item) ? 'page' : undefined"
            class="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            :class="
              estaAtivo(item)
                ? 'bg-surface-muted font-medium text-text'
                : 'text-text-muted hover:bg-surface-muted hover:text-text'
            "
          >
            <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
            <span class="truncate">{{ item.label }}</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </nav>
</template>
