<!--
  O fluxo de confirmação — UMA tela, com todo mundo do convite.

  Histórico curto, porque ele explica o desenho. A tela original mostrava todas
  as pessoas com um par de botões idêntico cada, e no celular virava uma parede
  de pílulas iguais (rodada de usabilidade de 20/09/2026, ponto 25). A primeira
  correção trocou isso por um passo a passo — uma pessoa por vez, com progresso
  e uma etapa de revisão no fim — e foi RECUSADA pelo dono do produto em
  23/09/2026, com razão:

  - o convite típico tem uma ou duas pessoas, e o passo a passo cobrava três
    telas por duas decisões binárias. O remédio foi dimensionado para o convite
    de seis, que é o caso raro;
  - responder avançava sozinho, então a tela se mexia a cada toque e quem
    respondia nunca via a própria resposta assentar;
  - a etapa de revisão remontava a lista que a tela já era.

  O diagnóstico do ponto 25 continua valendo: o problema era a PAREDE DE
  BOTÕES. O que mudou é o remédio — não paginar a lista, e sim trocar o par de
  CTAs por um controle de escolha de verdade (`RsvpAnswerChoice`), que carrega
  o próprio estado em forma, e não só em cor. Com ele, a linha "Resposta:
  Estará lá" deixou de ser necessária: ela era a muleta do controle errado.

  Sem etapa de revisão, também de propósito: cada resposta já é gravada no
  toque (`autosaveGuestStatus`), o RSVP é editável até o prazo, e o envio final
  fecha acompanhantes e recado. Um portão de confirmação antes de algo que já
  está salvo e é reversível é cerimônia, não segurança.

  Restrição alimentar não entra: saiu da API em 2026-09-04 e não existe mais no
  produto. O plano da rodada a menciona porque foi escrito olhando a tela.
-->
<script setup lang="ts">
import { resolveHomeSections } from '#shared/home-sections'
import type { ThemeConfig } from '#shared/schemas/theme'
import { diaLocal } from '#shared/utils/data-de-envio'
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { primeirosNomesCasal } from '#shared/utils/nomes-casal'
import type { RsvpInvitePayload } from '~/types/rsvp'

interface Props {
  payload: RsvpInvitePayload
}

const props = defineProps<Props>()
// 'back' — volta para a etapa anterior do fluxo (busca), não para o site: o
// parent (rsvp/index.vue) decide o que "etapa anterior" significa ali.
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

/**
 * Os membros em blocos: cada núcleo de Acompanhantes num cartão só, quem não
 * tem núcleo num cartão de um. A regra (e o porquê dela) mora em
 * `agruparMembrosPorNucleo` — é o agrupamento que explica, sem uma linha de
 * texto, por que aquelas pessoas vieram no mesmo convite.
 */
const blocos = computed(() => agruparMembrosPorNucleo(guestStates.value))

const isPastDeadline = props.payload.isPastDeadline
const enviado = ref(false)

const faltamResponder = computed(() => guestStates.value.filter((g) => g.status === 'pendente'))
const allAnswered = computed(() => faltamResponder.value.length === 0)
const algumVai = computed(() => guestStates.value.some((g) => g.status === 'confirmado'))
const algumNaoVai = computed(() => guestStates.value.some((g) => g.status === 'recusado'))

/**
 * Quem ainda falta, por nome.
 *
 * O envio desabilitado precisa dizer o que está faltando: botão cinza sem
 * motivo é a forma mais comum de alguém achar que a página quebrou. Com a
 * lista inteira na tela, nomear quem falta também serve de índice.
 */
const nomesQueFaltam = computed(() => {
  const nomes = faltamResponder.value.map((g) => g.fullName)
  if (nomes.length <= 1) return nomes.join('')
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
})

// --- contexto do evento: o que a pessoa confere ANTES de decidir ---

const { getPublicWedding } = usePublicWedding()
const { data: wedding } = getPublicWedding()
const { getPublicEventSegments } = usePublicEventSegments()
const { data: segmentos } = getPublicEventSegments()

const theme = computed(() => (wedding.value?.config_tema ?? {}) as Partial<ThemeConfig>)
const activeSections = computed(() => theme.value.activeSections ?? [])

const nomesDoCasal = computed(
  () => primeirosNomesCasal(props.payload.wedding.coupleNames) ?? props.payload.wedding.coupleNames,
)

const dataPorExtenso = computed(() =>
  new Date(`${props.payload.wedding.eventDate}T00:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  }),
)

const dataCompleta = computed(() =>
  new Date(`${props.payload.wedding.eventDate}T00:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }),
)

