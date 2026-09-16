<!--
  A troca de evento, no bloco de identidade do cabeçalho
  (docs/fase5-multievento.md 5.1).

  Só existe quando há mais de uma membership. Com uma só, o layout renderiza o
  mesmo bloco como um `NuxtLink` simples — sem seta, sem menu, sem afordância
  que leve a lugar nenhum. É a mesma regra que a tela de seleção já segue: ela
  aparece com zero ou mais de um casamento, nunca com exatamente um.

  Trocar é NAVEGAR: o destino é `/admin/{slug}` e nada mais. O middleware já
  sincroniza o cookie `casamento_ativo` com o slug da URL, e as chaves de cache
  já carregam o slug, então não há estado a limpar nem `refresh` a disparar.
-->
<script setup lang="ts">
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'reka-ui'
import { formatDatePtBR } from '#shared/utils/format-date'
import type { WeddingMembership } from '~/types/auth'

interface Props {
  /** Todos os casamentos administrados, já na ordem da lista de eventos. */
  memberships: readonly WeddingMembership[]
  activeSlug: string
  monograma: string
  nomesNoivos: string
  dataLabel: string
  /**
   * True quando o casamento aberto é de um CLIENTE, por acesso de suporte da
   * plataforma (docs/fase5-multievento.md 6.7) — o menu então oferece a volta
   * para o painel interno, que é a casa de quem entrou assim.
   */
  emSuporte?: boolean
}

const {
  memberships,
  activeSlug,
  monograma,
  nomesNoivos,
  dataLabel,
  emSuporte = false,
} = defineProps<Props>()

const outros = computed(() => memberships.filter((m) => m.slug !== activeSlug))
</script>

<template>
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      :aria-label="`Casamento ativo: ${nomesNoivos}. Trocar de evento`"
      class="flex shrink-0 items-center gap-2.5 rounded-lg transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-surface-muted"
    >
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-text font-display text-xs font-semibold text-surface-elevated"
        aria-hidden="true"
      >
        {{ monograma }}
      </span>
      <span class="min-w-0 leading-tight text-left">
        <span class="block truncate font-display text-sm font-semibold text-text">
          {{ nomesNoivos }}
        </span>
        <span class="hidden truncate text-xs text-text-muted sm:block">{{ dataLabel }}</span>
      </span>
      <Icon name="lucide:chevrons-up-down" class="h-4 w-4 shrink-0 text-text-muted" />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        align="start"
        :side-offset="6"
        class="z-60 min-w-64 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
      >
        <p
          v-if="outros.length"
          class="px-2.5 py-1.5 text-xs font-semibold tracking-wide text-text-muted uppercase"
        >
          Trocar de evento
        </p>

        <DropdownMenuItem
          v-for="membership in outros"
          :key="membership.weddingId"
          as-child
          class="cursor-pointer rounded-md outline-none transition-brand data-[highlighted]:bg-surface-muted"
        >
          <NuxtLink :to="`/admin/${membership.slug}`" class="block px-2.5 py-2">
            <span class="block truncate text-sm font-medium text-text">
              {{ membership.nomesNoivos }}
            </span>
            <span class="block truncate text-xs text-text-muted">
              {{ formatDatePtBR(membership.dataEvento) }}
            </span>
          </NuxtLink>
        </DropdownMenuItem>

        <DropdownMenuSeparator v-if="outros.length" class="my-1 h-px bg-border" />

        <DropdownMenuItem
          v-if="emSuporte"
          as-child
          class="cursor-pointer rounded-md outline-none transition-brand data-[highlighted]:bg-surface-muted"
        >
          <NuxtLink to="/plataforma" class="flex items-center gap-2 px-2.5 py-2 text-sm text-text">
            <Icon name="lucide:life-buoy" class="h-4 w-4 shrink-0" />
            Sair do painel do cliente
          </NuxtLink>
        </DropdownMenuItem>

        <DropdownMenuItem
          v-else
          as-child
          class="cursor-pointer rounded-md outline-none transition-brand data-[highlighted]:bg-surface-muted"
        >
          <NuxtLink to="/admin" class="flex items-center gap-2 px-2.5 py-2 text-sm text-text">
            <Icon name="lucide:layout-grid" class="h-4 w-4 shrink-0" />
            Ver todos os casamentos
          </NuxtLink>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
