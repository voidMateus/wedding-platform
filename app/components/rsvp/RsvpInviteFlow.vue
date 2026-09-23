<!--
  O fluxo de confirmação — uma pessoa por vez.

  É a tela mais importante do site e a mais antiga do produto: foi desenhada
  antes de existirem acompanhantes, núcleos, faixas etárias e mesas. Ela
  mostrava TODAS as pessoas do convite na mesma dobra, cada uma com um par de
  botões, e no celular isso vira uma parede de botões iguais em que o "Revisar
  e enviar" aparece antes de o convidado entender o que está respondendo
  (rodada de usabilidade de 20/09/2026, ponto 25).

  **Uma pessoa por vez, e não só no celular.** O relatório descreve o problema
  no celular, mas duas formas de interação para o MESMO fluxo — lista no
  desktop, passo a passo no celular — significariam escolher a forma por
  largura de tela: ou renderizando as duas (peso dobrado na tela mais crítica
  do produto) ou decidindo no cliente, que sob SSR diverge entre as duas
  passagens de render. O passo a passo serve os dois tamanhos, e a etapa de
  revisão devolve a visão do conjunto que a lista dava.

  **O estado nunca é só cor.** "Estarei lá" selecionado era um botão preenchido
  e nada mais: quem não distingue as cores, ou quem voltou à tela depois,
  precisava interpretar o preenchimento. Agora cada pessoa carrega o estado por
  extenso, aqui e na revisão.

  **Restrição alimentar não entra**: ela saiu da API em 2026-09-04 e não existe
  mais no produto. O plano da rodada a menciona porque foi escrito olhando a
  tela, não o schema.
-->
<script setup lang="ts">
import { diaLocal } from '#shared/utils/data-de-envio'
import type { RsvpInvitePayload, RsvpMember } from '~/types/rsvp'

interface Props {
  payload: RsvpInvitePayload
}

const props = defineProps<Props>()
// 'back' — volta para a etapa anterior do fluxo (busca), não para o site: só
// a primeira pessoa emite, e o parent (rsvp/index.vue) decide o que "etapa
// anterior" significa ali.
const emit = defineEmits<{ back: [] }>()
const { autosaveGuestStatus, finalizeInvite } = useRsvp()
const toast = useToast()
const slug = useWeddingSlug()
const backToSiteLink = computed(() => `/${slug}`)

interface GuestState {
  guestId: string
  fullName: string
  partyId: string | null
  status: 'pendente' | 'confirmado' | 'recusado'
}

const guestStates = ref<GuestState[]>(
  props.payload.members.map((m) => ({
    guestId: m.guestId,
    fullName: m.fullName,
    partyId: m.partyId,
    // `lista_espera` é decisão do casal, não resposta do convidado: para ele a
    // pergunta segue aberta. (`removido` saía daqui também, e foi aposentado do
    // vocabulário em 2026-09-10 por ser valor morto.)
    status: m.status === 'lista_espera' ? 'pendente' : m.status,
  })),
)

const isPastDeadline = props.payload.isPastDeadline
const passo = ref<'pessoas' | 'revisao' | 'enviado'>('pessoas')
const indice = ref(0)

const total = computed(() => guestStates.value.length)
const atual = computed(() => guestStates.value[indice.value] ?? null)

/**
 * Quem mais veio no mesmo núcleo de Acompanhantes.
 *
 * O agrupamento visual em cartões se perdeu com o passo a passo, e a
 * informação não podia se perder junto: "convidado com quem" é o que explica
 * por que aquelas pessoas estão no mesmo convite.
 */
const acompanhaNoNucleo = computed(() => {
  const pessoa = atual.value
  if (!pessoa?.partyId) return []
  return (
    agruparMembrosPorNucleo(guestStates.value)
      .find((bloco) => bloco.membros.some((m) => m.guestId === pessoa.guestId))
      ?.membros.filter((m) => m.guestId !== pessoa.guestId)
      .map((m) => m.fullName) ?? []
  )
})

const respondidas = computed(() => guestStates.value.filter((g) => g.status !== 'pendente').length)
const allAnswered = computed(() => guestStates.value.every((g) => g.status !== 'pendente'))

/**
 * Quantos dias faltam para o prazo — só quando ele está perto.
 *
 * Longe, a data é ruído; vencido, a tela inteira já muda. É na última semana
 * que a informação muda o comportamento de quem abriu o link e ia deixar para
 * depois.
 */
const DIAS_PARA_AVISAR_DO_PRAZO = 7
const diasAteOPrazo = computed(() => {
  const prazo = props.payload.wedding.rsvpDeadline
  if (!prazo || isPastDeadline) return null

  const hoje = new Date(`${diaLocal()}T00:00:00`)
  const limite = new Date(prazo)
  const dias = Math.ceil((limite.getTime() - hoje.getTime()) / 86_400_000)

  return dias >= 0 && dias <= DIAS_PARA_AVISAR_DO_PRAZO ? dias : null
})

