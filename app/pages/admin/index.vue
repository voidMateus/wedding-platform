<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { getSummary } = useDashboard()
const { data, status } = getSummary()

const confirmedPercent = computed(() => {
  if (!data.value || data.value.totalInvitedUnits === 0) return 0
  return Math.round((data.value.responsesConfirmed / data.value.totalInvitedUnits) * 100)
})

const invitedUnitLabel = computed(() =>
  data.value?.rsvpMode === 'per_guest' ? 'convidados' : 'grupos',
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-text">Dashboard</h1>
      <p class="mt-1 text-sm text-text-muted">Visão consolidada do casamento.</p>
    </div>

    <div v-if="status === 'pending'" class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <UiSkeleton v-for="n in 4" :key="n" class="h-24 w-full" />
    </div>

    <template v-else-if="data">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="text-sm text-text-muted">Confirmados</p>
          <p class="mt-1 text-2xl font-semibold text-text">
            {{ data.responsesConfirmed }}
            <span class="text-sm font-normal text-text-muted">/ {{ data.totalInvitedUnits }}</span>
          </p>
          <p class="mt-1 text-xs text-text-muted">{{ confirmedPercent }}% dos {{ invitedUnitLabel }}</p>
        </div>

        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="text-sm text-text-muted">Recusados</p>
          <p class="mt-1 text-2xl font-semibold text-text">{{ data.responsesDeclined }}</p>
        </div>

        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="text-sm text-text-muted">Pendentes</p>
          <p class="mt-1 text-2xl font-semibold text-text">{{ data.responsesPending }}</p>
        </div>

        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="text-sm text-text-muted">Acompanhantes confirmados</p>
          <p class="mt-1 text-2xl font-semibold text-text">{{ data.totalCompanionsConfirmed }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-medium text-text">Prazo de RSVP</p>
          <p class="text-sm text-text-muted">{{ formatDeadline(data.rsvpDeadline) }}</p>
        </div>
        <UiBadge :tone="data.rsvpMode === 'per_group' ? 'neutral' : 'neutral'">
          Modo: {{ data.rsvpMode === 'per_group' ? 'por grupo' : 'por convidado' }}
        </UiBadge>
      </div>

      <p class="text-sm text-text-muted">
        {{ data.totalGuests }} convidado{{ data.totalGuests === 1 ? '' : 's' }} cadastrado{{
          data.totalGuests === 1 ? '' : 's'
        }}
        em {{ data.totalGroups }} grupo{{ data.totalGroups === 1 ? '' : 's' }}.
      </p>
    </template>
  </div>
</template>
