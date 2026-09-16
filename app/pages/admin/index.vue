<script setup lang="ts">
import { rotuloDoPapel } from '#shared/papeis-de-membro'
import { formatDatePtBR } from '#shared/utils/format-date'
import { monogramaDoCasal } from '#shared/utils/nomes-casal'

// Landing pós-login do painel administrativo (docs/PLANO-SAAS.md, Passo 3).
// app/middleware/auth.global.ts já redireciona direto pro casamento único
// quando há exatamente uma membership — esta página só é de fato exibida
// com zero ou mais de uma, e cobre os dois casos.
//
// Desde a Fase 5 do Hub ela deixou de ser um desempate e virou a casa de quem
// administra vários eventos (docs/fase5-multievento.md 5.3). Continua LISTA:
// nome, data, status e papel. Nenhum número de convidado, dinheiro ou RSVP —
// cada um deles seria uma consulta por casamento para responder uma pergunta
// que esta tela não faz.
//
// Layout `conta` (e não mais o do login): a caixa estreita do formulário
// espremia os cartões numa coluna de 384px com a tela inteira vazia ao redor.
definePageMeta({ layout: 'conta' })

const authStore = useAuthStore()

if (!authStore.user) {
  await authStore.fetchSession()
}

const hoje = new Date().toISOString().slice(0, 10)

// Só os casamentos DELE. Acesso de suporte da plataforma a um evento de
// cliente não é posse (docs/fase5-multievento.md 6.7), e listá-lo aqui dizia
// ao operador que quatro casamentos de clientes eram "seus".
const { proprios } = useMinhasMemberships()
const casamentos = computed(() => sortWeddingsByEvent(proprios.value, hoje))

/**
 * O dado de apoio da linha é um só, escolhido pelo que a data significa: o que
 * ainda vem tem contagem regressiva, o que passou tem a data e nada mais.
 * Mostrar "faltam -412 dias" seria um número plausível e errado.
 */
function faltaLabel(dataEvento: string): string {
  const dias = Math.ceil(
    (new Date(`${dataEvento}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) /
      86_400_000,
  )

  if (dias > 1) return `faltam ${dias} dias`
  if (dias === 1) return 'é amanhã'
  if (dias === 0) return 'é hoje'
  return ''
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div v-if="authStore.loading" class="flex flex-col gap-3">
      <UiSkeleton v-for="n in 2" :key="n" class="h-20 w-full" />
    </div>

    <UiEmptyState
      v-else-if="casamentos.length === 0"
      icon="lucide:heart-crack"
      title="Nenhum casamento vinculado"
      description="Sua conta ainda não está vinculada a nenhum casamento. Fale com quem administra o seu evento."
    />

    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-display text-2xl font-semibold text-text">Seus casamentos</h1>
          <p class="mt-1 text-sm text-text-muted">
            {{
              casamentos.length === 1
                ? '1 evento nesta conta.'
                : `${casamentos.length} eventos nesta conta.`
            }}
          </p>
        </div>

        <!-- O caminho até o painel interno só existe aqui para quem é operador
             e TAMBÉM tem casamentos próprios: quem não tem nenhum já cai
             direto em /plataforma pelo middleware, e sem este link ficaria
             dependendo de digitar a URL. -->
        <NuxtLink
          v-if="authStore.isPlatformOperator"
          to="/plataforma"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-muted transition-brand hover:bg-surface-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Icon name="lucide:life-buoy" class="h-4 w-4" />
          Painel interno
        </NuxtLink>
      </div>

      <ul class="flex flex-col gap-3">
        <li v-for="membership in casamentos" :key="membership.weddingId">
          <NuxtLink
            :to="`/admin/${membership.slug}`"
            class="group flex items-center gap-4 rounded-lg border border-border bg-surface-elevated px-4 py-3.5 transition-brand hover:border-primary hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <!-- O mesmo disco de monograma do cabeçalho do painel: entrar num
                 evento daqui leva exatamente a ele, e a peça repetida é o que
                 diz isso antes de o clique acontecer. -->
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-text font-display text-sm font-semibold text-surface-elevated"
              aria-hidden="true"
            >
              {{ monogramaDoCasal(membership.nomesNoivos) }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-base font-semibold text-text">
                {{ membership.nomesNoivos }}
              </p>
              <p class="mt-0.5 truncate text-xs text-text-muted">
                {{ formatDatePtBR(membership.dataEvento) }}
                <template v-if="faltaLabel(membership.dataEvento)">
                  · {{ faltaLabel(membership.dataEvento) }}
                </template>
                · {{ rotuloDoPapel(membership.role) }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-3">
              <UiBadge :tone="weddingLifecyclePresentation(membership.statusCicloVida).tone">
                {{ weddingLifecyclePresentation(membership.statusCicloVida).label }}
              </UiBadge>
              <Icon
                name="lucide:chevron-right"
                class="h-5 w-5 shrink-0 text-text-muted transition-brand group-hover:text-primary"
              />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </template>
  </div>
</template>