function statusLabel(status: RsvpMember['status'] | GuestState['status']): string {
  if (status === 'confirmado') return 'Estará lá'
  if (status === 'recusado') return 'Não poderá ir'
  return 'Falta responder'
}

function irPara(posicao: number) {
  indice.value = Math.max(0, Math.min(total.value - 1, posicao))
  passo.value = 'pessoas'
}

async function responder(status: 'confirmado' | 'recusado') {
  const pessoa = atual.value
  if (!pessoa || isPastDeadline) return

  pessoa.status = status

  // Avança antes de esperar a rede: a resposta já está na tela, e segurar o
  // passo até o servidor confirmar faria o convidado tocar duas vezes num
  // 3G ruim — que é exatamente onde esta tela é usada.
  const eraAUltima = indice.value >= total.value - 1
  if (eraAUltima) passo.value = allAnswered.value ? 'revisao' : 'pessoas'
  else indice.value += 1

  try {
    await autosaveGuestStatus(pessoa.guestId, { status })
  } catch {
    toast.error('Não foi possível salvar. Tente novamente.')
  }
}

// --- acompanhante avulso (só modo_lista_convidados='aberta') ---

interface CompanionDraft {
  fullName: string
}

const companions = ref<CompanionDraft[]>([])
const canAddCompanion = computed(
  () =>
    props.payload.maxCompanions === null || companions.value.length < props.payload.maxCompanions,
)

function addCompanion() {
  if (!canAddCompanion.value) return
  companions.value.push({ fullName: '' })
}
function removeCompanion(index: number) {
  companions.value.splice(index, 1)
}

const message = ref(props.payload.message ?? '')

