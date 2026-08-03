<script setup lang="ts">
import QRCode from 'qrcode'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const inviteId = computed(() => route.params.id as string)

const {
  getInvite,
  updateInvite,
  addGuestsToInvite,
  removeGuestFromInvite,
  markInviteSent,
  setInviteArchived,
  getInviteTimeline,
} = useInvites()
const { getStatus, generate, revoke } = useGuestAccessTokens()
const { listGuests } = useGuests()
const { listInviteTags, createInviteTag, deleteInviteTag } = useInviteTags()
const toast = useToast()

const { data: invite, refresh: refreshInvite } = getInvite(inviteId)
const { data: timeline, refresh: refreshTimeline } = getInviteTimeline(inviteId)
const { data: tagsData, refresh: refreshTags } = listInviteTags()

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

// --- adicionar convidado + sugestão de acompanhantes ---

const isAddGuestModalOpen = ref(false)
const guestSearch = ref('')
const { data: candidatesData } = listGuests(
  computed(() => ({ unassigned: true, search: guestSearch.value.trim() || undefined, pageSize: 10 })),
)

const selectedCandidateId = ref<string | null>(null)
const suggestedSiblings = ref<Array<{ id: string; full_name: string }>>([])
const checkedSiblingIds = ref<Set<string>>(new Set())

async function selectCandidate(id: string) {
  selectedCandidateId.value = id
  const detail = await $fetch<{ partyMembers: Array<{ id: string; full_name: string }> }>(
    `/api/guests/${id}`,
  )
  suggestedSiblings.value = detail.partyMembers ?? []
  checkedSiblingIds.value = new Set(suggestedSiblings.value.map((s) => s.id))
}

async function confirmAddGuest() {
  if (!invite.value || !selectedCandidateId.value) return
  const guestIds = [selectedCandidateId.value, ...checkedSiblingIds.value]
  try {
    await addGuestsToInvite(invite.value.id, guestIds)
    isAddGuestModalOpen.value = false
    selectedCandidateId.value = null
    suggestedSiblings.value = []
    await refreshInvite()
    await refreshTimeline()
  } catch (err) {
    const apiError = err as { data?: { message?: string } }
    toast.error(apiError.data?.message ?? 'Não foi possível adicionar o convidado.')
  }
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

// --- etiquetas ---

const newTagName = ref('')

function isTagSelected(tagId: string) {
  return invite.value?.tags.some((t) => t.id === tagId) ?? false
}

async function toggleTag(tagId: string) {
  if (!invite.value) return
  const currentIds = invite.value.tags.map((t) => t.id)
  const nextIds = isTagSelected(tagId) ? currentIds.filter((id) => id !== tagId) : [...currentIds, tagId]
  await updateInvite(invite.value.id, {
    name: invite.value.name,
    notes: invite.value.notes ?? '',
    responsibleGuestId: invite.value.responsible_guest_id ?? '',
    tagIds: nextIds,
  })
  await refreshInvite()
}

async function addNewTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await createInviteTag({ name })
    await refreshTags()
    await toggleTag(tag.id)
    newTagName.value = ''
  } catch {
    toast.error('Não foi possível criar a etiqueta.')
  }
}

const deleteTagTarget = ref<{ id: string; name: string } | null>(null)
const isDeleteTagModalOpen = ref(false)
const isDeletingTag = ref(false)

function openDeleteTagModal(tag: { id: string; name: string }) {
  deleteTagTarget.value = tag
  isDeleteTagModalOpen.value = true
}

