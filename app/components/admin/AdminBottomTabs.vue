<!--
  A navegação primária do celular: barra de abas fixa no rodapé.

  Rodapé, e não drawer atrás de um hambúrguer, porque é onde o polegar alcança
  — num painel que o casal abre no sofá, trocar de área é o gesto mais repetido
  da sessão, e escondê-lo atrás de dois toques (abrir o menu, escolher) é o que
  faz uma tela "não ter sido pensada para o celular".

  Quatro abas mais "Mais": acima de cinco alvos a barra deixa de ser tocável com
  precisão numa tela de 390px. Quem define quais quatro é a ordem de
  importância em `adminPrimaryNav` — a barra não escolhe, ela corta.

  A área segura do iOS entra via `env(safe-area-inset-bottom)`: sem isso a
  última fileira de alvos fica sob a barra de gestos do sistema.
-->
<script setup lang="ts">
import { ehItemAtivo, type AdminNavItem } from '~/utils/admin-nav'

interface Props {
  itens: readonly AdminNavItem[]
}

const { itens } = defineProps<Props>()

const emit = defineEmits<{ sair: [] }>()

const route = useRoute()

/** Cinco alvos no máximo: quatro destinos e o "Mais". */
const ABAS_VISIVEIS = 4

const abas = computed(() => itens.slice(0, ABAS_VISIVEIS))
const restantes = computed(() => itens.slice(ABAS_VISIVEIS))

const isSheetOpen = ref(false)

function ativo(item: AdminNavItem): boolean {
  return ehItemAtivo(item, { path: route.path, query: route.query })
}

/** "Mais" acende quando o destino atual está dentro dele. */
const maisAtivo = computed(() => restantes.value.some((item) => ativo(item)))

// Fecha ao navegar: sem isso o painel continuaria aberto sobre a tela nova.
watch(
  () => route.fullPath,
  () => (isSheetOpen.value = false),
)
</script>

<template>
  <nav
    aria-label="Seções do painel"
    class="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
  >
    <ul class="grid grid-cols-5">
      <li v-for="item in abas" :key="item.label">
        <NuxtLink
          :to="item.to"
          :aria-current="ativo(item) ? 'page' : undefined"
          class="flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          :class="ativo(item) ? 'font-medium text-primary' : 'text-text-muted'"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0" />
          <span class="max-w-full truncate">{{ item.label }}</span>
        </NuxtLink>
      </li>

      <li>
        <button
          type="button"
          :aria-expanded="isSheetOpen"
          class="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[0.6875rem] transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
          :class="maisAtivo ? 'font-medium text-primary' : 'text-text-muted'"
          @click="isSheetOpen = true"
        >
          <Icon name="lucide:ellipsis" class="h-5 w-5 shrink-0" />
          <span>Mais</span>
        </button>
      </li>
    </ul>

    <UiModal v-model="isSheetOpen" title="Mais">
      <div class="flex flex-col">
        <NuxtLink
          v-for="item in restantes"
          :key="item.label"
          :to="item.to"
          :aria-current="ativo(item) ? 'page' : undefined"
          class="flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="ativo(item) ? 'font-medium text-text' : 'text-text-muted'"
        >
          <Icon :name="item.icon" class="h-5 w-5 shrink-0" />
          {{ item.label }}
        </NuxtLink>

        <!-- Sair fica aqui no celular: é ação de conta, e no cabeçalho
             disputaria os poucos alvos de toque do topo com a identidade do
             casamento. -->
        <button
          type="button"
          class="mt-1 flex min-h-12 items-center gap-3 rounded-lg border-t border-border px-2 pt-2 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          @click="emit('sair')"
        >
          <Icon name="lucide:log-out" class="h-5 w-5 shrink-0" />
          Sair
        </button>
      </div>
    </UiModal>
  </nav>
</template>
