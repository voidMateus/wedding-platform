<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { guestInputSchema } from '#shared/schemas/guests'
import type { Guest } from '~/types/guest'

definePageMeta({ layout: 'admin' })

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

const { listGuests, createGuest, updateGuest, deleteGuest } = useGuests()
const { listGuestGroups } = useGuestGroups()

// --- filtros e paginação ---

const page = ref(1)
const search = ref('')
const groupFilter = ref('')
const PAGE_SIZE = 20

const listParams = computed(() => ({
  page: page.value,
  pageSize: PAGE_SIZE,
  search: search.value.trim() || undefined,
  groupId: groupFilter.value || undefined,
}))

const { data, status, refresh } = listGuests(listParams)

const { data: groupsData } = listGuestGroups({ pageSize: 100 })
const groupOptions = computed(
  () => groupsData.value?.data.map((g) => ({ value: g.id, label: g.name })) ?? [],
)

const totalPages = computed(() => {
  const total = data.value?.meta.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})

function handleSearchInput() {
  page.value = 1
}

// --- criar/editar ---

const isFormModalOpen = ref(false)
const editingGuest = ref<Guest | null>(null)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting, values } = useForm({
  validationSchema: toTypedSchema(guestInputSchema),
  initialValues: {
    groupId: '',
    fullName: '',
    email: '',
    phone: '',
    isChild: false,
    dietaryRestrictions: '',
  },
})

const [groupId] = defineField('groupId')
const [fullName] = defineField('fullName')
const [email] = defineField('email')
const [phone] = defineField('phone')
const [isChild] = defineField('isChild')
const [dietaryRestrictions] = defineField('dietaryRestrictions')

const noContactWarning = computed(() => !values.email && !values.phone)

function openCreateModal() {
  editingGuest.value = null
  formErrorMessage.value = null
  resetForm({
    values: {
      groupId: groupOptions.value[0]?.value ?? '',
      fullName: '',
      email: '',
      phone: '',
      isChild: false,
      dietaryRestrictions: '',
    },
  })
  isFormModalOpen.value = true
}

function openEditModal(guest: Guest) {
  editingGuest.value = guest
  formErrorMessage.value = null
  resetForm({
    values: {
      groupId: guest.group_id,
      fullName: guest.full_name,
      email: guest.email ?? '',
      phone: guest.phone ?? '',
      isChild: guest.is_child,
      dietaryRestrictions: guest.dietary_restrictions ?? '',
    },
  })
  isFormModalOpen.value = true
}

const onSubmit = handleSubmit(async (formValues) => {
  formErrorMessage.value = null
  try {
    if (editingGuest.value) {
      await updateGuest(editingGuest.value.id, formValues)
    } else {
      await createGuest(formValues)
    }
    isFormModalOpen.value = false
    await refresh()
  } catch (err) {
    formErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar o convidado.')
      : 'Não foi possível salvar o convidado.'
  }
})

// --- excluir ---

const deleteTarget = ref<Guest | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(guest: Guest) {
  deleteTarget.value = guest
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteGuest(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">Convidados</h1>
        <p class="mt-1 text-sm text-text-muted">Cadastre e organize os convidados por grupo.</p>
      </div>
      <UiButton :disabled="!groupOptions.length" @click="openCreateModal">Novo convidado</UiButton>
    </div>

    <div class="flex flex-wrap gap-3">
      <UiInput
        v-model="search"
        placeholder="Buscar por nome"
        class="max-w-xs"
        @keyup.enter="handleSearchInput"
        @blur="handleSearchInput"
      />
      <UiSelect
        v-model="groupFilter"
        placeholder="Todos os grupos"
        :options="groupOptions"
        @update:model-value="page = 1"
      />
    </div>

    <p v-if="!groupOptions.length" class="text-sm text-text-muted">
      Crie um grupo em
      <NuxtLink to="/admin/grupos" class="underline">Grupos</NuxtLink>
      antes de cadastrar convidados.
    </p>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum convidado encontrado"
      description="Ajuste os filtros ou cadastre o primeiro convidado."
    />

    <template v-else>
      <UiTable>
        <template #head>
          <th class="px-4 py-2 font-medium">Nome</th>
          <th class="px-4 py-2 font-medium">Grupo</th>
          <th class="px-4 py-2 font-medium">Contato</th>
          <th class="px-4 py-2 font-medium">Restrições</th>
          <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
        </template>
        <tr v-for="guest in data?.data" :key="guest.id" class="border-t border-border">
          <td class="px-4 py-2 text-text">
            {{ guest.full_name }}
            <UiBadge v-if="guest.is_child" tone="neutral" class="ml-2">criança</UiBadge>
          </td>
          <td class="px-4 py-2 text-text-muted">
            {{ groupOptions.find((g) => g.value === guest.group_id)?.label ?? '—' }}
          </td>
          <td class="px-4 py-2 text-text-muted">{{ guest.email || guest.phone || '—' }}</td>
          <td class="px-4 py-2 text-text-muted">{{ guest.dietary_restrictions || '—' }}</td>
          <td class="px-4 py-2">
            <div class="flex justify-end gap-2">
              <UiButton size="sm" variant="ghost" @click="openEditModal(guest)">Editar</UiButton>
              <UiButton size="sm" variant="destructive" @click="openDeleteModal(guest)">
                Excluir
              </UiButton>
            </div>
          </td>
        </tr>
      </UiTable>

      <div class="flex items-center justify-between text-sm text-text-muted">
        <span>{{ data?.meta.total ?? 0 }} convidado(s)</span>
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

    <UiModal
      v-model="isFormModalOpen"
      :title="editingGuest ? 'Editar convidado' : 'Novo convidado'"
    >
      <form class="flex flex-col gap-4" @submit="onSubmit">
        <UiInput v-model="fullName" label="Nome completo" :error="errors.fullName" />
        <UiSelect
          v-model="groupId"
          label="Grupo"
          placeholder="Selecione um grupo"
          :options="groupOptions"
          :error="errors.groupId"
        />
        <UiInput v-model="email" type="email" label="E-mail (opcional)" :error="errors.email" />
        <UiInput v-model="phone" type="tel" label="Telefone (opcional)" :error="errors.phone" />
        <p v-if="noContactWarning" class="text-sm text-text-muted">
          Nenhum e-mail ou telefone informado — recomendado, mas não obrigatório.
        </p>
        <UiCheckbox v-model="isChild" label="Convidado é criança" />
        <UiTextarea
          v-model="dietaryRestrictions"
          label="Restrições alimentares (opcional)"
          :error="errors.dietaryRestrictions"
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

    <UiModal v-model="isDeleteModalOpen" title="Excluir convidado">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.full_name }}</strong
        >? O histórico de RSVP/presentes associados é preservado.
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
  </div>
</template>
