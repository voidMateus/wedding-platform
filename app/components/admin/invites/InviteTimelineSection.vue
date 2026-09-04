<script setup lang="ts">
import { formatDateTimePtBR } from '#shared/utils/format-date'
import { describeInviteEvent, type InviteEventPresentation } from '~/utils/invite-timeline'
import type { InviteEvent, InviteMember } from '~/types/invite'

const TONE_CLASSES: Record<InviteEventPresentation['tone'], string> = {
  muted: 'text-text-muted',
  success: 'text-success',
  danger: 'text-danger',
}

interface Props {
  events: readonly InviteEvent[]
  /** Resolve o nome de quem respondeu — os metadados do evento só guardam o id. */
  members: readonly InviteMember[]
}

const props = defineProps<Props>()

const rows = computed(() =>
  props.events.map((event) => ({
    id: event.id,
    occurredAt: event.ocorrido_em,
    ...describeInviteEvent(event, props.members),
  })),
)
</script>

<template>
  <AdminInvitesInviteSection title="Linha do Tempo">
    <ol v-if="rows.length" class="flex flex-col gap-3">
      <li v-for="row in rows" :key="row.id" class="flex items-start gap-3 text-sm">
        <Icon
          :name="row.icon"
          class="mt-0.5 h-4 w-4 shrink-0"
          :class="TONE_CLASSES[row.tone]"
          aria-hidden="true"
        />
        <div class="min-w-0">
          <p class="text-text">{{ row.label }}</p>
          <p class="text-xs text-text-muted">{{ formatDateTimePtBR(row.occurredAt) }}</p>
        </div>
      </li>
    </ol>
    <p v-else class="text-sm text-text-muted">
      Nada aconteceu com este convite ainda. Cada passo — link gerado, convite enviado, convidado
      abrindo e respondendo — aparece aqui automaticamente.
    </p>
  </AdminInvitesInviteSection>
</template>
