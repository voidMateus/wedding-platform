<!--
  O wizard de Primeiros passos (docs/fase4-onboarding.md seção 7).

  A regra que organiza o arquivo inteiro: **este wizard não é dono de nenhum
  campo**. Cada etapa renderiza o mesmo controle, o mesmo schema Zod e o mesmo
  composable da tela que já edita aquele dado — Configurações, Cronograma,
  Financeiro, Aparência. O que existe aqui é só a casca: sequência, progresso,
  "Pular" e o salvamento por etapa.

  Nada é obrigatório, nada trava, e nada é gravado sobre o wizard em si: a
  etapa em que o casal parou é DERIVADA (a primeira cujo fato ainda não vale),
  e "você pulou esta etapa" também (etapa vazia com etapa posterior cumprida só
  pode ter sido pulada).

  Organizado por ETAPA e não por categoria de código — a exceção que o
  ARCHITECTURE.md seção 3 aceita para componentes multi-etapa, porque agrupar
  por categoria espalharia a lógica de cada etapa por quatro seções distantes.
-->
<script setup lang="ts">
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'
import { PASSOS_DO_WIZARD } from '#shared/onboarding-passos'
import { themeConfigSchema } from '#shared/schemas/theme'
import { findThemePreset } from '#shared/theme-presets'
import { classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import { getApiErrorMessage } from '~/utils/api-error'
import { weddingSettingsFromRow } from '~/utils/wedding-settings'
import type { EventSegmentLocation } from '~/types/event-segment-location'

definePageMeta({ layout: 'admin' })

/** Hora usada quando o casal escolhe a data do prazo e não mexe no horário. */
const HORA_PADRAO_DO_PRAZO = '23:59'

const slug = useActiveWeddingSlug()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const { getWedding, updateWedding, updateWeddingTheme } = useWedding()
const { data: wedding, refresh: recarregarCasamento } = await getWedding()

const { listEventSegments, createEventSegment, updateEventSegment } = useEventSegments()
const { data: segmentos, refresh: recarregarSegmentos } = listEventSegments()

const { definirTetoDoOrcamento } = useFinance()
const { getRoteiro, atualizarRoteiro } = useOnboarding()
const { roteiro } = getRoteiro()

const salvando = ref(false)

// --- navegação entre etapas ---
//
// A etapa vive na URL: o link do roteiro abre direto naquela etapa ("cliquei
// em Prazo de RSVP", não "comecei do início"), o Voltar do navegador funciona
// e o endereço é salvável. Como estado de componente, nada disso valeria.
const passoAtual = computed(() => {
  const pedido = typeof route.query.passo === 'string' ? route.query.passo : null
  const existe = PASSOS_DO_WIZARD.some((passo) => passo.id === pedido)
  if (existe && pedido) return pedido
  // Sem etapa na URL, retomar é DERIVADO: a primeira ainda em aberto. Não há
  // "última etapa visitada" gravada em lugar nenhum — com autosave por etapa,
  // o próprio dado diz onde o casal parou.
  return roteiro.value.proximaEtapaDoWizard?.id ?? PASSOS_DO_WIZARD[0]!.id
})

const indice = computed(() => PASSOS_DO_WIZARD.findIndex((passo) => passo.id === passoAtual.value))
const passo = computed(() => PASSOS_DO_WIZARD[indice.value] ?? PASSOS_DO_WIZARD[0]!)
const ultima = computed(() => indice.value === PASSOS_DO_WIZARD.length - 1)

/** Foi deliberadamente pulada? Derivado dos fatos — ver shared/onboarding-passos.ts. */
const puladaAntes = computed(
  () => roteiro.value.passos.find((p) => p.id === passoAtual.value)?.pulado ?? false,
)

function irPara(id: string) {
  router.replace({ query: { ...route.query, passo: id } })
}

function avancarSemSalvar() {
  const proxima = PASSOS_DO_WIZARD[indice.value + 1]
  if (proxima) {
    irPara(proxima.id)
    return
  }
  // Termina NO ROTEIRO, nunca numa tela de parabéns: o wizard é a porta, o
  // roteiro é o que continua existindo.
  navigateTo(`/admin/${slug}`)
}

async function continuar() {
  salvando.value = true
  try {
    await salvarEtapaAtual()
    await atualizarRoteiro()
    avancarSemSalvar()
  } catch (erro) {
    // Erro de validação ou de rede não tranca a saída: a etapa continua
    // podendo ser pulada, e o casal nunca fica preso numa pergunta que não
    // sabe responder.
    toast.error(getApiErrorMessage(erro, 'Não foi possível salvar esta etapa.'))
  } finally {
    salvando.value = false
  }
}

async function salvarEtapaAtual() {
  if (!wedding.value) return
  if (passo.value.id === 'data-horario') return salvarHorario()
  if (passo.value.id === 'local') return salvarLocal()
  if (passo.value.id === 'prazo-rsvp') return salvarPrazo()
  if (passo.value.id === 'orcamento') return salvarOrcamento()
  if (passo.value.id === 'aparencia') return salvarAparencia()
}

// --- etapa 1: data e horário ---
//
// A data não é perguntada: é obrigatória na criação do casamento. O que falta
// é o horário — que a contagem regressiva, o convite e o cronograma usam.
const horario = ref('')

async function salvarHorario() {
  if (!wedding.value) return
  await updateWedding({ ...weddingSettingsFromRow(wedding.value), horarioEvento: horario.value })
  await recarregarCasamento()
}

// --- etapa 2: onde vai ser ---
//
// Salva só a Cerimônia. `useCronogramaForm().saveCronograma()` salvaria as
// duas etapas de uma vez, e criaria uma Recepção vazia que o casal não pediu
// — o wizard pergunta UMA coisa por vez, e o Cronograma continua sendo onde
// as duas se editam juntas.
const local = ref<EventSegmentLocation>(emptyEventSegmentLocation())

const cerimonia = computed(
  () =>
    segmentos.value?.data.find((s) => classifyEventSegmentTitle(s.titulo) === 'ceremony') ?? null,
)

async function salvarLocal() {
  const valores = eventSegmentInputSchema.parse({
    ...local.value,
    titulo: 'Cerimônia',
    ordemExibicao: 1,
    iniciaEm: cerimonia.value?.inicia_em ?? '',
    terminaEm: cerimonia.value?.termina_em ?? '',
    mesmoLocalQue: '',
  })

  if (cerimonia.value) await updateEventSegment(cerimonia.value.id, valores)
  else await createEventSegment(valores)

  await recarregarSegmentos()
}

// --- etapa 3: prazo de RSVP ---
const prazoData = ref('')
const prazoHora = ref('')

async function salvarPrazo() {
  if (!wedding.value) return
  const prazoRsvp = prazoData.value
    ? `${prazoData.value}T${prazoHora.value || HORA_PADRAO_DO_PRAZO}`
    : ''
  await updateWedding({ ...weddingSettingsFromRow(wedding.value), prazoRsvp })
  await recarregarCasamento()
}

// --- etapa 4: teto do orçamento ---
//
// Pergunta um número, não abre um módulo: "Defina seu orçamento" prometeria
// uma tela de planejamento inteira e faria quem não tem resposta pronta
// abandonar o wizard aqui. Distribuir por categoria é o trabalho que o
// Financeiro já sabe fazer.
const teto = ref<number | null>(null)

async function salvarOrcamento() {
  await definirTetoDoOrcamento(teto.value)
  await recarregarCasamento()
}

// --- etapa 5: a cara do site ---
//
// Última de propósito: é a única em que errar não custa nada. Aplicar um
// preset preenche cor e tipografia de uma vez, exatamente como em Aparência —
// e continua tudo editável lá depois.
const presetId = ref<string | null>(null)

async function salvarAparencia() {
  const preset = presetId.value ? findThemePreset(presetId.value) : undefined
  if (!preset) return

  // Validado pelo MESMO schema da tela de Aparência, e não por um objeto
  // montado à mão: é ele que aplica os defaults do tema e descarta as chaves
  // geridas por outros endpoints (foto de capa, pontos de foco), que precisam
  // sobreviver intactas ao merge do servidor.
  const tema = (wedding.value?.config_tema ?? {}) as Record<string, unknown>
  await updateWeddingTheme(
    themeConfigSchema.parse({
      ...tema,
      presetId: preset.id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      ornamentColor: preset.ornamentColor ?? '',
      fontPairId: preset.fontPairId,
    }),
  )
  await recarregarCasamento()
}

// --- popular as etapas com o que já está salvo ---
watch(
  [wedding, cerimonia],
  () => {
    const valor = wedding.value
    if (!valor) return
    horario.value = valor.horario_evento ? valor.horario_evento.slice(0, 5) : ''
    const prazo = valor.prazo_rsvp ? isoParaDatetimeLocal(valor.prazo_rsvp) : ''
    prazoData.value = prazo.split('T')[0] ?? ''
    prazoHora.value = prazo.split('T')[1] ?? ''
    teto.value = valor.orcamento_total_centavos
    presetId.value = (valor.config_tema as { presetId?: string } | null)?.presetId ?? null
    local.value = cerimonia.value
      ? eventSegmentLocationFromSegment(cerimonia.value)
      : emptyEventSegmentLocation()
  },
  { immediate: true },
)
</script>

<template>
  <AdminSection title="Primeiros passos" description="Uma coisa de cada vez. Nada é obrigatório.">
    <AdminPanel>
      <div class="flex flex-col gap-6 p-5 sm:p-7">
        <!-- Progresso: quantas etapas, onde estamos. Nunca percentual. -->
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Etapa {{ indice + 1 }} de {{ PASSOS_DO_WIZARD.length }}
            </p>
            <NuxtLink
              :to="`/admin/${slug}`"
              class="text-xs font-medium text-text-muted underline-offset-4 hover:underline"
            >
              Sair
            </NuxtLink>
          </div>
          <div
            class="flex h-1.5 overflow-hidden rounded-full bg-text/10"
            role="progressbar"
            :aria-valuenow="indice + 1"
            :aria-valuemin="1"
            :aria-valuemax="PASSOS_DO_WIZARD.length"
            :aria-label="`Etapa ${indice + 1} de ${PASSOS_DO_WIZARD.length}`"
          >
            <div
              class="h-full bg-primary transition-brand"
              :style="{ width: `${((indice + 1) / PASSOS_DO_WIZARD.length) * 100}%` }"
            />
          </div>
        </div>

        <p
          v-if="puladaAntes"
          class="rounded-md bg-surface-muted/60 px-3 py-2 text-xs text-text-muted"
        >
          Você pulou esta etapa antes — ela continua aqui até ser respondida.
        </p>

        <!-- --- etapa 1: data e horário --- -->
        <div v-if="passo.id === 'data-horario'" class="flex flex-col gap-3">
          <h2 class="font-display text-xl font-semibold text-text">Que horas começa?</h2>
          <p class="text-sm text-text-muted">
            A data já está no sistema. O horário é o que a contagem regressiva e o convite usam.
          </p>
          <UiTimePicker v-model="horario" label="Horário do casamento" class="max-w-xs" />
        </div>

        <!-- --- etapa 2: onde vai ser --- -->
        <div v-else-if="passo.id === 'local'" class="flex flex-col gap-3">
          <h2 class="font-display text-xl font-semibold text-text">Onde vai ser?</h2>
          <p class="text-sm text-text-muted">
            É o endereço da cerimônia, que aparece no site e no mapa. Se a festa for em outro lugar,
            você cadastra depois no Cronograma.
          </p>
          <AdminLocationField v-model="local" label="Local da cerimônia" />
        </div>

        <!-- --- etapa 3: prazo de RSVP --- -->
        <div v-else-if="passo.id === 'prazo-rsvp'" class="flex flex-col gap-3">
          <h2 class="font-display text-xl font-semibold text-text">
            Até quando dá para confirmar presença?
          </h2>
          <p class="text-sm text-text-muted">
            Depois desta data, o convidado não consegue mais alterar a resposta. Sem prazo, a
            confirmação fica aberta até o dia do evento.
          </p>
          <div class="grid max-w-md gap-4 sm:grid-cols-2">
            <UiDatePicker v-model="prazoData" label="Data" placeholder="Sem prazo" clearable />
            <UiTimePicker v-model="prazoHora" label="Horário" :disabled="!prazoData" />
          </div>
        </div>

        <!-- --- etapa 4: teto do orçamento --- -->
        <div v-else-if="passo.id === 'orcamento'" class="flex flex-col gap-3">
          <h2 class="font-display text-xl font-semibold text-text">
            Quanto vocês pretendem gastar no total?
          </h2>
          <p class="text-sm text-text-muted">
            Um número aproximado basta — dá para mudar quando quiser. É a régua do Financeiro:
            distribuir por categoria vem depois, lá dentro.
          </p>
          <UiCurrencyInput v-model="teto" label="Orçamento total" class="max-w-xs" />
        </div>

        <!-- --- etapa 5: a cara do site --- -->
        <div v-else-if="passo.id === 'aparencia'" class="flex flex-col gap-3">
          <h2 class="font-display text-xl font-semibold text-text">Escolham a cara do site</h2>
          <p class="text-sm text-text-muted">
            Cor e tipografia de uma vez. Nada aqui é definitivo — em Configurações → Aparência você
            muda cada detalhe.
          </p>
          <AdminThemePresetPicker v-model="presetId" />
        </div>

        <!-- Navegação. "Pular" é botão de primeira classe, do lado de
             "Continuar" — não um link apagado no canto. -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <UiButton
            variant="ghost"
            :disabled="indice === 0 || salvando"
            @click="irPara(PASSOS_DO_WIZARD[indice - 1]!.id)"
          >
            Voltar
          </UiButton>

          <div class="flex flex-wrap items-center gap-2">
            <UiButton variant="outline" :disabled="salvando" @click="avancarSemSalvar">
              Pular
            </UiButton>
            <UiButton :disabled="salvando" @click="continuar">
              <template v-if="salvando">Salvando...</template>
              <template v-else>{{ ultima ? 'Concluir' : 'Continuar' }}</template>
            </UiButton>
          </div>
        </div>
      </div>
    </AdminPanel>
  </AdminSection>
</template>
