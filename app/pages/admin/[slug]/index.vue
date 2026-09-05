<script setup lang="ts">
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { formatDatePtBR } from '#shared/utils/format-date'
import {
  FAIXA_ETARIA_NAO_INFORMADA,
  FAIXA_ETARIA_ROTULO_NAO_INFORMADA,
  descreverLimitesFaixaEtaria,
} from '#shared/utils/faixa-etaria'
import type { InviteListItem } from '~/types/invite'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()

const { getSummary } = useDashboard()
const { data, status, error, refresh } = getSummary()

// Mesma chave 'wedding' do layout admin (useWedding.ts) — dedup automático,
// sem fetch extra.
const { getWedding } = useWedding()
const { data: wedding } = getWedding()

const targetDateTime = computed(() =>
  wedding.value
    ? resolveEventDateTime(wedding.value.data_evento, wedding.value.horario_evento).toISOString()
    : null,
)

// Meia-noite local explícita (mesmo padrão do Hero público): `new
// Date('2026-09-14')` seria lido como UTC e voltaria um dia em fuso negativo.
const eventDateLabel = computed(() => {
  if (!wedding.value) return ''
  return new Date(`${wedding.value.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
})

function formatDeadline(value: string | null): string {
  if (!value) return 'Sem prazo definido'
  const deadline = new Date(value)
  const diffMs = deadline.getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const formatted = deadline.toLocaleDateString('pt-BR', { dateStyle: 'long' })
  if (diffDays < 0) return `Encerrado em ${formatted}`
  if (diffDays === 0) return `Hoje (${formatted})`
  return `${formatted} (${diffDays} dia${diffDays === 1 ? '' : 's'} restante${diffDays === 1 ? '' : 's'})`
}

// Barra segmentada de RSVP — único gráfico da tela, e o único lugar onde cor
// carrega significado (estado da resposta). 'lista_espera' só entra quando
// existe de fato: sem isso a barra não fecharia 100% e a soma da legenda não
// bateria com o total de pessoas.
const rsvpSegments = computed(() => {
  const people = data.value?.people
  if (!people || people.total === 0) return []
  const toPercent = (value: number) => Math.round((value / people.total) * 100)
  const segments = [
    { label: 'Confirmados', value: people.confirmed, tone: 'bg-text' },
    { label: 'Pendentes', value: people.pending, tone: 'bg-primary' },
    { label: 'Recusados', value: people.declined, tone: 'bg-text/25' },
  ]
  if (people.waitlisted > 0) {
    segments.push({ label: 'Lista de espera', value: people.waitlisted, tone: 'bg-secondary' })
  }
  return segments.map((segment) => ({ ...segment, percent: toPercent(segment.value) }))
})

const rsvpBarLabel = computed(() => {
  const total = data.value?.people.total ?? 0
  const parts = rsvpSegments.value.map((s) => `${s.value} ${s.label.toLowerCase()}`)
  return `Progresso dos RSVP: ${parts.join(', ')} de ${total} pessoas`
})

const metrics = computed(() => {
  if (!data.value) return []
  return [
    { label: 'Convites enviados', value: data.value.invites.sent },
    { label: 'Pessoas na lista', value: data.value.people.total },
    { label: 'Confirmações hoje', value: data.value.rsvp.respondedToday, tone: 'primary' as const },
  ]
})

// --- pessoas por faixa etária ---
//
// Cada número é derivado a cada carregamento (idade na data do casamento x
// faixas configuradas), nunca lido de uma coluna: mudar os limites em
// Configurações muda esta contagem sem alterar nenhum convidado. Cada item
// linka para o mesmo recorte na lista de convidados — o contador e o filtro
// descrevem sempre a mesma classificação.
const { faixas, label: ageGroupLabel } = useAgeGroups()

const ageGroupCounts = computed(() => {
  const counts = data.value?.people.byAgeGroup
  if (!counts) return []
  const items = faixas.value.map((faixa) => ({
    key: faixa.chave as string,
    label: ageGroupLabel(faixa.chave),
    hint: descreverLimitesFaixaEtaria(faixa),
    value: counts[faixa.chave] ?? 0,
  }))
  // "Não informada" só aparece quando existe de fato — num casamento com
  // todas as faixas resolvidas, é ruído.
  if (counts[FAIXA_ETARIA_NAO_INFORMADA] > 0) {
    items.push({
      key: FAIXA_ETARIA_NAO_INFORMADA,
      label: FAIXA_ETARIA_ROTULO_NAO_INFORMADA,
      hint: 'Sem data de nascimento nem faixa informada',
      value: counts[FAIXA_ETARIA_NAO_INFORMADA],
    })
  }
  return items
})

// --- convites recentes ---
//
// TODO(admin/convidados): o desenho original desta tabela era "convidados
// recentes" (nome, grupo, acompanhantes, status de RSVP, atualizado em), mas
// /api/guests devolve `convidados.Row` puro — sem status de RSVP (vive em
// respostas_rsvp, sem join) e sem atualizado_em por resposta. Enquanto esse
// join não existir, o painel mostra convites, que já trazem responseStatus,
// memberCount e enviado_em na mesma resposta. Quando a listagem de convidados
// passar a trazer status + atualizado_em, esta tabela pode voltar a ser de
// convidados só trocando `columns`/`rows` — AdminTable recebe as colunas por
// prop justamente para isso.

const RECENT_INVITES_LIMIT = 8
const INVITES_PAGE_SIZE = 25

const { listInvites } = useInvites()
// Sem includeArchived: o painel mostra o que está em jogo agora, não o
// arquivo. A chave 'invites' é compartilhada com a tela de convites (que pede
// includeArchived), então navegar entre as duas refaz o fetch — nunca as duas
// montadas ao mesmo tempo, e o custo é uma listagem paginada.
const {
  data: invitesData,
  status: invitesStatus,
  error: invitesError,
  refresh: refreshInvites,
} = listInvites({ page: 1, pageSize: INVITES_PAGE_SIZE })

const inviteFilter = ref('todos')
const inviteFilters = [
  { value: 'todos', label: 'Todos' },
  { value: 'aguardando', label: 'Aguardando' },
  { value: 'respondidos', label: 'Respondidos' },
] as const

const filteredInvites = computed(() => {
  const rows = invitesData.value?.data ?? []
  if (inviteFilter.value === 'aguardando') {
    return rows.filter((invite) => invite.responseStatus !== 'responded')
  }
  if (inviteFilter.value === 'respondidos') {
    return rows.filter((invite) => invite.responseStatus === 'responded')
  }
  return rows
})

const recentInvites = computed(() => filteredInvites.value.slice(0, RECENT_INVITES_LIMIT))

const invitesPanelMeta = computed(() => {
  const total = invitesData.value?.meta.total ?? 0
  return `${recentInvites.value.length} de ${total} convite${total === 1 ? '' : 's'}`
})

const inviteColumns = [
  { key: 'nome', label: 'Convite' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'pessoas', label: 'Pessoas', align: 'right' },
  { key: 'status', label: 'Status', align: 'right' },
  { key: 'enviado', label: 'Enviado em', align: 'right' },
] as const

// Badge, não texto colorido (preferência do usuário em 2026-09-04): rótulo e
// tom vêm do mapa único (status-presentation.ts), igual ao modal de detalhe.
function statusOf(invite: InviteListItem) {
  return inviteResponsePresentation(invite.responseStatus, {
    sent: invite.status_convite === 'enviado',
  })
}
</script>

<template>
  <AdminSection title="Dashboard" title-hidden>
    <div v-if="status === 'pending'" class="flex flex-col gap-5">
      <UiSkeleton class="h-44 w-full" />
      <UiSkeleton class="h-24 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o dashboard"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <template v-else-if="data">
      <AdminPanel>
        <div class="flex flex-wrap items-end gap-x-12 gap-y-6 p-5 sm:p-7">
          <div class="min-w-48">
            <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
              Faltam para o grande dia
            </p>
            <div class="mt-2">
              <UiCountdownTimer
                v-if="targetDateTime"
                variant="hero"
                :target-date-time="targetDateTime"
              >
                <template #past>
                  <p class="font-display text-3xl font-semibold text-primary">
                    O grande dia chegou!
                  </p>
                </template>
              </UiCountdownTimer>
            </div>
            <p class="mt-2 text-sm text-text-muted">{{ eventDateLabel }}</p>
          </div>

          <!-- min-w-64 (não min-w-0): com flex-1 sozinho a coluna comprime a
               ~140px no mobile em vez de quebrar pra linha de baixo. -->
          <div class="min-w-64 flex-1">
            <div class="mb-3 flex flex-wrap items-baseline justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Progresso dos RSVP
              </p>
              <p class="font-display text-lg font-semibold text-text">
                {{ data.rsvp.responseRatePercent }}%
                <span class="text-sm font-normal text-text-muted">respondido</span>
              </p>
            </div>

            <div
              class="flex h-2.5 overflow-hidden rounded-full bg-text/10"
              role="img"
              :aria-label="rsvpBarLabel"
            >
              <div
                v-for="segment in rsvpSegments"
                :key="segment.label"
                class="h-full transition-brand"
                :class="segment.tone"
                :style="{ width: `${segment.percent}%` }"
              />
            </div>

            <ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
              <li
                v-for="segment in rsvpSegments"
                :key="segment.label"
                class="flex items-center gap-1.5"
              >
                <span class="h-2 w-2 rounded-full" :class="segment.tone" aria-hidden="true" />
                <span class="text-text-muted">{{ segment.label }}</span>
                <span class="num font-medium text-text">{{ segment.value }}</span>
              </li>
            </ul>

            <p class="mt-4 text-xs text-text-muted">
              Prazo de RSVP: {{ formatDeadline(data.rsvpDeadline) }}
            </p>
          </div>
        </div>
      </AdminPanel>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <AdminMetricStrip :metrics="metrics" class="lg:col-span-8" />
        <div class="flex flex-col gap-3 lg:col-span-4">
          <UiButton class="w-full" :to="`/admin/${slug}/convidados?novo=1`">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Adicionar convidado
          </UiButton>
          <UiButton
            v-if="wedding?.slug"
            variant="secondary"
            class="w-full"
            :to="`/${wedding.slug}`"
            target="_blank"
          >
            Ver site público
          </UiButton>
        </div>
      </div>

      <AdminPanel title="Pessoas por faixa etária" meta="Calculada na data do casamento">
        <template #headerActions>
          <NuxtLink
            :to="`/admin/${slug}/configuracoes#faixas-etarias`"
            class="text-xs font-medium text-primary hover:underline"
          >
            Ajustar faixas
          </NuxtLink>
        </template>

        <dl class="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4 sm:px-5">
          <div v-for="item in ageGroupCounts" :key="item.key">
            <dt class="text-xs font-medium text-text-muted">{{ item.label }}</dt>
            <dd class="mt-1">
              <NuxtLink
                :to="`/admin/${slug}/convidados?faixa=${item.key}`"
                class="num text-2xl font-semibold text-text hover:underline"
              >
                {{ item.value }}
              </NuxtLink>
            </dd>
            <p class="mt-0.5 text-xs text-text-muted">{{ item.hint }}</p>
          </div>
        </dl>
      </AdminPanel>

      <AdminPanel title="Convites recentes" :meta="invitesPanelMeta">
        <template #headerActions>
          <AdminFilterChips
            v-model="inviteFilter"
            :items="inviteFilters"
            group-label="Filtrar convites por status de resposta"
          />
        </template>

        <div v-if="invitesStatus === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
          <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
        </div>

        <div v-else-if="invitesError" class="p-4 sm:p-5">
          <UiEmptyState
            icon="lucide:alert-triangle"
            title="Não foi possível carregar os convites"
            description="Verifique sua conexão e tente novamente."
          >
            <UiButton variant="ghost" @click="refreshInvites()">Tentar novamente</UiButton>
          </UiEmptyState>
        </div>

        <template v-else>
          <!-- Prévia de 8 linhas: sem rolagem própria, que só somaria uma barra
               dentro de um bloco que já cabe inteiro na tela. -->
          <AdminTable
            :columns="inviteColumns"
            :rows="recentInvites"
            :scrollable="false"
            empty-label="Nenhum convite com esse recorte."
          >
            <template #cell-nome="{ row }">
              <NuxtLink
                :to="`/admin/${slug}/convites/${row.id}`"
                class="font-medium text-text hover:underline"
              >
                {{ row.nome }}
              </NuxtLink>
            </template>
            <template #cell-responsavel="{ row }">
              <span class="text-text-muted">{{ row.responsibleGuestName ?? '—' }}</span>
            </template>
            <template #cell-pessoas="{ row }">
              <span class="num text-text-muted">{{ row.memberCount }}</span>
            </template>
            <template #cell-status="{ row }">
              <UiBadge :tone="statusOf(row).tone">{{ statusOf(row).label }}</UiBadge>
            </template>
            <template #cell-enviado="{ row }">
              <span class="text-text-muted">{{ formatDatePtBR(row.enviado_em) }}</span>
            </template>
          </AdminTable>

          <div class="border-t border-border px-4 py-3 text-right sm:px-5">
            <NuxtLink
              :to="`/admin/${slug}/convites`"
              class="text-xs font-medium text-primary hover:underline"
            >
              Ver todos os convites
            </NuxtLink>
          </div>
        </template>
      </AdminPanel>
    </template>
  </AdminSection>
</template>
