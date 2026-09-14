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

  O bloco some inteiro quando os quatro terminam (e volta se um fato deixar de
  valer) — diferente do bloco do Planejamento, que fica para sempre porque
  acompanha um processo contínuo. Este fecha uma porta.
-->
<script setup lang="ts">
import type { PassoResolvido, RoteiroDoOnboarding } from '#shared/onboarding-passos'

interface Props {
  roteiro: RoteiroDoOnboarding
  /** Valor já resolvido de cada passo cumprido, por id — ex.: `{ local: 'Espaço Villa Rosa' }`. */
  valores?: Partial<Record<string, string>>
  /**
   * Modo acolhimento: o painel não tem o que relatar, então ESTE bloco é a
   * tela. Ganha a saudação e o botão que nomeia o próximo passo; os blocos de
   * relatório do Início ficam de fora até existir gente na lista.
   */
  destaque?: boolean
  /** Só no modo destaque — "Ana & João". */
  nomesNoivos?: string
}

const { roteiro, valores = {}, destaque = false, nomesNoivos = '' } = defineProps<Props>()

/**
 * O que o casal tem aqui dentro, em uma linha cada.
 *
 * Só aparece no primeiro acesso, e é DESCRIÇÃO, não menu: nenhum item leva a
 * lugar nenhum. A nav do topo é por onde se explora; aqui a única ação é o
 * botão do próximo passo, porque quem acabou de chegar pediu para saber onde
 * olhar — e seis destinos concorrentes é o contrário de uma resposta.
 */
const O_QUE_TEM_AQUI = [
  {
    icone: 'lucide:globe',
    titulo: 'O site do casamento',
    texto:
      'A página que os convidados abrem: a história de vocês, o cronograma, o local no mapa e as fotos.',
  },
  {
    icone: 'lucide:users',
    titulo: 'Convidados e confirmações',
    texto: 'A lista, os convites com link e QR code, e quem já confirmou presença — sem planilha.',
  },
  {
    icone: 'lucide:gift',
    titulo: 'Lista de presentes',
    texto:
      'Os presentes que vocês querem, com contribuição em Pix caindo direto na conta de vocês.',
  },
  {
    icone: 'lucide:wallet',
    titulo: 'Financeiro',
    texto: 'Quanto vai custar, o que já foi contratado e o que vence este mês.',
  },
  {
    icone: 'lucide:list-checks',
    titulo: 'Planejamento',
    texto: 'A checklist do que fazer e quando, já sugerindo o que todo casamento precisa resolver.',
  },
  {
    icone: 'lucide:armchair',
    titulo: 'Mesas',
    texto: 'A planta do salão, para decidir quem senta com quem antes do dia.',
  },
] as const

const slug = useActiveWeddingSlug()
const base = computed(() => `/admin/${slug}`)

/**
 * Para onde a linha leva. Passo do wizard abre o wizard NAQUELA etapa — o
 * casal clicou naquilo, não em "começar do início".
 */
function destinoDoPasso(passo: PassoResolvido) {
  if (passo.noWizard) return `${base.value}/comecar?passo=${passo.id}`
  return `${base.value}${passo.destino ?? ''}`
}

/**
 * O botão principal do acolhimento nomeia PARA ONDE leva — "Começar pelo
 * horário do casamento", nunca um "Começar" solto. A primeira decisão que o
 * casal precisa tomar ao entrar não deveria ser adivinhar o que o botão faz.
 */
const proximo = computed(() => roteiro.proximoPasso)
</script>

<template>
  <AdminPanel v-if="!roteiro.completo">
    <div class="flex flex-col gap-4 p-5 sm:p-7">
      <!-- Acolhimento: o casal acabou de chegar e o painel não tem o que
           relatar, então este bloco É a tela. A saudação some sozinha no
           instante em que existir alguém na lista — quem já está trabalhando
           não precisa ser recebido de novo. -->
      <div v-if="destaque" class="flex flex-col gap-6 border-b border-border pb-6">
        <div class="flex flex-col gap-2">
          <h2 class="font-display text-2xl font-semibold text-text sm:text-3xl">
            Bem-vindos<template v-if="nomesNoivos">, {{ nomesNoivos }}</template>
          </h2>
          <p class="max-w-2xl text-sm leading-relaxed text-text-muted">
            Este é o painel de vocês — o lugar onde o casamento inteiro se organiza, do primeiro
            convidado ao último pagamento. Sem planilha solta, sem PDF perdido no e-mail e sem
            "quanto mesmo a gente já pagou nisso?".
          </p>
        </div>

        <!-- Descrição, não menu: nenhum item é link. Quem acabou de chegar
             pediu para saber onde olhar, e seis destinos concorrentes é o
             contrário de uma resposta — a única ação da tela é o botão do
             próximo passo, lá embaixo. -->
        <div class="flex flex-col gap-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
            O que vocês têm aqui
          </p>
          <ul class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <li v-for="item in O_QUE_TEM_AQUI" :key="item.titulo" class="flex gap-3">
              <Icon
                :name="item.icone"
                class="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium text-text">{{ item.titulo }}</p>
                <p class="mt-0.5 text-xs leading-relaxed text-text-muted">{{ item.texto }}</p>
              </div>
            </li>
          </ul>
        </div>

        <div class="flex flex-col gap-2 rounded-md bg-surface-muted/50 px-4 py-3">
          <p class="text-sm font-medium text-text">
            O site de vocês começa vazio — e é de propósito
          </p>
          <p class="text-sm leading-relaxed text-text-muted">
            Por enquanto ele mostra só a capa: os nomes de vocês, a data e a contagem regressiva.
            Cada seção — a história, o cronograma, a lista de presentes, a confirmação de presença —
            entra no site quando vocês quiserem, em
            <NuxtLink
              :to="`${base}/configuracoes?secao=ordem`"
              class="font-medium text-primary underline-offset-4 hover:underline"
            >
              Configurações › Seções do site</NuxtLink
            >.
          </p>
        </div>

        <p class="max-w-2xl text-sm leading-relaxed text-text">
          Comece pelos primeiros passos abaixo — são quatro, e é só o básico do básico. Nada aqui é
          definitivo: data, local, aparência e a decisão de publicar mudam quando vocês quiserem.
        </p>
      </div>

      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="font-display text-lg font-semibold text-text">Primeiros passos</h2>
          <p v-if="!destaque" class="mt-1 text-sm text-text-muted">
            Para o site ficar pronto e os módulos começarem a servir vocês.
          </p>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-xs font-medium text-text-muted">
            {{ roteiro.concluidos }} de {{ roteiro.total }} concluídos
          </span>
          <UiButton
            v-if="!destaque && roteiro.proximaEtapaDoWizard"
            size="sm"
            :to="`${base}/comecar`"
          >
            Começar
          </UiButton>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <ul class="flex flex-col">
          <li v-for="passo in roteiro.passos" :key="passo.id">
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

      <UiButton v-if="destaque && proximo" :to="destinoDoPasso(proximo)" class="self-start">
        Começar {{ proximo.chamada }}
        <Icon name="lucide:arrow-right" class="h-4 w-4" aria-hidden="true" />
      </UiButton>
    </div>
  </AdminPanel>
</template>
