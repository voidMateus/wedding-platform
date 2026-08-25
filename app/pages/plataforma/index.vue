<script setup lang="ts">
import { formatDatePtBR } from '#shared/utils/format-date'
import type { StatusCicloVida } from '~/types/wedding'

definePageMeta({ layout: 'plataforma' })

const { getOverview } = usePlatformOverview()
const { data, status, error, refresh } = getOverview()

const statusLabel: Record<StatusCicloVida, string> = {
  rascunho: 'Rascunho',
  publicado: 'Publicado',
  arquivado: 'Arquivado',
}
const statusTone: Record<StatusCicloVida, 'neutral' | 'success' | 'warning'> = {
  rascunho: 'neutral',
  publicado: 'success',
  arquivado: 'warning',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <h1 class="text-lg font-semibold text-text">Casamentos</h1>
      <p class="mt-1 text-sm text-text-muted">
        Visão entre contas para a equipe da plataforma — {{ data?.data.length ?? 0 }} casamento(s).
      </p>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="error"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar a visão da plataforma"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
    </UiEmptyState>

    <UiTable v-else>
      <template #head>
        <th class="px-4 py-2 font-medium">Casal</th>
        <th class="px-4 py-2 font-medium">Slug</th>
        <th class="px-4 py-2 font-medium">Status</th>
        <th class="px-4 py-2 font-medium">Convidados</th>
        <th class="px-4 py-2 font-medium">Dono(s)</th>
        <th class="px-4 py-2 font-medium">Criado em</th>
      </template>
      <tr
        v-for="wedding in data?.data"
        :key="wedding.id"
        class="border-t border-border transition-brand hover:bg-surface-muted/60"
      >
        <td class="px-4 py-2 text-text">{{ wedding.nomesNoivos }}</td>
        <td class="px-4 py-2 text-text-muted">{{ wedding.slug }}</td>
        <td class="px-4 py-2">
          <UiBadge :tone="statusTone[wedding.statusCicloVida]">
            {{ statusLabel[wedding.statusCicloVida] }}
          </UiBadge>
        </td>
        <td class="px-4 py-2 text-text-muted">{{ wedding.contagemConvidados }}</td>
        <td class="px-4 py-2 text-text-muted">{{ wedding.donoEmails.join(', ') || '—' }}</td>
        <td class="px-4 py-2 text-text-muted">{{ formatDatePtBR(wedding.createdAt) }}</td>
      </tr>
    </UiTable>
  </div>
</template>
