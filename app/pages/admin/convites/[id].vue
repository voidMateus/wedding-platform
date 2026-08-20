<script setup lang="ts">
import { formatDateTimePtBR } from '#shared/utils/format-date'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const inviteId = computed(() => route.params.id as string)

const {
  getInvite,
  updateInvite,
  removeGuestFromInvite,
  markInviteSent,
  setInviteArchived,
  getInviteTimeline,
} = useInvites()
const { getWedding } = useWedding()
const toast = useToast()

// Mesma chave 'wedding' já usada pelo layout admin (useWedding.ts) — dedup
// automático, sem fetch extra. Precisamos do slug para montar o link
// público correto (CLAUDE.md, seção 4.4/33: cada casamento tem sua URL).
const { data: wedding } = getWedding()

const { data: invite, refresh: refreshInvite } = getInvite(inviteId)
const { data: timeline, refresh: refreshTimeline } = getInviteTimeline(inviteId)

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  partial: 'Parcialmente respondido',
  responded: 'Respondido',
}
const statusTone: Record<string, 'neutral' | 'warning' | 'success'> = {
  pending: 'neutral',
  partial: 'warning',
  responded: 'success',
}
const rsvpStatusLabel: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Estará lá',
  declined: 'Não poderá ir',
  waitlisted: 'Em espera',
  removed: 'Removido',
}

// --- responsável ---

async function makeResponsible(guestId: string) {
  if (!invite.value) return
  await updateInvite(invite.value.id, {
    name: invite.value.name,
    notes: invite.value.notes ?? '',
    responsibleGuestId: guestId,
  })
  await refreshInvite()
  toast.success('Responsável atualizado.')
}

async function handleRemoveGuest(guestId: string) {
  if (!invite.value) return
  await removeGuestFromInvite(invite.value.id, guestId)
  await refreshInvite()
}

const isAddGuestModalOpen = ref(false)
async function handleGuestAdded() {
  await refreshInvite()
  await refreshTimeline()
}

// --- notas internas ---

const notesDraft = ref('')
watch(
  invite,
  (value) => {
    if (value) notesDraft.value = value.notes ?? ''
  },
  { immediate: true },
)

async function saveNotes() {
  if (!invite.value) return
  await updateInvite(invite.value.id, {
    name: invite.value.name,
    notes: notesDraft.value,
    responsibleGuestId: invite.value.responsible_guest_id ?? '',
    tagIds: invite.value.tags.map((t) => t.id),
  })
  await refreshInvite()
  toast.success('Observações salvas.')
}

// --- status/arquivamento ---

async function handleMarkSent() {
  if (!invite.value) return
  await markInviteSent(invite.value.id)
  await refreshInvite()
  await refreshTimeline()
  toast.success('Convite marcado como enviado.')
}

async function handleToggleArchive() {
  if (!invite.value) return
  await setInviteArchived(invite.value.id, !invite.value.archived_at)
  await refreshInvite()
  await refreshTimeline()
}

// --- link de acesso ---

const isAccessLinkModalOpen = ref(false)

const eventIcon: Record<string, string> = {
  'invite.created': 'lucide:file-plus',
  'invite.token_generated': 'lucide:key',
  'invite.token_sent': 'lucide:send',
  'invite.token_revoked': 'lucide:key-off',
  'rsvp.first_access': 'lucide:eye',
  'rsvp.guest_status_changed': 'lucide:check-circle',
  'rsvp.message_sent': 'lucide:message-circle',
  'invite.archived': 'lucide:archive',
  'invite.unarchived': 'lucide:archive-restore',
}
</script>

