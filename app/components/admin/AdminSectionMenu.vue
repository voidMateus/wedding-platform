<!--
  O menu da seção atual — "como estou olhando esta parte", em oposição à nav
  primária, que diz onde estou no painel.

  Dois desenhos para os mesmos dados, escolhidos pelo `variant`:

  - `coluna`: a barra lateral do desktop, com os rótulos de grupo em caixa alta.
    Com `compacto`, fica só a trilha de ícones — e os rótulos voltam enquanto o
    ponteiro está sobre a barra (`group-hover/menu`), sem precisar reexpandir de
    propósito: recolher é para ganhar largura, não para perder o mapa.
  - `fileira`: no celular, uma fileira rolável na horizontal logo abaixo do
    cabeçalho. Não é drawer de propósito — trocar entre "Visão organizada" e
    "Modo lista" é o gesto mais repetido da seção, e sepultá-lo atrás de um
    menu custaria dois toques a cada troca. Os rótulos de grupo somem aqui: a
    fileira já é curta, e caixa alta repetida viraria ruído.

  Item sem `to` aparece e não navega (ver `admin-nav.ts`): mostrar o que vem
  por aí é melhor que esconder, mas ele nunca finge ser um link.
-->
<script setup lang="ts">
import { destinoDoItem, ehItemAtivo, type AdminMenuGroup } from '~/utils/admin-nav'

interface Props {
  grupos: readonly AdminMenuGroup[]
  variant: 'coluna' | 'fileira'
  /** Só ícones, com os rótulos aparecendo no hover da barra. Só faz sentido em `coluna`. */
  compacto?: boolean
  /**
   * Desliga a volta dos rótulos no hover. O layout liga isso logo depois de
   * recolher, enquanto o ponteiro ainda está sobre a barra — sem isso o clique
   * em "Recolher menu" pareceria não ter feito nada.
   */
  hoverSuprimido?: boolean
}

const { grupos, variant, compacto = false, hoverSuprimido = false } = defineProps<Props>()

/** Classe que devolve o rótulo no hover — vazia quando a expansão está suprimida. */
const classeDoRotuloCompacto = computed(() =>
  hoverSuprimido ? 'hidden' : 'hidden group-hover/menu:inline',
)

const route = useRoute()

const emit = defineEmits<{ navegou: [] }>()

function ativo(item: Parameters<typeof ehItemAtivo>[0]): boolean {
  return ehItemAtivo(item, { path: route.path, query: route.query })
}
</script>

<template>
  <nav
    aria-label="Seção atual"
    :class="variant === 'coluna' ? 'flex flex-col gap-5' : 'flex gap-1.5 overflow-x-auto px-4 pb-2'"
  >
    <div
      v-for="grupo in grupos"
      :key="grupo.label"
      :class="variant === 'coluna' ? 'flex flex-col gap-1' : 'flex shrink-0 gap-1.5'"
    >
      <p
        v-if="variant === 'coluna'"
        class="px-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-text-muted"
        :class="compacto && (hoverSuprimido ? 'hidden' : 'hidden group-hover/menu:block')"
      >
        {{ grupo.label }}
      </p>

      <template v-for="item in grupo.itens" :key="item.label">
        <NuxtLink
          v-if="item.to"
          :to="destinoDoItem(item)"
          :aria-current="ativo(item) ? 'page' : undefined"
          class="flex shrink-0 items-center gap-2.5 rounded-lg transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="[
            variant === 'coluna' ? 'px-3 py-2 text-sm' : 'whitespace-nowrap px-3 py-1.5 text-xs',
            ativo(item)
              ? 'bg-surface-muted font-medium text-text'
              : 'text-text-muted hover:bg-surface-muted hover:text-text',
            variant === 'fileira' && !ativo(item) && 'border border-border',
            compacto && 'justify-center group-hover/menu:justify-start',
          ]"
          @click="emit('navegou')"
        >
          <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
          <span :class="[variant === 'coluna' && 'truncate', compacto && classeDoRotuloCompacto]">
            {{ item.label }}
          </span>
        </NuxtLink>

        <span
          v-else
          :title="compacto ? `${item.label} — ${item.indisponivel}` : item.indisponivel"
          class="flex shrink-0 cursor-default items-center gap-2.5 rounded-lg text-text-muted/60"
          :class="[
            variant === 'coluna' ? 'px-3 py-2 text-sm' : 'whitespace-nowrap px-3 py-1.5 text-xs',
            compacto && 'justify-center group-hover/menu:justify-start',
          ]"
        >
          <Icon :name="item.icon" class="h-4 w-4 shrink-0" />
          <span :class="[variant === 'coluna' && 'truncate', compacto && classeDoRotuloCompacto]">
            {{ item.label }}
          </span>
          <!-- Não renderizado no modo compacto: ao lado do ícone do item ele
               virava um segundo glifo na mesma linha, e a trilha recolhida
               ficava com dois ícones amontoados por linha. O motivo continua
               no `title` do item, e o tom esmaecido já sinaliza que não navega. -->
          <Icon
            v-if="!compacto"
            name="lucide:lock"
            class="h-3 w-3 shrink-0"
            :aria-label="item.indisponivel"
          />
        </span>
      </template>
    </div>
  </nav>
</template>
