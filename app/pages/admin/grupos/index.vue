<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { groupInputSchema } from '#shared/schemas/groups'
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '#shared/utils/contrast'
import type { Group } from '~/types/group'

definePageMeta({ layout: 'admin' })

interface ApiError {
  statusCode?: number
  data?: { message?: string }
}

function isApiError(err: unknown): err is ApiError {
  return typeof err === 'object' && err !== null
}

const { listGroups, createGroup, updateGroup, deleteGroup } = useGroups()
const { data, status, refresh } = listGroups({ pageSize: 100 })

// --- criar/editar ---

const isFormModalOpen = ref(false)
const editingGroup = ref<Group | null>(null)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(groupInputSchema),
  initialValues: { name: '', color: '' },
})

const [name] = defineField('name')
const [color] = defineField('color')

const contrastPreview = computed(() => {
  if (!color.value || !isValidHexColor(color.value)) return null
  return checkColorContrast(color.value)
})

function openCreateModal() {
  editingGroup.value = null
  formErrorMessage.value = null
  resetForm({ values: { name: '', color: '' } })
  isFormModalOpen.value = true
}

function openEditModal(group: Group) {
  editingGroup.value = group
  formErrorMessage.value = null
  resetForm({ values: { name: group.name, color: group.color ?? '' } })
  isFormModalOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    if (editingGroup.value) {
      await updateGroup(editingGroup.value.id, values)
    } else {
      await createGroup(values)
    }
    isFormModalOpen.value = false
    await refresh()
  } catch (err) {
    formErrorMessage.value = isApiError(err)
      ? (err.data?.message ?? 'Não foi possível salvar o grupo.')
      : 'Não foi possível salvar o grupo.'
  }
})

// --- excluir ---

const deleteTarget = ref<Group | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(group: Group) {
  deleteTarget.value = group
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteGroup(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <AdminSection
    title="Grupos"
    description="Etiquetas livres para organizar convidados (Família da Noiva, Amigos, Trabalho...) — use em filtros e no dashboard."
  >
    <template #actions>
      <UiButton @click="openCreateModal">Novo grupo</UiButton>
    </template>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      icon="lucide:users-round"
      title="Nenhum grupo cadastrado ainda"
      description="Crie o primeiro grupo para começar a organizar os convidados."
    >
      <UiButton @click="openCreateModal">Novo grupo</UiButton>
    </UiEmptyState>

    <UiTable v-else>
      <template #head>
        <th class="px-4 py-2 font-medium">Nome</th>
        <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
      </template>
      <tr
        v-for="group in data?.data"
        :key="group.id"
        class="border-t border-border transition-brand hover:bg-surface-muted/60"
      >
        <td class="px-4 py-2 text-text">
          <span class="inline-flex items-center gap-2">
            <span
              v-if="group.color"
              class="h-3 w-3 rounded-full border border-border"
              :style="{ backgroundColor: group.color }"
              aria-hidden="true"
            />
            {{ group.name }}
          </span>
        </td>
        <td class="px-4 py-2">
          <div class="flex justify-end gap-2">
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
          placeholder="Ex.: Família da Noiva"
          :error="errors.name"
        />

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text" for="group-color">
            Cor (opcional)
          </label>
          <div class="flex items-center gap-3">
            <input
              id="group-color"
              v-model="color"
              type="color"
              class="h-10 w-14 cursor-pointer rounded-md border border-border"
            />
            <UiInput v-model="color" class="flex-1" placeholder="#6b4a35" :error="errors.color" />
          </div>
          <p
            v-if="contrastPreview"
            class="text-xs"
            :class="contrastPreview.meetsMinimum ? 'text-green-700' : 'text-red-600'"
          >
            Contraste: {{ contrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
            {{ WCAG_AA_MIN_CONTRAST }}:1 — {{ contrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
          </p>
        </div>

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
        Tem certeza que deseja excluir o grupo <strong>{{ deleteTarget?.name }}</strong>? Os
        convidados só perdem a etiqueta — nada mais é afetado.
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