async function confirmDeleteTag() {
  if (!deleteTagTarget.value) return
  isDeletingTag.value = true
  try {
    await deleteInviteTag(deleteTagTarget.value.id)
    await refreshTags()
    await refreshInvite()
    isDeleteTagModalOpen.value = false
    deleteTagTarget.value = null
  } catch {
    toast.error('Não foi possível excluir a etiqueta.')
  } finally {
    isDeletingTag.value = false
  }
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

// --- link de acesso + QR ---

const isAccessLinkModalOpen = ref(false)
const isLoadingAccessLinkStatus = ref(false)
const isGeneratingAccessLink = ref(false)
const accessLinkStatus = ref<{ active: boolean; id: string | null; createdAt: string | null } | null>(null)
const generatedAccessLink = ref<string | null>(null)
const qrCodeDataUrl = ref<string | null>(null)
const accessLinkErrorMessage = ref<string | null>(null)

async function openAccessLinkModal() {
  if (!invite.value) return
  accessLinkErrorMessage.value = null
  generatedAccessLink.value = null
  qrCodeDataUrl.value = null
  isAccessLinkModalOpen.value = true
  isLoadingAccessLinkStatus.value = true
  try {
    accessLinkStatus.value = await getStatus({ inviteId: invite.value.id })
  } catch {
    accessLinkErrorMessage.value = 'Não foi possível consultar o status do link.'
  } finally {
    isLoadingAccessLinkStatus.value = false
  }
}

async function handleGenerateAccessLink() {
  if (!invite.value) return
  isGeneratingAccessLink.value = true
  accessLinkErrorMessage.value = null
  try {
    const result = await generate({ inviteId: invite.value.id })
    generatedAccessLink.value = `${window.location.origin}/rsvp/${result.code}`
    qrCodeDataUrl.value = await QRCode.toDataURL(generatedAccessLink.value)
    accessLinkStatus.value = { active: true, id: result.id, createdAt: result.createdAt }
    await refreshTimeline()
  } catch {
    accessLinkErrorMessage.value = 'Não foi possível gerar o link. Tente novamente.'
  } finally {
    isGeneratingAccessLink.value = false
  }
}

async function handleRevokeAccessLink() {
  if (!accessLinkStatus.value?.id) return
  isGeneratingAccessLink.value = true
  try {
    await revoke(accessLinkStatus.value.id)
    accessLinkStatus.value = { active: false, id: null, createdAt: null }
    generatedAccessLink.value = null
    qrCodeDataUrl.value = null
  } finally {
    isGeneratingAccessLink.value = false
  }
}

async function copyAccessLink() {
  if (!generatedAccessLink.value) return
  await navigator.clipboard.writeText(generatedAccessLink.value)
  toast.success('Link copiado.')
}

// --- timeline ---

const eventIcon: Record<string, string> = {
  'invite.created': 'lucide:file-plus',
  'token.generated': 'lucide:link',
  'token.sent': 'lucide:send',
  'rsvp.first_access': 'lucide:eye',
  'rsvp.guest_status_changed': 'lucide:check-circle',
  'rsvp.message_sent': 'lucide:message-circle',
  'invite.archived': 'lucide:archive',
  'invite.unarchived': 'lucide:archive-restore',
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div v-if="invite" class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">{{ invite.name }}</h1>
        <div class="mt-1 flex items-center gap-2">
          <UiBadge :tone="statusTone[invite.responseStatus]">{{ statusLabel[invite.responseStatus] }}</UiBadge>
          <UiBadge v-if="invite.archived_at" tone="neutral">arquivado</UiBadge>
          <UiBadge v-if="invite.status === 'sent'" tone="success">enviado</UiBadge>
        </div>
      </div>
      <div class="flex gap-2">
        <UiButton variant="outline" @click="openAccessLinkModal">Link de acesso</UiButton>
        <UiButton v-if="invite.status !== 'sent'" variant="outline" @click="handleMarkSent">
          Marcar como enviado
        </UiButton>
        <UiButton variant="ghost" @click="handleToggleArchive">
          {{ invite.archived_at ? 'Desarquivar' : 'Arquivar' }}
        </UiButton>
      </div>
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
            <UiButton size="sm" variant="ghost" :to="`/admin/convidados/${member.id}`">Editar</UiButton>
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

    <UiCard>
      <template #header>
        <h2 class="text-lg font-medium text-text">Etiquetas</h2>
      </template>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="tag in tagsData?.data ?? []"
          :key="tag.id"
          class="inline-flex items-center gap-1 rounded-full border pl-3 pr-1 text-xs"
          :class="
            isTagSelected(tag.id)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-text-muted'
          "
        >
          <button type="button" class="py-1" @click="toggleTag(tag.id)">{{ tag.name }}</button>
          <button
            type="button"
            class="rounded-full p-0.5 opacity-70 hover:opacity-100"
            :aria-label="`Excluir etiqueta ${tag.name}`"
            @click="openDeleteTagModal(tag)"
          >
            <Icon name="lucide:x" class="h-3 w-3" />
          </button>
        </span>
      </div>
      <div class="mt-3 flex items-center gap-2">
        <UiInput v-model="newTagName" placeholder="Nova etiqueta" class="max-w-xs" />
        <UiButton size="sm" variant="ghost" @click="addNewTag">Adicionar</UiButton>
      </div>
    </UiCard>

    <UiCard>
      <template #header>
        <h2 class="text-lg font-medium text-text">Linha do Tempo</h2>
      </template>
      <ol class="flex flex-col gap-3">
        <li v-for="ev in timeline?.data ?? []" :key="ev.id" class="flex items-start gap-3 text-sm">
          <Icon :name="eventIcon[ev.event_type] ?? 'lucide:circle'" class="mt-0.5 h-4 w-4 text-text-muted" />
          <div>
            <p class="text-text">{{ ev.event_type }}</p>
            <p class="text-xs text-text-muted">{{ formatDateTime(ev.occurred_at) }}</p>
          </div>
        </li>
        <li v-if="!timeline?.data.length" class="text-sm text-text-muted">Nenhum evento registrado ainda.</li>
      </ol>
    </UiCard>

    <UiModal v-model="isAddGuestModalOpen" title="Adicionar convidado" size="lg">
      <div class="flex flex-col gap-4">
        <UiInput v-model="guestSearch" placeholder="Buscar convidado sem convite" />
        <ul class="flex max-h-40 flex-col gap-1 overflow-y-auto">
          <li v-for="candidate in candidatesData?.data ?? []" :key="candidate.id">
            <button
              type="button"
              class="w-full rounded-md border px-3 py-2 text-left text-sm"
              :class="
                selectedCandidateId === candidate.id
                  ? 'border-primary bg-surface-muted'
                  : 'border-border'
              "
              @click="selectCandidate(candidate.id)"
            >
              {{ candidate.full_name }}
            </button>
          </li>
        </ul>

        <div v-if="suggestedSiblings.length" class="rounded-md border border-border p-3">
          <p class="mb-2 text-sm text-text">
            Encontramos {{ suggestedSiblings.length }} acompanhante(s) vinculado(s) — adicionar
            também?
          </p>
          <label
            v-for="sibling in suggestedSiblings"
            :key="sibling.id"
            class="flex items-center gap-2 text-sm text-text"
          >
            <input
              type="checkbox"
              :checked="checkedSiblingIds.has(sibling.id)"
              @change="
                ($event.target as HTMLInputElement).checked
                  ? checkedSiblingIds.add(sibling.id)
                  : checkedSiblingIds.delete(sibling.id)
              "
            />
            {{ sibling.full_name }}
          </label>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="isAddGuestModalOpen = false">Cancelar</UiButton>
        <UiButton :disabled="!selectedCandidateId" @click="confirmAddGuest">Adicionar</UiButton>
      </template>
    </UiModal>

    <UiModal v-model="isAccessLinkModalOpen" title="Link de acesso" size="lg">
      <div class="flex flex-col gap-4">
        <UiSkeleton v-if="isLoadingAccessLinkStatus" class="h-10 w-full" />
        <template v-else>
          <template v-if="generatedAccessLink">
            <p class="text-sm text-text-muted">
              Copie agora — este link não pode ser recuperado depois de fechar esta janela.
            </p>
            <div class="flex items-center gap-2">
              <UiInput :model-value="generatedAccessLink" class="flex-1" disabled />
              <UiButton type="button" size="sm" @click="copyAccessLink">Copiar</UiButton>
            </div>
            <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="QR Code do link de acesso" class="h-40 w-40" />
          </template>
          <p v-else-if="accessLinkStatus?.active" class="text-sm text-text-muted">
            Link ativo. Por segurança, o código não pode ser exibido novamente — gere um novo link
            se precisar reenviar.
          </p>
          <p v-else class="text-sm text-text-muted">Nenhum link de acesso gerado ainda.</p>
          <p v-if="accessLinkErrorMessage" class="text-sm text-red-600" role="alert">
            {{ accessLinkErrorMessage }}
          </p>
        </template>
      </div>
      <template #footer>
        <UiButton
          v-if="accessLinkStatus?.active"
          type="button"
          variant="destructive"
          :disabled="isGeneratingAccessLink"
          @click="handleRevokeAccessLink"
        >
          Revogar
        </UiButton>
        <UiButton
          type="button"
          :disabled="isGeneratingAccessLink || isLoadingAccessLinkStatus"
          @click="handleGenerateAccessLink"
        >
          {{ accessLinkStatus?.active ? 'Gerar novo link' : 'Gerar link' }}
        </UiButton>
      </template>
    </UiModal>

    <UiModal v-model="isDeleteTagModalOpen" title="Excluir etiqueta">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir a etiqueta <strong>{{ deleteTagTarget?.name }}</strong>? Ela
        será removida de todos os convites que a usam.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeletingTag" @click="isDeleteTagModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeletingTag" @click="confirmDeleteTag">
          Excluir
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
