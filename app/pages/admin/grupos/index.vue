<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { guestGroupInputSchema } from '#shared/schemas/guest-groups'
import type { GuestGroup } from '~/types/guest-group'
import type { GuestAccessTokenStatus } from '~/types/guest-access-token'

definePageMeta({ layout: 'admin' })

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

const { listGuestGroups, createGuestGroup, updateGuestGroup, deleteGuestGroup } = useGuestGroups()
const { data, status, refresh } = listGuestGroups()
const { getStatus, generate, revoke } = useGuestAccessTokens()

// --- criar/editar ---

const isFormModalOpen = ref(false)
const editingGroup = ref<GuestGroup | null>(null)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(guestGroupInputSchema),
  initialValues: { name: '', maxMembers: 0, notes: '' },
})

const [name] = defineField('name')
const [maxMembers] = defineField('maxMembers')
const [notes] = defineField('notes')

// UiInput só trabalha com string (o <input> nativo, mesmo type="number",
// expõe .value como string) — maxMembers no form é number (schema com
// z.coerce.number()), daí o proxy de string aqui.
const maxMembersText = computed({
  get: () => (maxMembers.value === undefined ? '' : String(maxMembers.value)),
  set: (value: string) => {
    maxMembers.value = value === '' ? undefined : Number(value)
  },
})

function openCreateModal() {
  editingGroup.value = null
  formErrorMessage.value = null
  resetForm({ values: { name: '', maxMembers: 0, notes: '' } })
  isFormModalOpen.value = true
}

function openEditModal(group: GuestGroup) {
  editingGroup.value = group
  formErrorMessage.value = null
  resetForm({
    values: { name: group.name, maxMembers: group.max_members, notes: group.notes ?? '' },
  })
  isFormModalOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    if (editingGroup.value) {
      await updateGuestGroup(editingGroup.value.id, values)
    } else {
      await createGuestGroup(values)
    }
    isFormModalOpen.value = false
    await refresh()
  } catch {
    formErrorMessage.value = 'Não foi possível salvar o grupo. Tente novamente.'
  }
})

// --- excluir ---

const deleteTarget = ref<GuestGroup | null>(null)
const isDeleteModalOpen = ref(false)
const deleteErrorMessage = ref<string | null>(null)
const showCascadeConfirm = ref(false)
const isDeleting = ref(false)

function openDeleteModal(group: GuestGroup) {
  deleteTarget.value = group
  deleteErrorMessage.value = null
  showCascadeConfirm.value = false
  isDeleteModalOpen.value = true
}

async function confirmDelete(cascade = false) {
  if (!deleteTarget.value) return
  isDeleting.value = true
  deleteErrorMessage.value = null
  try {
    await deleteGuestGroup(deleteTarget.value.id, { cascade })
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    showCascadeConfirm.value = false
    await refresh()
  } catch (err) {
    if (isApiError(err) && err.statusCode === 409) {
      showCascadeConfirm.value = true
      deleteErrorMessage.value = err.data?.message ?? 'Este grupo tem convidados associados.'
    } else {
      deleteErrorMessage.value = 'Não foi possível excluir o grupo. Tente novamente.'
    }
  } finally {
    isDeleting.value = false
  }
}

// --- link de acesso ---

const accessLinkTarget = ref<GuestGroup | null>(null)
const isAccessLinkModalOpen = ref(false)
const isLoadingAccessLinkStatus = ref(false)
const isGeneratingAccessLink = ref(false)
const accessLinkStatus = ref<GuestAccessTokenStatus | null>(null)
const generatedAccessLink = ref<string | null>(null)
const accessLinkErrorMessage = ref<string | null>(null)
const accessLinkCopyFeedback = ref<string | null>(null)

async function openAccessLinkModal(group: GuestGroup) {
  accessLinkTarget.value = group
  accessLinkErrorMessage.value = null
  accessLinkCopyFeedback.value = null
  generatedAccessLink.value = null
  isAccessLinkModalOpen.value = true
  isLoadingAccessLinkStatus.value = true
  try {
    accessLinkStatus.value = await getStatus({ groupId: group.id })
  } catch {
    accessLinkErrorMessage.value = 'Não foi possível consultar o status do link.'
  } finally {
    isLoadingAccessLinkStatus.value = false
  }
}

async function handleGenerateAccessLink() {
  if (!accessLinkTarget.value) return
  isGeneratingAccessLink.value = true
  accessLinkErrorMessage.value = null
  try {
    const result = await generate({ groupId: accessLinkTarget.value.id })
    generatedAccessLink.value = `${window.location.origin}/rsvp/${result.code}`
    accessLinkStatus.value = { active: true, id: result.id, createdAt: result.createdAt }
  } catch {
    accessLinkErrorMessage.value = 'Não foi possível gerar o link. Tente novamente.'
  } finally {
    isGeneratingAccessLink.value = false
  }
}

