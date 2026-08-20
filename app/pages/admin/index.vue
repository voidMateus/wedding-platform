<script setup lang="ts">
import { resolveEventDateTime } from '#shared/utils/event-datetime'
import { formatDateTimePtBR } from '#shared/utils/format-date'

definePageMeta({ layout: 'admin' })

const { getSummary } = useDashboard()
const { data, status, error, refresh } = getSummary()

// Mesma chave 'wedding' do layout admin (useWedding.ts) — dedup automático,
// sem fetch extra.
const { getWedding } = useWedding()
const { data: wedding } = getWedding()

const targetDateTime = computed(() =>
  wedding.value
    ? resolveEventDateTime(wedding.value.event_date, wedding.value.event_time).toISOString()
    : null,
)

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

const inviteStats = computed(() => {
  if (!data.value) return []
  const d = data.value.invites
  return [
    { icon: 'lucide:mail', label: 'Total', value: d.total, tone: 'default' as const },
    { icon: 'lucide:send', label: 'Enviados', value: d.sent, tone: 'primary' as const },
    {
      icon: 'lucide:check-check',
      label: 'Respondidos',
      value: d.responded,
      tone: 'success' as const,
    },
    {
      icon: 'lucide:circle-dashed',
      label: 'Parcialmente respondidos',
      value: d.partial,
      tone: 'warning' as const,
    },
    { icon: 'lucide:clock', label: 'Pendentes', value: d.pending, tone: 'default' as const },
    { icon: 'lucide:archive', label: 'Arquivados', value: d.archived, tone: 'default' as const },
  ]
})

const peopleStats = computed(() => {
  if (!data.value) return []
  const d = data.value.people
  return [
    { icon: 'lucide:users', label: 'Total', value: d.total, tone: 'default' as const },
    { icon: 'lucide:check', label: 'Confirmados', value: d.confirmed, tone: 'success' as const },
    { icon: 'lucide:x', label: 'Recusados', value: d.declined, tone: 'danger' as const },
    { icon: 'lucide:clock', label: 'Pendentes', value: d.pending, tone: 'default' as const },
    { icon: 'lucide:baby', label: 'Crianças', value: d.children, tone: 'default' as const },
    { icon: 'lucide:user', label: 'Adultos', value: d.adults, tone: 'default' as const },
    { icon: 'lucide:star', label: 'Padrinhos', value: d.padrinhos, tone: 'primary' as const },
    { icon: 'lucide:star', label: 'Madrinhas', value: d.madrinhas, tone: 'primary' as const },
  ]
})

const rsvpStats = computed(() => {
  if (!data.value) return []
  const d = data.value.rsvp
  return [
    {
      icon: 'lucide:calendar-check',
      label: 'Primeira confirmação',
      value: formatDateTimePtBR(d.firstResponseAt),
      tone: 'default' as const,
    },
    {
      icon: 'lucide:calendar-clock',
      label: 'Última confirmação',
      value: formatDateTimePtBR(d.lastResponseAt),
      tone: 'default' as const,
    },
    {
      icon: 'lucide:sun',
      label: 'Confirmações hoje',
      value: d.respondedToday,
      tone: 'success' as const,
    },
    {
      icon: 'lucide:calendar-days',
      label: 'Confirmações esta semana',
      value: d.respondedThisWeek,
      tone: 'success' as const,
    },
    {
      icon: 'lucide:percent',
      label: 'Taxa de resposta',
      value: `${d.responseRatePercent}%`,
      tone: 'primary' as const,
    },
    {
      icon: 'lucide:timer',
      label: 'Tempo médio até responder',
      value: d.avgHoursToRespond !== null ? `${d.avgHoursToRespond}h` : '—',
      tone: 'default' as const,
    },
    {
      icon: 'lucide:eye',
      label: 'Visualizaram e ainda não responderam',
      value: d.viewedNotResponded,
      tone: 'warning' as const,
    },
  ]
})
</script>

<template>
  <AdminSection title="Dashboard" description="Visão consolidada do casamento.">
    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <UiSkeleton v-for="n in 8" :key="n" class="h-24 w-full" />
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
      <div>
        <h2 class="mb-3 text-lg font-medium text-text">Ações rápidas</h2>
        <div class="grid grid-cols-2 gap-3 md:grid-cols-4">
          <AdminQuickAction
            icon="lucide:user-plus"
            label="Novo convidado"
            to="/admin/convidados/novo"
          />
          <AdminQuickAction
            icon="lucide:settings"
            label="Editar evento"
            to="/admin/configuracoes"
          />
          <AdminQuickAction icon="lucide:gift" label="Novo presente" to="/admin/presentes" />
          <AdminQuickAction
            v-if="wedding?.slug"
            icon="lucide:external-link"
            label="Ver site público"
            :to="`/${wedding.slug}`"
          />
        </div>
      </div>

      <UiCard
        variant="highlight"
        class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-medium text-text">Prazo de RSVP</p>
          <p class="text-sm text-text-muted">{{ formatDeadline(data.rsvpDeadline) }}</p>
        </div>
      </UiCard>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">Convites</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <AdminStatCard
            v-for="(stat, i) in inviteStats"
            :key="stat.label"
            v-motion
            :initial="{ opacity: 0, y: 12 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 300, delay: i * 40 } }"
            v-bind="stat"
          />
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">Pessoas</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          <AdminStatCard
            v-for="(stat, i) in peopleStats"
            :key="stat.label"
            v-motion
            :initial="{ opacity: 0, y: 12 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 300, delay: i * 40 } }"
            v-bind="stat"
          />
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">RSVP</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <AdminStatCard
            v-for="(stat, i) in rsvpStats"
            :key="stat.label"
            v-motion
            :initial="{ opacity: 0, y: 12 }"
            :enter="{ opacity: 1, y: 0, transition: { duration: 300, delay: i * 40 } }"
            v-bind="stat"
          />
        </div>
      </div>

      <UiCard v-if="targetDateTime" variant="highlight" class="flex flex-col gap-3">
        <p class="text-sm font-medium text-text">Contagem regressiva</p>
        <UiCountdownTimer :target-date-time="targetDateTime">
          <template #past>
            <p class="text-sm font-medium text-primary">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </UiCard>
    </template>
  </AdminSection>
</template>