<template>
  <AdminSection v-if="invite" :title="invite.name">
    <template #actions>
      <UiButton variant="outline" @click="isAccessLinkModalOpen = true">Link de acesso</UiButton>
      <UiButton v-if="invite.status !== 'sent'" variant="outline" @click="handleMarkSent">
        Marcar como enviado
      </UiButton>
      <UiButton variant="ghost" @click="handleToggleArchive">
        {{ invite.archived_at ? 'Desarquivar' : 'Arquivar' }}
      </UiButton>
    </template>

    <div class="-mt-2 flex items-center gap-2">
      <UiBadge :tone="statusTone[invite.responseStatus]">{{
        statusLabel[invite.responseStatus]
      }}</UiBadge>
      <UiBadge v-if="invite.archived_at" tone="neutral">arquivado</UiBadge>
      <UiBadge v-if="invite.status === 'sent'" tone="success">enviado</UiBadge>
    </div>

    <UiCard>
      <template #header>
        <h2 class="text-lg font-medium text-text">Convidados</h2>
        <UiButton size="sm" @click="isAddGuestModalOpen = true">+ Adicionar convidado</UiButton>
      </template>

      <ul class="flex flex-col gap-2">
        <li
          v-for="member in invite.members"
          :key="member.id"
          class="flex items-center justify-between rounded-md border border-border px-3 py-2"
        >
          <span class="inline-flex items-center gap-2 text-sm text-text">
            <Icon
              :name="member.isResponsible ? 'lucide:star' : 'lucide:circle'"
              class="h-4 w-4"
              :class="member.isResponsible ? 'text-amber-500' : 'text-text-muted'"
            />
            {{ member.fullName }}
            <span v-if="member.isResponsible" class="text-xs text-text-muted">(Responsável)</span>
            <UiBadge tone="neutral">{{ rsvpStatusLabel[member.rsvpStatus] }}</UiBadge>
          </span>
          <div class="flex gap-2">
            <UiButton
              v-if="!member.isResponsible"
              size="sm"
              variant="ghost"
              @click="makeResponsible(member.id)"
            >
              Tornar responsável
            </UiButton>
            <UiButton size="sm" variant="ghost" :to="`/admin/convidados/${member.id}`"
              >Editar</UiButton
            >
            <UiButton size="sm" variant="destructive" @click="handleRemoveGuest(member.id)">
              Remover
            </UiButton>
          </div>
        </li>
      </ul>
    </UiCard>

    <UiCard>
      <template #header>
        <h2 class="text-lg font-medium text-text">Observações internas</h2>
      </template>
      <UiTextarea v-model="notesDraft" placeholder="Nunca exibidas ao convidado — ex.: Mesa VIP" />
      <div class="mt-2 flex justify-end">
        <UiButton size="sm" @click="saveNotes">Salvar</UiButton>
      </div>
    </UiCard>

    <AdminInvitesTagsCard :invite="invite" @changed="refreshInvite" />

    <UiCard>
      <template #header>
        <h2 class="text-lg font-medium text-text">Linha do Tempo</h2>
      </template>
      <ol class="flex flex-col gap-3">
        <li v-for="ev in timeline?.data ?? []" :key="ev.id" class="flex items-start gap-3 text-sm">
          <Icon
            :name="eventIcon[ev.event_type] ?? 'lucide:circle'"
            class="mt-0.5 h-4 w-4 text-text-muted"
          />
          <div>
            <p class="text-text">{{ ev.event_type }}</p>
            <p class="text-xs text-text-muted">{{ formatDateTimePtBR(ev.occurred_at) }}</p>
          </div>
        </li>
        <li v-if="!timeline?.data.length" class="text-sm text-text-muted">
          Nenhum evento registrado ainda.
        </li>
      </ol>
    </UiCard>

    <AdminInvitesAddGuestModal
      v-model="isAddGuestModalOpen"
      :invite-id="invite.id"
      @added="handleGuestAdded"
    />

    <AdminInvitesAccessLinkModal
      v-model="isAccessLinkModalOpen"
      :invite-id="invite.id"
      :wedding-slug="wedding?.slug"
      @generated="refreshTimeline"
    />
  </AdminSection>
</template>
