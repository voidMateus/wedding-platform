<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { groupInputSchema } from '#shared/schemas/groups'
import { WCAG_AA_MIN_CONTRAST, checkColorContrast, isValidHexColor } from '#shared/utils/contrast'
import { getApiErrorMessage } from '~/utils/api-error'
import type { Group, GroupListItem } from '~/types/group'

definePageMeta({ layout: 'admin' })

const { listGroups, createGroup, updateGroup, setGroupArchived } = useGroups()
// includeArchived: arquivar um grupo é o próprio soft delete, então sem isso o
// recorte "Arquivados" não existiria — e um grupo arquivado desapareceria sem
// nenhuma forma de reencontrá-lo pela UI.
const { data, status, error, refresh } = listGroups({ pageSize: 100, includeArchived: true })

const archiveFilter = ref('ativos')
const archiveChips = [
  { value: 'ativos', label: 'Ativos' },
  { value: 'arquivados', label: 'Arquivados' },
] as const

const visibleGroups = computed(() => {
  const rows = data.value?.data ?? []
  return archiveFilter.value === 'arquivados'
    ? rows.filter((group) => group.excluido_em)
    : rows.filter((group) => !group.excluido_em)
})

const totalLabel = computed(() => {
  const total = (data.value?.data ?? []).filter((group) => !group.excluido_em).length
  return `${total} grupo${total === 1 ? '' : 's'}`
})

// Andamento por grupo: /api/groups agrega guestCount/confirmedCount por
// grupo. A agregação é do servidor de propósito — no client ela exigiria a
// lista inteira de convidados, que é paginada.
function progressPercent(group: GroupListItem): number {
  if (group.guestCount === 0) return 0
  return Math.round((group.confirmedCount / group.guestCount) * 100)
}

// --- criar/editar ---

const isFormModalOpen = ref(false)
const editingGroup = ref<Group | null>(null)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(groupInputSchema),
  initialValues: { nome: '', cor: '' },
})

const [name] = defineField('nome')
const [color] = defineField('cor')

const contrastPreview = computed(() => {
  if (!color.value || !isValidHexColor(color.value)) return null
  return checkColorContrast(color.value)
})

function openCreateModal() {
  editingGroup.value = null
  formErrorMessage.value = null
  resetForm({ values: { nome: '', cor: '' } })
  isFormModalOpen.value = true
}

function openEditModal(group: Group) {
  editingGroup.value = group
  formErrorMessage.value = null
  resetForm({ values: { nome: group.nome, cor: group.cor ?? '' } })
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
    formErrorMessage.value = getApiErrorMessage(err, 'Não foi possível salvar o grupo.')
  }
})

// --- arquivar / desarquivar ---

const archiveTarget = ref<GroupListItem | null>(null)
const isArchiveModalOpen = ref(false)
const isArchiving = ref(false)

const isRestoring = computed(() => Boolean(archiveTarget.value?.excluido_em))

function openArchiveModal(group: GroupListItem) {
  archiveTarget.value = group
  isArchiveModalOpen.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) return
  isArchiving.value = true
  try {
    await setGroupArchived(archiveTarget.value.id, !archiveTarget.value.excluido_em)
    isArchiveModalOpen.value = false
    archiveTarget.value = null
    await refresh()
  } finally {
    isArchiving.value = false
  }
}
</script>

