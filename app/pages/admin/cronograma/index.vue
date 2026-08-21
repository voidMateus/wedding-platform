<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { eventSegmentInputSchema } from '#shared/schemas/event-segments'
import { classifyEventSegmentTitle } from '#shared/utils/event-segment-keywords'
import type { EventSegment } from '~/types/event-segment'

definePageMeta({ layout: 'admin' })

// Simplificado (CLAUDE.md, redesign pós-Fase Premium Experience): só dois
// locais fixos — Cerimônia e Recepção — em vez de uma lista genérica de
// itens de cronograma. "Festa" é a mesma etapa que "Recepção" pro casal
// (rótulo só no admin, ver comentário abaixo); o título salvo continua
// "Recepção" para casar com a classificação por palavra-chave já usada no
// site público (shared/utils/event-segment-keywords.ts).
const { listEventSegments } = useEventSegments()
const { data, status, error, refresh } = listEventSegments()

const ceremony = computed(
  () => data.value?.data.find((s) => classifyEventSegmentTitle(s.title) === 'ceremony') ?? null,
)
const reception = computed(
  () => data.value?.data.find((s) => classifyEventSegmentTitle(s.title) === 'reception') ?? null,
)

function emptyValues(title: string, displayOrder: number) {
  return {
    title,
    venueName: '',
    venueAddress: '',
    startsAt: '',
    endsAt: '',
    displayOrder,
    venueLatitude: '',
    venueLongitude: '',
    sameVenueAs: '',
  }
}

function valuesFromSegment(segment: EventSegment) {
  return {
    title: segment.title,
    venueName: segment.venue_name ?? '',
    venueAddress: segment.venue_address ?? '',
    startsAt: segment.starts_at ?? '',
    endsAt: segment.ends_at ?? '',
    displayOrder: segment.display_order,
    venueLatitude: segment.venue_latitude ?? '',
    venueLongitude: segment.venue_longitude ?? '',
    sameVenueAs: segment.same_venue_as ?? '',
  }
}

// --- Cerimônia ---
const ceremonyForm = useForm({
  validationSchema: toTypedSchema(eventSegmentInputSchema),
  initialValues: emptyValues('Cerimônia', 1),
})
const [ceremonyVenueName] = ceremonyForm.defineField('venueName')
const [ceremonyVenueAddress] = ceremonyForm.defineField('venueAddress')
const [ceremonyStartsAt] = ceremonyForm.defineField('startsAt')
const [ceremonyEndsAt] = ceremonyForm.defineField('endsAt')
const [ceremonyLat] = ceremonyForm.defineField('venueLatitude')
const [ceremonyLng] = ceremonyForm.defineField('venueLongitude')
const ceremonyLatText = computed({
  get: () => (ceremonyLat.value === undefined ? '' : String(ceremonyLat.value)),
  set: (v: string) => (ceremonyLat.value = v),
})
const ceremonyLngText = computed({
  get: () => (ceremonyLng.value === undefined ? '' : String(ceremonyLng.value)),
  set: (v: string) => (ceremonyLng.value = v),
})

// --- Recepção/Festa ---
const receptionForm = useForm({
  validationSchema: toTypedSchema(eventSegmentInputSchema),
  initialValues: emptyValues('Recepção', 2),
})
const [receptionVenueName] = receptionForm.defineField('venueName')
const [receptionVenueAddress] = receptionForm.defineField('venueAddress')
const [receptionStartsAt] = receptionForm.defineField('startsAt')
const [receptionEndsAt] = receptionForm.defineField('endsAt')
const [receptionLat] = receptionForm.defineField('venueLatitude')
const [receptionLng] = receptionForm.defineField('venueLongitude')
const receptionLatText = computed({
  get: () => (receptionLat.value === undefined ? '' : String(receptionLat.value)),
  set: (v: string) => (receptionLat.value = v),
})
const receptionLngText = computed({
  get: () => (receptionLng.value === undefined ? '' : String(receptionLng.value)),
  set: (v: string) => (receptionLng.value = v),
})

const sameAddress = ref(false)

watch(
  data,
  (value) => {
    if (!value) return
    ceremonyForm.resetForm({
      values: ceremony.value ? valuesFromSegment(ceremony.value) : emptyValues('Cerimônia', 1),
    })
    receptionForm.resetForm({
      values: reception.value ? valuesFromSegment(reception.value) : emptyValues('Recepção', 2),
    })
    sameAddress.value = Boolean(reception.value?.same_venue_as)
  },
  { immediate: true },
)

const { saveCronograma } = useCronogramaForm()

const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const isSaving = ref(false)

