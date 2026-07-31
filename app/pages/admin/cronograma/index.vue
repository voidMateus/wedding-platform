<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'
import type { EventSegment } from '~/types/event-segment'

definePageMeta({ layout: 'admin' })

const { listEventSegments, createEventSegment, updateEventSegment, deleteEventSegment } =
  useEventSegments()
const { data, status, refresh } = listEventSegments()

const isFormModalOpen = ref(false)
const editingSegment = ref<EventSegment | null>(null)
const formErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(eventSegmentInputSchema),
  initialValues: {
    title: '',
    venueName: '',
    venueAddress: '',
    startsAt: '',
    endsAt: '',
    displayOrder: 0,
    venueLatitude: '',
    venueLongitude: '',
  },
})

const [title] = defineField('title')
const [venueName] = defineField('venueName')
const [venueAddress] = defineField('venueAddress')
const [startsAt] = defineField('startsAt')
const [endsAt] = defineField('endsAt')
const [displayOrder] = defineField('displayOrder')
const [venueLatitude] = defineField('venueLatitude')
const [venueLongitude] = defineField('venueLongitude')

const displayOrderText = computed({
  get: () => (displayOrder.value === undefined ? '' : String(displayOrder.value)),
  set: (value: string) => {
    displayOrder.value = value === '' ? undefined : Number(value)
  },
})

// UiInput só aceita modelValue string — venueLatitude/venueLongitude
// aceitam string|number|undefined (schema em shared/schemas/event-segments.ts,
// mesmo raciocínio de displayOrderText acima).
const venueLatitudeText = computed({
  get: () => (venueLatitude.value === undefined ? '' : String(venueLatitude.value)),
  set: (value: string) => {
    venueLatitude.value = value
  },
})
const venueLongitudeText = computed({
  get: () => (venueLongitude.value === undefined ? '' : String(venueLongitude.value)),
  set: (value: string) => {
    venueLongitude.value = value
  },
})

function openCreateModal() {
  editingSegment.value = null
  formErrorMessage.value = null
  const nextOrder = (data.value?.data.length ?? 0) + 1
  resetForm({
    values: {
      title: '',
      venueName: '',
      venueAddress: '',
      startsAt: '',
      endsAt: '',
      displayOrder: nextOrder,
      venueLatitude: '',
      venueLongitude: '',
    },
  })
  isFormModalOpen.value = true
}

function openEditModal(segment: EventSegment) {
  editingSegment.value = segment
  formErrorMessage.value = null
  resetForm({
    values: {
      title: segment.title,
      venueName: segment.venue_name ?? '',
      venueAddress: segment.venue_address ?? '',
      startsAt: segment.starts_at ?? '',
      endsAt: segment.ends_at ?? '',
      displayOrder: segment.display_order,
      venueLatitude: segment.venue_latitude ?? '',
      venueLongitude: segment.venue_longitude ?? '',
    },
  })
  isFormModalOpen.value = true
}

const onSubmit = handleSubmit(async (values) => {
  formErrorMessage.value = null
  try {
    if (editingSegment.value) {
      await updateEventSegment(editingSegment.value.id, values)
    } else {
      await createEventSegment(values)
    }
    isFormModalOpen.value = false
    await refresh()
  } catch {
    formErrorMessage.value = 'Não foi possível salvar o item do cronograma.'
  }
})

const deleteTarget = ref<EventSegment | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(segment: EventSegment) {
  deleteTarget.value = segment
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteEventSegment(deleteTarget.value.id)
    isDeleteModalOpen.value = false
    deleteTarget.value = null
    await refresh()
  } finally {
    isDeleting.value = false
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-text">Cronograma</h1>
        <p class="mt-1 text-sm text-text-muted">
          Cerimônia, recepção, festa — cada etapa com seu local e horário.
        </p>
      </div>
      <UiButton @click="openCreateModal">Novo item</UiButton>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton v-for="n in 3" :key="n" class="h-14 w-full" />
    </div>

    <UiEmptyState
      v-else-if="!data?.data.length"
      title="Nenhum item no cronograma ainda"
      description="Cadastre a cerimônia, a recepção ou outra etapa do evento."
    >
      <UiButton @click="openCreateModal">Novo item</UiButton>
    </UiEmptyState>

    <UiTable v-else>
      <template #head>
        <th class="px-4 py-2 font-medium">Título</th>
        <th class="px-4 py-2 font-medium">Local</th>
        <th class="px-4 py-2 font-medium">Início</th>
        <th class="px-4 py-2 font-medium">Término</th>
        <th class="px-4 py-2 font-medium"><span class="sr-only">Ações</span></th>
      </template>
      <tr v-for="segment in data?.data" :key="segment.id" class="border-t border-border">
        <td class="px-4 py-2 text-text">{{ segment.title }}</td>
        <td class="px-4 py-2 text-text-muted">{{ segment.venue_name || '—' }}</td>
        <td class="px-4 py-2 text-text-muted">{{ formatDateTime(segment.starts_at) }}</td>
        <td class="px-4 py-2 text-text-muted">{{ formatDateTime(segment.ends_at) }}</td>
        <td class="px-4 py-2">
          <div class="flex justify-end gap-2">
            <UiButton size="sm" variant="ghost" @click="openEditModal(segment)">Editar</UiButton>
            <UiButton size="sm" variant="destructive" @click="openDeleteModal(segment)">
              Excluir
            </UiButton>
          </div>
        </td>
      </tr>
    </UiTable>

    <UiModal
      v-model="isFormModalOpen"
      :title="editingSegment ? 'Editar item do cronograma' : 'Novo item do cronograma'"
    >
      <form class="flex flex-col gap-4" @submit="onSubmit">
        <UiInput v-model="title" label="Título" placeholder="Ex.: Cerimônia" :error="errors.title" />
        <UiInput v-model="venueName" label="Local (opcional)" :error="errors.venueName" />
        <UiInput v-model="venueAddress" label="Endereço (opcional)" :error="errors.venueAddress" />
        <div class="flex flex-col gap-1">
          <div class="flex gap-3">
            <UiInput
              v-model="venueLatitudeText"
              type="number"
              step="any"
              label="Latitude (opcional)"
              class="flex-1"
              :error="errors.venueLatitude"
            />
            <UiInput
              v-model="venueLongitudeText"
              type="number"
              step="any"
              label="Longitude (opcional)"
              class="flex-1"
              :error="errors.venueLongitude"
            />
          </div>
          <p class="text-xs text-text-muted">
            Preencha para mostrar um mapa interativo no site — clique com o botão direito no local
            no Google Maps e copie as coordenadas.
          </p>
        </div>
        <UiInput
          v-model="startsAt"
          type="datetime-local"
          label="Início (opcional)"
          :error="errors.startsAt"
        />
        <UiInput
          v-model="endsAt"
          type="datetime-local"
          label="Término (opcional)"
          :error="errors.endsAt"
        />
        <UiInput
          v-model="displayOrderText"
          type="number"
          label="Ordem de exibição"
          :error="errors.displayOrder"
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

    <UiModal v-model="isDeleteModalOpen" title="Excluir item do cronograma">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir <strong>{{ deleteTarget?.title }}</strong
        >?
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