const horaDoEvento = computed(() => {
  const horario = wedding.value?.horario_evento
  if (!horario) return null
  return resolveEventDateTime(props.payload.wedding.eventDate, horario).toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )
})

// Primeiro trecho do cronograma que tem local — normalmente a Cerimônia.
// Mesma regra do Hero, para os dois não descreverem lugares diferentes.
const localDoEvento = computed(
  () => segmentos.value?.data?.find((etapa) => etapa.nome_local)?.nome_local ?? null,
)

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

async function setStatus(guest: GuestState, status: 'confirmado' | 'recusado') {
  if (isPastDeadline) return

  // A resposta aparece na hora e a tela NÃO se mexe. Gravar sem bloquear é o
  // que evita o toque duplo num 3G ruim — avançar de pessoa nunca foi parte
  // disso, e foi o que o dono do produto recusou em 23/09/2026.
  guest.status = status

  try {
    await autosaveGuestStatus(guest.guestId, { status })
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
    enviado.value = true
  } catch {
    toast.error('Não foi possível enviar. Tente novamente.')
  } finally {
    isSubmitting.value = false
  }
}

// --- o fecho ---

/**
 * Três fechos, escolhidos pelo RESULTADO.
 *
 * Um texto só não serve: "que alegria, nos vemos lá" para quem acabou de dizer
 * que não pode ir é a plataforma não ter lido a própria resposta. E o convite
 * misto (um vai, outro não) não é nenhum dos dois.
 */
const fecho = computed(() => {
  if (algumVai.value && !algumNaoVai.value) {
    return {
      titulo: 'Presença confirmada!',
      texto: `Que alegria! ${nomesDoCasal.value} esperam você em ${dataPorExtenso.value}.`,
    }
  }
  if (algumNaoVai.value && !algumVai.value) {
    return {
      titulo: 'Resposta enviada',
      texto: `Obrigado por avisar. ${nomesDoCasal.value} vão sentir sua falta.`,
    }
  }
  return {
    titulo: 'Resposta enviada',
    texto: `Obrigado por responder por todos. ${nomesDoCasal.value} esperam quem puder ir em ${dataPorExtenso.value}.`,
  }
})

/**
 * Atalhos para o resto do site — DERIVADOS do catálogo de seções, nunca uma
 * lista escrita à mão.
 *
 * Manter uma segunda lista em paralelo já produziu oito atalhos para onze
 * seções, com três destinos inalcançáveis e nada acusando a falta (CLAUDE.md,
 * seção 13). `hasContent: {}` pela mesma razão da barra de navegação: aqui a
 * pergunta é o que o casal LIGOU.
 *
 * Fora dos atalhos: `confirmar-presenca` (é esta tela) e `presentes`, que tem
 * uma oferta própria logo acima — repetido nos dois lugares, o convite a
 * presentear vira insistência.
 */
const atalhosDoSite = computed(() =>
  resolveHomeSections({
    order: theme.value.sectionOrder,
    active: activeSections.value,
    hasContent: {},
  })
    .filter(
      (secao) =>
        !secao.definition.noMenu && secao.id !== 'confirmar-presenca' && secao.id !== 'presentes',
    )
    .map((secao) => ({
      id: secao.id,
      to: `/${slug}${secao.definition.shortcutHref}`,
      label: secao.definition.navLabel ?? secao.definition.shortcutLabel,
      icon: secao.definition.shortcutIcon,
    })),
)

const { getPublicGifts } = usePublicGifts()
const { data: presentes } = getPublicGifts()

/**
 * A oferta de presentear aparece quando o casal ligou a seção E a lista não
 * está comprovadamente vazia — mandar alguém para uma vitrine sem nada é pior
 * que não oferecer. Enquanto a lista ainda carrega, a oferta aparece: esconder
 * primeiro e revelar depois faria o bloco piscar embaixo do fecho.
 *
 * Ela aparece também para quem NÃO vai, com outro texto: quem não pode
 * comparecer é justamente quem costuma querer mandar alguma coisa.
 */