const isSubmitting = ref(false)
async function handleFinalize() {
  isSubmitting.value = true
  try {
    await finalizeInvite(props.payload.inviteId, {
      companions: companions.value
        .filter((c) => c.fullName.trim())
        .map((c) => ({ nomeCompleto: c.fullName })),
      message: message.value,
    })
    passo.value = 'enviado'
  } catch {
    toast.error('Não foi possível enviar. Tente novamente.')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <button
      v-if="passo === 'pessoas' && indice === 0"
      type="button"
      class="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
      @click="emit('back')"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Voltar à busca
    </button>

    <p
      v-if="isPastDeadline"
      class="rounded-md border border-border bg-surface-muted p-4 text-sm text-text-muted"
    >
      O prazo para confirmar presença já encerrou. Sua última resposta registrada continua abaixo,
      mas não é mais possível alterá-la.
    </p>

    <!-- O prazo só aparece perto do fim, e diz o que fazer com a informação. -->
    <p
      v-else-if="diasAteOPrazo !== null"
      class="rounded-md border border-border bg-surface-muted p-4 text-sm text-text"
    >
      <template v-if="diasAteOPrazo === 0">Hoje é o último dia para confirmar.</template>
      <template v-else-if="diasAteOPrazo === 1">Falta 1 dia para o prazo de confirmação.</template>
      <template v-else>Faltam {{ diasAteOPrazo }} dias para o prazo de confirmação.</template>
    </p>

    <template v-if="passo === 'pessoas' && atual">
      <!-- O progresso é anunciado: quem navega por leitor de tela precisa saber
           que a tela trocou de pessoa, e o nome sozinho não diz onde se está. -->
      <div class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-sm font-medium text-text" aria-live="polite">
            {{ indice + 1 }} de {{ total }}
          </span>
          <span class="text-xs text-text-muted">{{ respondidas }} de {{ total }} respondidas</span>
        </div>
        <div class="h-1.5 overflow-hidden rounded-full bg-surface-muted">
          <div
            class="h-full rounded-full bg-primary transition-brand"
            :style="{ width: `${total ? (respondidas / total) * 100 : 0}%` }"
          />
        </div>
      </div>

      <div
        class="flex flex-col gap-5 rounded-lg border border-border bg-surface-elevated p-5 shadow-sm"
      >
        <div class="flex flex-col gap-1">
          <p class="font-display text-2xl font-semibold text-heading">{{ atual.fullName }}</p>
          <p v-if="acompanhaNoNucleo.length" class="text-sm text-text-muted">
            Convidado com {{ acompanhaNoNucleo.join(', ') }}
          </p>
          <!-- O estado por extenso, e não só o botão preenchido. -->
          <p v-if="atual.status !== 'pendente'" class="text-sm font-medium text-text">
            Resposta: {{ statusLabel(atual.status) }}
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row">
          <!-- O nome entra no rótulo acessível, depois do texto visível (WCAG
               2.5.3): "Estarei lá" repetido não diz de quem, e o nome logo
               acima resolve isso só para quem enxerga. -->
          <UiButton
            type="button"
            size="lg"
            class="flex-1 whitespace-nowrap"
            rounded="full"
            :aria-label="`Estarei lá — ${atual.fullName}`"
            :aria-pressed="atual.status === 'confirmado'"
            :variant="atual.status === 'confirmado' ? 'primary' : 'outline'"
            :disabled="isPastDeadline"
            @click="responder('confirmado')"
          >
            <Icon name="lucide:check" class="h-4 w-4" />
            Estarei lá
          </UiButton>
          <UiButton
            type="button"
            size="lg"
            class="flex-1 whitespace-nowrap"
            rounded="full"
            variant="outline"
            :aria-label="`Não poderei ir — ${atual.fullName}`"
            :aria-pressed="atual.status === 'recusado'"
            :class="atual.status === 'recusado' ? '!border-text !bg-text !text-surface' : ''"
            :disabled="isPastDeadline"
            @click="responder('recusado')"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
            Não poderei ir
          </UiButton>
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <UiButton v-if="indice > 0" type="button" variant="ghost" @click="irPara(indice - 1)">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          Anterior
        </UiButton>
        <span v-else />

        <UiButton
          v-if="indice < total - 1"
          type="button"
          variant="ghost"
          @click="irPara(indice + 1)"
        >
          {{ atual.status === 'pendente' ? 'Responder depois' : 'Próxima' }}
          <Icon name="lucide:arrow-right" class="h-4 w-4" />
        </UiButton>
        <UiButton
          v-else
          type="button"
          :disabled="!allAnswered || isPastDeadline"
          :title="allAnswered ? undefined : 'Falta responder por alguém do convite.'"
          @click="passo = 'revisao'"
        >
          Revisar e enviar
        </UiButton>
      </div>

      <!-- O atalho de quem voltou para mudar UMA resposta: sem ele, seria
           preciso percorrer o convite inteiro de novo. -->
      <UiButton
        v-if="allAnswered && indice < total - 1"
        type="button"
        variant="ghost"
        :disabled="isPastDeadline"
        @click="passo = 'revisao'"
      >
        Ir para a revisão
      </UiButton>
    </template>

    <template v-else-if="passo === 'revisao'">
      <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface-elevated p-5">
        <p class="font-display text-lg font-semibold text-heading">O que vai ser enviado</p>
        <div
          v-for="(guest, posicao) in guestStates"
          :key="guest.guestId"
          class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-sm last:border-0 last:pb-0"
        >
          <span class="text-text">{{ guest.fullName }}</span>
          <span class="flex items-center gap-3">
            <!-- Era `confirmado ? success : danger`, então pendente, em espera e
                 removido todos apareciam em vermelho para o convidado. -->
            <UiBadge :tone="rsvpStatusPresentation(guest.status).tone">
              {{ statusLabel(guest.status) }}
            </UiBadge>
            <button
              type="button"
              class="min-h-11 text-sm text-text-muted underline-offset-4 hover:text-text hover:underline"
              :aria-label="`Alterar a resposta de ${guest.fullName}`"
              @click="irPara(posicao)"
            >
              Alterar
            </button>
          </span>
        </div>
      </div>

      <template v-if="payload.wedding.guestListMode === 'aberta'">
        <div class="flex items-center justify-between">
          <span class="text-sm font-medium text-text">
            Acompanhantes ({{ companions.length
            }}<template v-if="payload.maxCompanions !== null">/{{ payload.maxCompanions }}</template
            >)
          </span>
          <UiButton
            type="button"
            size="sm"
            variant="ghost"
            :disabled="!canAddCompanion || isPastDeadline"
            @click="addCompanion"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar
          </UiButton>
        </div>
        <div
          v-for="(companion, index) in companions"
          :key="index"
          class="rounded-lg border border-border bg-surface-elevated p-4"
        >
          <div class="flex items-start gap-2">
            <UiInput
              v-model="companion.fullName"
              class="flex-1"
              label="Nome"
              :disabled="isPastDeadline"
            />
            <UiButton
              type="button"
              size="sm"
              variant="ghost"
              class="mt-6"
              :disabled="isPastDeadline"
              :aria-label="`Remover acompanhante ${index + 1}`"
              @click="removeCompanion(index)"
            >
              <Icon name="lucide:trash-2" class="h-4 w-4" />
            </UiButton>
          </div>
        </div>
      </template>

      <UiTextarea
        v-model="message"
        label="Mensagem para o casal (opcional)"
        :disabled="isPastDeadline"
      />

      <div class="flex flex-wrap justify-between gap-3">
        <UiButton variant="ghost" @click="irPara(indice)">Voltar</UiButton>
        <UiButton
          size="lg"
          :disabled="isSubmitting || isPastDeadline || !allAnswered"
          @click="handleFinalize"
        >
          Confirmar presença
        </UiButton>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-4 py-8 text-center">
        <span
          class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Icon name="lucide:heart" class="h-6 w-6" />
        </span>
        <div>
          <p class="font-display text-xl font-semibold text-heading">Presença confirmada!</p>
          <p class="mt-1 text-text-muted">
            Obrigado por compartilhar este momento conosco. Sua confirmação foi registrada com
            sucesso.
          </p>
        </div>
        <div class="flex gap-3">
          <UiButton variant="outline" :disabled="isPastDeadline" @click="irPara(0)">
            Alterar confirmação
          </UiButton>
          <UiButton :to="backToSiteLink">Voltar ao site</UiButton>
        </div>
      </div>
    </template>
  </div>
</template>
