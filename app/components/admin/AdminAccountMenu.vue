<!--
  Quem está logado, no cabeçalho — e o que dá para fazer com a própria conta.

  Vive aqui, e não em cada layout, porque são três cascas com o mesmo bloco: o
  painel do casal (onde a legenda é o papel naquele casamento), a lista de
  eventos da conta e o painel interno da equipe. Escrito três vezes, as
  iniciais divergiriam na primeira mudança.

  Era só um selo, com "Sair" num botão de ícone ao lado — e a tela de Senha
  ficava a três cliques, dentro de Configurações. Virou menu porque é onde todo
  mundo procura conta (rodada de usabilidade de 20/09/2026, observado no
  primeiro uso da Fase B): o bloco de identidade É o caminho da conta, e ter
  "Sair" solto ao lado dele duplicava o mesmo assunto em dois controles.

  Não existe nome de exibição no modelo (`membros_casamento` não tem coluna de
  nome), então o rótulo é a parte do e-mail antes do @ e o endereço completo
  aparece no topo do menu. Nenhuma consulta nova: só o que a sessão já expõe.
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

interface Props {
  email: string
  /** Linha de baixo — o papel no casamento aberto, ou o contexto da tela. */
  legenda?: string
  /**
   * Destino da tela de conta (hoje, a senha).
   *
   * Opcional porque ela mora dentro das Configurações de um casamento, e as
   * outras duas cascas não têm evento aberto: ali o menu fica só com "Sair",
   * em vez de oferecer um link que não existe.
   */
  contaHref?: string
}

const { email } = defineProps<Props>()

const { signOut } = useAuth()

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
  <DropdownMenuRoot>
    <DropdownMenuTrigger
      :aria-label="`Conta: ${email}`"
      class="flex items-center gap-2 rounded-lg p-1 transition-brand hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[state=open]:bg-surface-muted"
    >
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-muted font-display text-xs font-semibold text-text"
        aria-hidden="true"
      >
        {{ iniciais }}
      </span>
      <span class="hidden min-w-0 text-left leading-tight lg:block">
        <span class="block max-w-40 truncate text-xs font-semibold text-text">{{ nome }}</span>
        <span v-if="legenda" class="block text-xs text-text-muted">{{ legenda }}</span>
      </span>
      <Icon
        name="lucide:chevron-down"
        class="hidden h-4 w-4 shrink-0 text-text-muted lg:block"
        aria-hidden="true"
      />
    </DropdownMenuTrigger>

    <DropdownMenuPortal>
      <DropdownMenuContent
        align="end"
        :side-offset="6"
        class="z-60 min-w-56 rounded-lg border border-border bg-surface-elevated p-1 shadow-lg"
      >
        <!-- O e-mail inteiro, porque o gatilho mostra só a parte antes do @ —
             e é ele que responde "com qual conta eu estou aqui?", a pergunta
             que traz a maioria das pessoas a este menu. -->
        <p class="px-2.5 py-2 text-xs leading-tight break-all text-text-muted">{{ email }}</p>

        <DropdownMenuSeparator class="my-1 h-px bg-border" />

        <DropdownMenuItem
          v-if="contaHref"
          as-child
          class="cursor-pointer rounded-md outline-none transition-brand data-[highlighted]:bg-surface-muted"
        >
          <NuxtLink :to="contaHref" class="flex items-center gap-2 px-2.5 py-2 text-sm text-text">
            <Icon name="lucide:lock" class="h-4 w-4 shrink-0" aria-hidden="true" />
            Senha
          </NuxtLink>
        </DropdownMenuItem>

        <DropdownMenuItem
          class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text outline-none transition-brand data-[highlighted]:bg-surface-muted"
          @select="signOut"
        >
          <Icon name="lucide:log-out" class="h-4 w-4 shrink-0" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
