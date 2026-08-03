<script setup lang="ts">
import { resolveEventDateTime } from '#shared/utils/event-datetime'

definePageMeta({ layout: 'admin' })

const { getSummary } = useDashboard()
const { data, status } = getSummary()

// Mesma chave 'wedding' do layout admin (useWedding.ts) — dedup automático,
// sem fetch extra.
const { getWedding } = useWedding()
const { data: wedding } = getWedding()

const targetDateTime = computed(() =>
  wedding.value ? resolveEventDateTime(wedding.value.event_date, wedding.value.event_time).toISOString() : null,
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

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-text">Dashboard</h1>
      <p class="mt-1 text-sm text-text-muted">Visão consolidada do casamento.</p>
    </div>

    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <UiSkeleton v-for="n in 8" :key="n" class="h-24 w-full" />
    </div>

    <template v-else-if="data">
      <UiCard class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-text">Prazo de RSVP</p>
          <p class="text-sm text-text-muted">{{ formatDeadline(data.rsvpDeadline) }}</p>
        </div>
      </UiCard>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">Convites</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <UiCard>
            <p class="text-sm text-text-muted">Total</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.total }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Enviados</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.sent }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Respondidos</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.responded }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Parcialmente respondidos</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.partial }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Pendentes</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.pending }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Arquivados</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.invites.archived }}</p>
          </UiCard>
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">Pessoas</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          <UiCard>
            <p class="text-sm text-text-muted">Total</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.total }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Confirmados</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.confirmed }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Recusados</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.declined }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Pendentes</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.pending }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Crianças</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.children }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Adultos</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.adults }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Padrinhos</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.padrinhos }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Madrinhas</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.people.madrinhas }}</p>
          </UiCard>
        </div>
      </div>

      <div>
        <h2 class="mb-3 text-lg font-medium text-text">RSVP</h2>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <UiCard>
            <p class="text-sm text-text-muted">Primeira confirmação</p>
            <p class="mt-1 text-sm font-semibold text-text">{{ formatDateTime(data.rsvp.firstResponseAt) }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Última confirmação</p>
            <p class="mt-1 text-sm font-semibold text-text">{{ formatDateTime(data.rsvp.lastResponseAt) }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Confirmações hoje</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.rsvp.respondedToday }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Confirmações esta semana</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.rsvp.respondedThisWeek }}</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Taxa de resposta</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.rsvp.responseRatePercent }}%</p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Tempo médio até responder</p>
            <p class="mt-1 text-2xl font-semibold text-text">
              {{ data.rsvp.avgHoursToRespond !== null ? `${data.rsvp.avgHoursToRespond}h` : '—' }}
            </p>
          </UiCard>
          <UiCard>
            <p class="text-sm text-text-muted">Visualizaram e ainda não responderam</p>
            <p class="mt-1 text-2xl font-semibold text-text">{{ data.rsvp.viewedNotResponded }}</p>
          </UiCard>
        </div>
      </div>

      <UiCard v-if="targetDateTime" class="flex flex-col gap-3">
        <p class="text-sm font-medium text-text">Contagem regressiva</p>
        <UiCountdownTimer :target-date-time="targetDateTime">
          <template #past>
            <p class="text-sm font-medium text-primary">O grande dia chegou!</p>
          </template>
        </UiCountdownTimer>
      </UiCard>
    </template>
  </div>
</template>
