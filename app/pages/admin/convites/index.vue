<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { inviteInputSchema } from '#shared/schemas/invites'

definePageMeta({ layout: 'admin' })

const { listInvites, createInvite, deleteInvite } = useInvites()

const page = ref(1)
const search = ref('')
const PAGE_SIZE = 25

const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: search.value.trim() || undefined,
}))

const { data, status, refresh } = listInvites(listParams)

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

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

// --- criar ---

const isFormModalOpen = ref(false)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(inviteInputSchema),
  initialValues: { name: '', notes: '' },
})

const [name] = defineField('name')
const [notes] = defineField('notes')

function openCreateModal() {
  formErrorMessage.value = null
  resetForm({ values: { name: '', notes: '' } })
  isFormModalOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    const created = await createInvite(values)
    isFormModalOpen.value = false
    await navigateTo(`/admin/convites/${created.id}`)
  } catch {
    formErrorMessage.value = 'Não foi possível criar o convite. Tente novamente.'
  }
})

// --- excluir ---

const deleteTargetId = ref<string | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(id: string) {
  deleteTargetId.value = id
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTargetId.value) return
  isDeleting.value = true
  try {
    await deleteInvite(deleteTargetId.value)
    isDeleteModalOpen.value = false
    deleteTargetId.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR')
}
</script>

<template>
  <AdminSection
    title="Convites"
    description="Quem recebeu o mesmo convite — gere o link/QR, acompanhe respostas e o responsável por cada um."
  >
    <template #actions>
      <UiButton @click="openCreateModal">Novo convite</UiButton>
    </template>

    <UiInput v-model="search" placeholder="Buscar por nome do convite" class="max-w-xs" />

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      icon="lucide:mail"
      title="Nenhum convite cadastrado ainda"
      description="Convites nascem automaticamente ao cadastrar convidados com acompanhantes, ou crie um manualmente."
    >
      <UiButton @click="openCreateModal">Novo convite</UiButton>
    </UiEmptyState>

    <template v-else>
      <UiTable>
        <template #head>
          <th class="px-4 py-2 font-medium">Convite</th>
          <th class="px-4 py-2 font-medium">Responsável</th>
          <th class="px-4 py-2 font-medium">Pessoas</th>
          <th class="px-4 py-2 font-medium">Status</th>
          <th class="px-4 py-2 font-medium">Enviado em</th>
          <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
        </template>
        <tr
          v-for="invite in data?.data"
          :key="invite.id"
          class="border-t border-border transition-brand hover:bg-surface-muted/60"
        >
          <td class="px-4 py-2 text-text">
            <NuxtLink :to="`/admin/convites/${invite.id}`" class="font-medium hover:underline">
              {{ invite.name }}
            </NuxtLink>
            <UiBadge v-if="invite.archived_at" tone="neutral" class="ml-2">arquivado</UiBadge>
          </td>
          <td class="px-4 py-2 text-text-muted">
            <span v-if="invite.responsibleGuestName" class="inline-flex items-center gap-1">
              <Icon name="lucide:star" class="h-3.5 w-3.5 text-amber-500" />
              {{ invite.responsibleGuestName }}
            </span>
            <span v-else>—</span>
          </td>
          <td class="px-4 py-2 text-text-muted">{{ invite.memberCount }}</td>
          <td class="px-4 py-2">
            <UiBadge :tone="statusTone[invite.responseStatus]">
              {{ statusLabel[invite.responseStatus] }}
            </UiBadge>
          </td>
          <td class="px-4 py-2 text-text-muted">{{ formatDate(invite.sent_at) }}</td>
          <td class="px-4 py-2">
            <div class="flex justify-end gap-2">
              <UiButton size="sm" variant="ghost" :to="`/admin/convites/${invite.id}`">
                Abrir
              </UiButton>
              <UiButton size="sm" variant="destructive" @click="openDeleteModal(invite.id)">
                Excluir
              </UiButton>
            </div>
          </td>
        </tr>
      </UiTable>

      <div class="flex items-center justify-between text-sm text-text-muted">
        <span>{{ data?.meta.total ?? 0 }} convite(s)</span>
        <div class="flex items-center gap-2">
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="page <= 1"
            @click="page = Math.max(1, page - 1)"
          >
            Anterior
          </UiButton>
          <span>Página {{ page }} de {{ totalPages }}</span>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="page >= totalPages"
            @click="page = Math.min(totalPages, page + 1)"
          >
            Próxima
          </UiButton>
        </div>
      </div>
    </template>

    <UiModal v-model="isFormModalOpen" title="Novo convite">
      <form class="flex flex-col gap-4" @submit="onSubmit">
        <UiInput
          v-model="name"
          label="Nome do convite"
          placeholder="Ex.: Família José Silva"
          :error="errors.name"
        />
        <UiTextarea
          v-model="notes"
          label="Observações internas (opcional)"
          placeholder="Nunca exibidas ao convidado — ex.: Mesa VIP"
          :error="errors.notes"
        />
        <p v-if="formErrorMessage" class="text-sm text-red-600" role="alert">
          {{ formErrorMessage }}
        </p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isFormModalOpen = false">
            Cancelar
          </UiButton>
          <UiButton type="submit" :disabled="isSubmitting">Criar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="isDeleteModalOpen" title="Excluir convite">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir este convite? Os convidados não são excluídos — só perdem o
        vínculo com o convite.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmDelete">
          Excluir
        </UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