const oferecePresentes = computed(
  () => activeSections.value.includes('presentes') && presentes.value?.data?.length !== 0,
)
const linkDePresentes = computed(() => `/${slug}/presentes`)
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="!enviado">
      <button
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
        <template v-else-if="diasAteOPrazo === 1"
          >Falta 1 dia para o prazo de confirmação.</template
        >
        <template v-else>Faltam {{ diasAteOPrazo }} dias para o prazo de confirmação.</template>
      </p>

      <!-- Quando e onde, antes da pergunta: é o que a pessoa confere para
           decidir. Uma linha de contexto, não um cartão — a tela tem um
           assunto só, e ele é a resposta. -->
      <p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
        <span class="inline-flex items-center gap-1.5">
          <Icon name="lucide:calendar-days" class="h-4 w-4 shrink-0" aria-hidden="true" />
          {{ dataCompleta }}<template v-if="horaDoEvento">, {{ horaDoEvento }}</template>
        </span>
        <span v-if="localDoEvento" class="inline-flex items-center gap-1.5">
          <Icon name="lucide:map-pin" class="h-4 w-4 shrink-0" aria-hidden="true" />
          {{ localDoEvento }}
        </span>
      </p>

      <!-- Um cartão por BLOCO: o núcleo de Acompanhantes inteiro junto, quem
           não tem núcleo sozinho. -->
      <div
        v-for="bloco in blocos"
        :key="bloco.id"
        class="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface-elevated p-5 shadow-sm"
      >
        <!--
          Respiro simétrico dos DOIS lados do filete, e não só acima.

          Com `pt-5` no segundo em diante, a pessoa de baixo nascia colada na
          resposta da de cima: os dois blocos liam como um só, e num convite de
          família fica impossível ver onde uma pessoa termina e a outra começa
          (observação do dono do produto, 23/09/2026). `py-6` com `first:pt-0`
          e `last:pb-0` dá 24px de cada lado da divisória sem afastar o
          conteúdo das bordas do cartão.
        -->
        <div v-for="guest in bloco.membros" :key="guest.guestId" class="py-6 first:pt-0 last:pb-0">
          <p class="mb-4 font-display text-lg font-semibold text-heading">{{ guest.fullName }}</p>
          <RsvpAnswerChoice
            :model-value="guest.status"
            :person-name="guest.fullName"
            :disabled="isPastDeadline"
            @update:model-value="(status) => setStatus(guest, status)"
          />
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
        :label="`Quer deixar um recado para ${nomesDoCasal}?`"
        :disabled="isPastDeadline"
      />

      <div class="flex flex-col gap-2">
        <!-- O motivo de o envio estar desabilitado, por extenso e por nome. -->
        <p v-if="!allAnswered" class="text-sm text-text-muted" aria-live="polite">
          Falta responder por {{ nomesQueFaltam }}.
        </p>
        <UiButton
          size="lg"
          class="w-full"
          :disabled="isSubmitting || isPastDeadline || !allAnswered"
          @click="handleFinalize"
        >
          Enviar resposta
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
          <p class="font-display text-xl font-semibold text-heading">{{ fecho.titulo }}</p>
          <p class="mt-1 text-text-muted">{{ fecho.texto }}</p>
        </div>
      </div>

      <!-- Sugestão, nunca a ação principal da tela: a pessoa acabou de fazer um
           favor, e transformar o agradecimento em vitrine queima o que ele
           ganhou. Por isso um botão secundário, abaixo do fecho. -->
      <div
        v-if="oferecePresentes"
        class="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-elevated p-5 text-center"
      >
        <p class="text-sm text-text">
          <template v-if="algumVai">
            Quer levar um presente? {{ nomesDoCasal }} montaram uma lista.
          </template>
          <template v-else>
            Mesmo sem poder ir, você pode mandar um presente para {{ nomesDoCasal }}.
          </template>
        </p>
        <UiButton variant="outline" :to="linkDePresentes">
          <Icon name="lucide:gift" class="h-4 w-4" />
          Ver lista de presentes
        </UiButton>
      </div>

      <!-- O resto do site, a um toque: quem respondeu costuma querer conferir
           traje, horário e como chegar na mesma visita. -->
      <div v-if="atalhosDoSite.length" class="flex flex-col gap-3">
        <p class="text-center text-sm font-medium text-text">Enquanto está por aqui</p>
        <div class="flex flex-wrap justify-center gap-2">
          <NuxtLink
            v-for="atalho in atalhosDoSite"
            :key="atalho.id"
            :to="atalho.to"
            class="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-elevated px-4 text-sm text-text transition-brand hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Icon :name="atalho.icon" class="h-4 w-4 shrink-0" aria-hidden="true" />
            {{ atalho.label }}
          </NuxtLink>
        </div>
      </div>

      <div class="flex flex-wrap justify-center gap-3">
        <UiButton variant="ghost" :disabled="isPastDeadline" @click="enviado = false">
          Alterar resposta
        </UiButton>
        <UiButton variant="outline" :to="backToSiteLink">Voltar ao site</UiButton>
      </div>
    </template>
  </div>
</template>