async function handleRevokeAccessLink() {
  if (!accessLinkStatus.value?.id) return
  isGeneratingAccessLink.value = true
  accessLinkErrorMessage.value = null
  try {
    await revoke(accessLinkStatus.value.id)
    accessLinkStatus.value = { active: false, id: null, createdAt: null }
    generatedAccessLink.value = null
  } catch {
    accessLinkErrorMessage.value = 'Não foi possível revogar o link. Tente novamente.'
  } finally {
    isGeneratingAccessLink.value = false
  }
}

async function copyAccessLink() {
  if (!generatedAccessLink.value) return
  await navigator.clipboard.writeText(generatedAccessLink.value)
  accessLinkCopyFeedback.value = 'Link copiado.'
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">Grupos</h1>
        <p class="mt-1 text-sm text-text-muted">
          Organize os convidados em grupos e defina o limite de acompanhantes de cada um.
        </p>
      </div>
      <UiButton @click="openCreateModal">Novo grupo</UiButton>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum grupo cadastrado ainda"
      description="Crie o primeiro grupo para começar a organizar os convidados."
    >
      <UiButton @click="openCreateModal">Novo grupo</UiButton>
    </UiEmptyState>

    <UiTable v-else>
      <template #head>
        <th class="px-4 py-2 font-medium">Nome</th>
        <th class="px-4 py-2 font-medium">Limite de acompanhantes</th>
        <th class="px-4 py-2 font-medium">Notas</th>
        <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
      </template>
      <tr v-for="group in data?.data" :key="group.id" class="border-t border-border">
        <td class="px-4 py-2 text-text">{{ group.name }}</td>
        <td class="px-4 py-2 text-text">{{ group.max_members }}</td>
        <td class="px-4 py-2 text-text-muted">{{ group.notes || '—' }}</td>
        <td class="px-4 py-2">
          <div class="flex justify-end gap-2">
            <UiButton size="sm" variant="ghost" @click="openAccessLinkModal(group)">
              Link de acesso
            </UiButton>
            <UiButton size="sm" variant="ghost" @click="openEditModal(group)">Editar</UiButton>
            <UiButton size="sm" variant="destructive" @click="openDeleteModal(group)">
              Excluir
            </UiButton>
          </div>
        </td>
      </tr>
    </UiTable>

    <UiModal v-model="isFormModalOpen" :title="editingGroup ? 'Editar grupo' : 'Novo grupo'">
      <form class="flex flex-col gap-4" @submit="onSubmit">
        <UiInput
          v-model="name"
          label="Nome"
          placeholder="Ex.: Família Silva"
          :error="errors.name"
        />
        <UiInput
          v-model="maxMembersText"
          type="number"
          label="Limite de acompanhantes"
          :error="errors.maxMembers"
        />
        <UiTextarea
          v-model="notes"
          label="Notas internas (opcional)"
          placeholder="Visível só para o casal e colaboradores"
          :error="errors.notes"
        />
        <p v-if="formErrorMessage" class="text-sm text-red-600" role="alert">
          {{ formErrorMessage }}
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isFormModalOpen = false">
            Cancelar
          </UiButton>
          <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="isDeleteModalOpen" title="Excluir grupo">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir o grupo <strong>{{ deleteTarget?.name }}</strong
        >?
      </p>
      <p v-if="deleteErrorMessage" class="mt-3 text-sm text-red-600" role="alert">
        {{ deleteErrorMessage }}
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton
          v-if="showCascadeConfirm"
          variant="destructive"
          :disabled="isDeleting"
          @click="confirmDelete(true)"
        >
          Excluir mesmo assim (remove os convidados do grupo)
        </UiButton>
        <UiButton v-else variant="destructive" :disabled="isDeleting" @click="confirmDelete(false)">
          Excluir
        </UiButton>
      </template>
    </UiModal>

    <UiModal
      v-model="isAccessLinkModalOpen"
      :title="`Link de acesso — ${accessLinkTarget?.name ?? ''}`"
      description="Envie este link ao grupo (ex.: WhatsApp) para que confirmem presença sem precisar de conta."
    >
      <div class="flex flex-col gap-4">
        <UiSkeleton v-if="isLoadingAccessLinkStatus" class="h-10 w-full" />

        <template v-else>
          <p v-if="generatedAccessLink" class="text-sm text-text-muted">
            Copie agora — este link não pode ser recuperado depois de fechar esta janela.
          </p>
          <div v-if="generatedAccessLink" class="flex items-center gap-2">
            <UiInput :model-value="generatedAccessLink" class="flex-1" disabled />
            <UiButton type="button" size="sm" @click="copyAccessLink">Copiar</UiButton>
          </div>
          <p v-else-if="accessLinkStatus?.active" class="text-sm text-text-muted">
            Link ativo, gerado em {{ formatDate(accessLinkStatus.createdAt) }}. Por segurança, o
            código não pode ser exibido novamente — gere um novo link se precisar reenviar.
          </p>
          <p v-else class="text-sm text-text-muted">Nenhum link de acesso gerado ainda.</p>

          <p v-if="accessLinkCopyFeedback" class="text-sm text-green-700" role="status">
            {{ accessLinkCopyFeedback }}
          </p>
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
  </div>
</template>
