<!--
  Primeiros passos — o roteiro do primeiro acesso (docs/fase4-onboarding.md 6).

  Três coisas que não são detalhe de desenho:

  1. Nenhum passo tem caixa de marcar. Quem marca é o FATO, e é por isso que
     este bloco pode se marcar sozinho enquanto a checklist do Planejamento não
     pode: aqui o passo e o fato são o mesmo objeto ("o local está cadastrado"
     não é indício de nada, é a coisa).

  2. O contador diz "3 de 7 concluídos", nunca um percentual. "43%" e "seu
     casamento está 43% pronto" são a mesma frase para quem lê rápido, e a
     segunda é mentira — o roteiro mede cadastro, não casamento.

  3. Cumprido mostra o VALOR, não um selo: "Espaço Villa Rosa" confirma que o
     sistema entendeu o que o casal quis dizer; "Concluído" só repete o ícone.

  O bloco some inteiro quando os sete terminam (e volta se um fato deixar de
  valer) — diferente do bloco do Planejamento, que fica para sempre porque
  acompanha um processo contínuo. Este fecha uma porta.
-->
<script setup lang="ts">
import { GRUPOS_DO_ROTEIRO } from '#shared/onboarding-passos'
import type { PassoResolvido, RoteiroDoOnboarding } from '#shared/onboarding-passos'

interface Props {
  roteiro: RoteiroDoOnboarding
  /** Valor já resolvido de cada passo cumprido, por id — ex.: `{ local: 'Espaço Villa Rosa' }`. */
  valores?: Partial<Record<string, string>>
}

const { roteiro, valores = {} } = defineProps<Props>()

const slug = useActiveWeddingSlug()
const base = computed(() => `/admin/${slug}`)

const grupos = computed(() =>
  GRUPOS_DO_ROTEIRO.map((grupo) => ({
    ...grupo,
    passos: roteiro.passos.filter((passo) => passo.grupo === grupo.id),
  })).filter((grupo) => grupo.passos.length > 0),
)

/**
 * Para onde a linha leva. Passo do wizard abre o wizard NAQUELA etapa — o
 * casal clicou naquilo, não em "começar do início".
 */
function destinoDoPasso(passo: PassoResolvido) {
  if (passo.noWizard) return `${base.value}/comecar?passo=${passo.id}`
  return `${base.value}${passo.destino ?? ''}`
}
</script>

<template>
  <AdminPanel v-if="!roteiro.completo">
    <div class="flex flex-col gap-4 p-5 sm:p-7">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="font-display text-lg font-semibold text-text">Primeiros passos</h2>
          <p class="mt-1 text-sm text-text-muted">
            Para o site ficar pronto e os módulos começarem a servir vocês.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-text-muted">
            {{ roteiro.concluidos }} de {{ roteiro.total }} concluídos
          </span>
          <UiButton v-if="roteiro.proximaEtapaDoWizard" size="sm" :to="`${base}/comecar`">
            Começar
          </UiButton>
        </div>
      </div>

      <div v-for="grupo in grupos" :key="grupo.id" class="flex flex-col gap-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {{ grupo.rotulo }}
        </p>

        <ul class="flex flex-col">
          <li v-for="passo in grupo.passos" :key="passo.id">
            <NuxtLink
              :to="destinoDoPasso(passo)"
              class="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface-muted/60"
            >
              <Icon
                :name="passo.concluido ? 'lucide:check-circle-2' : 'lucide:circle'"
                class="h-4 w-4 shrink-0"
                :class="passo.concluido ? 'text-success' : 'text-text-muted'"
                aria-hidden="true"
              />
              <span class="min-w-0 flex-1 truncate text-sm text-text">
                {{ passo.rotulo }}
                <span class="sr-only">
                  {{ passo.concluido ? '— concluído' : '— pendente' }}
                </span>
              </span>
              <span
                class="shrink-0 text-xs"
                :class="passo.concluido ? 'text-text-muted' : 'font-medium text-primary'"
              >
                <template v-if="passo.concluido">{{ valores[passo.id] ?? 'pronto' }}</template>
                <template v-else>{{ passo.acao }} →</template>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </AdminPanel>
</template>