<template>
  <AdminSection title="Grupos" :meta="totalLabel">
    <template #actions>
      <UiButton @click="openCreateModal">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Adicionar grupo
      </UiButton>
    </template>

    <AdminPanel title="Andamento por grupo">
      <template #headerActions>
        <AdminFilterChips
          v-model="archiveFilter"
          :items="archiveChips"
          group-label="Filtrar grupos por situação"
        />
      </template>

      <div v-if="status === 'pending'" class="flex flex-col gap-2 p-4 sm:p-5">
        <UiSkeleton v-for="n in 3" :key="n" class="h-12 w-full" />
      </div>

      <div v-else-if="error" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:alert-triangle"
          title="Não foi possível carregar os grupos"
          description="Verifique sua conexão e tente novamente."
        >
          <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
        </UiEmptyState>
      </div>

      <div v-else-if="!data?.data.length" class="p-4 sm:p-5">
        <UiEmptyState
          icon="lucide:users-round"
          title="Nenhum grupo cadastrado ainda"
          description="Grupo é etiqueta livre (Família da Noiva, Amigos, Trabalho...) para organizar convidados em filtros — não é convite nem núcleo de acompanhantes."
        >
          <UiButton @click="openCreateModal">Adicionar grupo</UiButton>
        </UiEmptyState>
      </div>

      <p v-else-if="!visibleGroups.length" class="px-5 py-10 text-center text-sm text-text-muted">
        {{
          archiveFilter === 'arquivados'
            ? 'Nenhum grupo arquivado.'
            : 'Todos os grupos estão arquivados.'
        }}
      </p>

      <ul v-else class="divide-y divide-border">
        <li
          v-for="group in visibleGroups"
          :key="group.id"
          class="ledger-row flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 sm:px-5"
        >
          <!-- sm:contents dissolve este wrapper a partir de sm: nome, barra e
               contagem viram irmãos diretos da linha (o arranjo do protótipo),
               e no mobile ele mantém nome e ações na primeira linha, com a
               barra e a contagem abaixo — sem duplicar a barra em dois blocos. -->
          <div class="flex items-center gap-3 sm:contents">
            <span
              class="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-text sm:w-40 sm:flex-none"
            >
              <span
                v-if="group.cor"
                class="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                :style="{ backgroundColor: group.cor }"
                aria-hidden="true"
              />
              <!-- Sem badge "arquivado" na linha: só se chega aqui com o chip
                   "Arquivados" pressionado logo acima, então ele repetiria o
                   recorte — e roubaria da coluna de 160px o espaço que mantém
                   as barras alinhadas entre as linhas. -->
              <span class="truncate">{{ group.nome }}</span>
            </span>
            <span class="flex shrink-0 items-center gap-1 sm:order-last">
              <AdminRowAction
                v-if="!group.excluido_em"
                icon="lucide:pencil"
                :label="`Editar grupo ${group.nome}`"
                @click="openEditModal(group)"
              />
              <AdminRowAction
                v-if="group.excluido_em"
                icon="lucide:archive-restore"
                :label="`Desarquivar grupo ${group.nome}`"
                @click="openArchiveModal(group)"
              />
              <AdminRowAction
                v-else
                icon="lucide:archive"
                tone="danger"
                :label="`Arquivar grupo ${group.nome}`"
                @click="openArchiveModal(group)"
              />
            </span>
          </div>

          <!-- aria-hidden: a mesma informação está no texto ao lado, em
               "2/3 confirmados" — anunciar as duas seria redundante. -->
          <div class="h-2 overflow-hidden rounded-full bg-text/10 sm:flex-1" aria-hidden="true">
            <div
              class="h-full rounded-full bg-text transition-brand"
              :style="{ width: `${progressPercent(group)}%` }"
            />
          </div>

          <span class="num text-xs text-text-muted sm:w-40 sm:text-right">
            {{ group.confirmedCount }}/{{ group.guestCount }} confirmados
          </span>
        </li>
      </ul>
    </AdminPanel>

    <UiModal v-model="isFormModalOpen" :title="editingGroup ? 'Editar grupo' : 'Novo grupo'">
      <form class="flex flex-col gap-4" @submit="onSubmit">
        <UiInput
          v-model="name"
          label="Nome"
          placeholder="Ex.: Família da Noiva"
          :error="errors.nome"
        />

        <div class="flex flex-col gap-1">
          <label class="text-sm font-medium text-text" for="group-color"> Cor (opcional) </label>
          <div class="flex items-center gap-3">
            <input
              id="group-color"
              v-model="color"
              type="color"
              class="h-10 w-14 cursor-pointer rounded-md border border-border"
            />
            <UiInput v-model="color" class="flex-1" placeholder="#6b4a35" :error="errors.cor" />
          </div>
          <p
            v-if="contrastPreview"
            class="text-xs"
            :class="contrastPreview.meetsMinimum ? 'text-success' : 'text-danger'"
          >
            Contraste: {{ contrastPreview.ratioAgainstSurface.toFixed(2) }}:1 (mínimo
            {{ WCAG_AA_MIN_CONTRAST }}:1 —
            {{ contrastPreview.meetsMinimum ? 'ok' : 'insuficiente' }})
          </p>
        </div>

        <p v-if="formErrorMessage" class="text-sm text-danger" role="alert">
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

    <UiModal
      v-model="isArchiveModalOpen"
      :title="isRestoring ? 'Desarquivar grupo' : 'Arquivar grupo'"
    >
      <p v-if="isRestoring" class="text-sm text-text">
        <strong>{{ archiveTarget?.nome }}</strong> volta para a lista de grupos ativos e pode ser
        usado nos filtros de novo. Os convidados que já tinham essa etiqueta continuam com ela.
      </p>
      <p v-else class="text-sm text-text">
        <strong>{{ archiveTarget?.nome }}</strong> sai da lista e dos filtros, mas nada é apagado —
        os convidados só param de exibir a etiqueta, e o grupo pode ser desarquivado quando quiser.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isArchiving" @click="isArchiveModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton
          :variant="isRestoring ? 'primary' : 'destructive'"
          :disabled="isArchiving"
          @click="confirmArchive"
        >
          {{ isRestoring ? 'Desarquivar' : 'Arquivar' }}
        </UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