async function saveAll() {
  errorMessage.value = null
  successMessage.value = null
  isSaving.value = true
  try {
    await saveCronograma({
      ceremonyValues: ceremonyForm.values,
      receptionValues: receptionForm.values,
      sameAddress: sameAddress.value,
      ceremony: ceremony.value,
      reception: reception.value,
    })
    await refresh()
    successMessage.value = 'Cronograma salvo.'
  } catch {
    errorMessage.value = 'Não foi possível salvar. Tente novamente.'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <AdminSection
    title="Cerimônia e Recepção"
    description="Local e horário dos dois momentos do dia — no site, viram uma única seção quando são no mesmo endereço."
  >
    <div class="flex flex-col gap-8">
      <div v-if="status === 'pending'" class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UiSkeleton class="h-40 w-full" />
        <UiSkeleton class="h-40 w-full" />
      </div>

      <UiEmptyState
        v-else-if="error"
        icon="lucide:alert-triangle"
        title="Não foi possível carregar o cronograma"
        description="Verifique sua conexão e tente novamente."
      >
        <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
      </UiEmptyState>

      <template v-else>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <UiCard>
            <template #header>
              <h2 class="text-base font-semibold text-text">Cerimônia</h2>
            </template>
            <div class="flex flex-col gap-4">
              <UiInput
                v-model="ceremonyVenueName"
                label="Local"
                placeholder="Ex.: Igreja São José"
              />
              <UiInput
                v-model="ceremonyVenueAddress"
                label="Endereço"
                placeholder="Ex.: Rua das Flores, 100"
              />
              <div class="flex gap-3">
                <UiInput
                  v-model="ceremonyStartsAt"
                  type="datetime-local"
                  label="Início"
                  class="flex-1"
                />
                <UiInput
                  v-model="ceremonyEndsAt"
                  type="datetime-local"
                  label="Término (opcional)"
                  class="flex-1"
                />
              </div>
              <UiAccordion :items="[{ id: 'ceremony-coords', trigger: 'Coordenadas (opcional)' }]">
                <template #content>
                  <div class="flex gap-3 px-5 pb-5">
                    <UiInput
                      v-model="ceremonyLatText"
                      type="number"
                      step="any"
                      label="Latitude"
                      class="flex-1"
                    />
                    <UiInput
                      v-model="ceremonyLngText"
                      type="number"
                      step="any"
                      label="Longitude"
                      class="flex-1"
                    />
                  </div>
                </template>
              </UiAccordion>
              <AdminEventSegmentImageUploader
                v-if="ceremony"
                :model-value="ceremony.image_url"
                :segment-id="ceremony.id"
                @update:model-value="() => refresh()"
              />
              <p v-else class="text-sm text-text-muted">
                Salve o cronograma pela primeira vez para poder adicionar uma foto do local.
              </p>
            </div>
          </UiCard>

          <UiCard>
            <template #header>
              <h2 class="text-base font-semibold text-text">Recepção / Festa</h2>
            </template>
            <div class="flex flex-col gap-4">
              <UiCheckbox v-model="sameAddress" label="Mesmo endereço da cerimônia" />

              <template v-if="!sameAddress">
                <UiInput
                  v-model="receptionVenueName"
                  label="Local"
                  placeholder="Ex.: Espaço Jardim"
                />
                <UiInput
                  v-model="receptionVenueAddress"
                  label="Endereço"
                  placeholder="Ex.: Av. Central, 500"
                />
                <UiAccordion
                  :items="[{ id: 'reception-coords', trigger: 'Coordenadas (opcional)' }]"
                >
                  <template #content>
                    <div class="flex gap-3 px-5 pb-5">
                      <UiInput
                        v-model="receptionLatText"
                        type="number"
                        step="any"
                        label="Latitude"
                        class="flex-1"
                      />
                      <UiInput
                        v-model="receptionLngText"
                        type="number"
                        step="any"
                        label="Longitude"
                        class="flex-1"
                      />
                    </div>
                  </template>
                </UiAccordion>
              </template>

              <div class="flex gap-3">
                <UiInput
                  v-model="receptionStartsAt"
                  type="datetime-local"
                  label="Início"
                  class="flex-1"
                />
                <UiInput
                  v-model="receptionEndsAt"
                  type="datetime-local"
                  label="Término (opcional)"
                  class="flex-1"
                />
              </div>
              <AdminEventSegmentImageUploader
                v-if="reception"
                :model-value="reception.image_url"
                :segment-id="reception.id"
                @update:model-value="() => refresh()"
              />
              <p v-else class="text-sm text-text-muted">
                Salve o cronograma pela primeira vez para poder adicionar uma foto do local.
              </p>
            </div>
          </UiCard>
        </div>

        <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="text-sm text-green-700" role="status">
          {{ successMessage }}
        </p>

        <div class="flex justify-end">
          <UiButton :disabled="isSaving" @click="saveAll">Salvar cronograma</UiButton>
        </div>
      </template>
    </div>
  </AdminSection>
</template>
