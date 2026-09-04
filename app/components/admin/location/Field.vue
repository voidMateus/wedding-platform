<script setup lang="ts">
import { montarConsultaEmbedMapa, montarUrlMapa } from '#shared/utils/mapa-local'
import { formatarEnderecoLocal } from '#shared/utils/endereco-local'
import type { PlaceSuggestion } from '~/types/place'
import type { EventSegmentLocation } from '~/types/event-segment-location'

/**
 * O campo de localização de um segmento do cronograma: busca, confirmação
 * visual e cadastro manual num só controle (CLAUDE.md, seção 12).
 *
 * A regra que organiza o componente: o local só é substituído quando o casal
 * conclui uma nova escolha. Abrir "Alterar local" e desistir mantém o que
 * estava lá — por isso o cadastro manual trabalha sobre um rascunho próprio
 * e o `update:modelValue` só sai numa seleção ou num "Salvar local".
 *
 * Todas as transformações do valor vivem em app/utils/event-segment-location.ts
 * (puras, testadas à parte); aqui fica só a máquina de modos e a montagem.
 */
interface Props {
  modelValue: EventSegmentLocation
  /** Rótulo do campo (ex.: "Local da cerimônia"). */
  label: string
}

const { modelValue, label } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: EventSegmentLocation]
}>()

const { placesSearchEnabled } = useRuntimeConfig().public
const { getPlaceDetails } = usePlaces()

type Mode = 'view' | 'search' | 'manual'

const hasLocation = computed(() => hasEventSegmentLocation(modelValue))

// Sem busca configurada não existe estado "procurando": o cadastro manual é
// a tela inicial, não uma alternativa escondida atrás de um link.
function initialMode(): Mode {
  if (hasLocation.value) return 'view'
  return placesSearchEnabled ? 'search' : 'manual'
}

const mode = ref<Mode>(initialMode())
const draft = ref<EventSegmentLocation>(manualDraftFrom(modelValue))
const isLoadingPlace = ref(false)
const errorMessage = ref<string | null>(null)
const isMapPickerOpen = ref(false)

// A página recarrega os valores depois de salvar (resetForm sobre a resposta
// do servidor); sem isto o campo continuaria no modo em que estava. Um
// cadastro manual em andamento é preservado — recarregar por baixo dele
// descartaria o que o casal está digitando.
watch(
  () => modelValue,
  () => {
    if (mode.value === 'manual') return
    mode.value = initialMode()
  },
)

const embedQuery = computed(() => montarConsultaEmbedMapa(locationToMapaLocal(modelValue)))
const externalMapsUrl = computed(() => montarUrlMapa(locationToMapaLocal(modelValue)))

async function selectSuggestion(suggestion: PlaceSuggestion): Promise<void> {
  isLoadingPlace.value = true
  errorMessage.value = null
  try {
    const { place, provider } = await getPlaceDetails(suggestion.placeId)
    emit('update:modelValue', locationFromPlace(place, provider))
    mode.value = 'view'
  } catch {
    errorMessage.value =
      'Não foi possível carregar esse local. Escolha outro ou cadastre manualmente.'
  } finally {
    isLoadingPlace.value = false
  }
}

function startSearch(): void {
  errorMessage.value = null
  mode.value = 'search'
}

function startManual(): void {
  errorMessage.value = null
  draft.value = manualDraftFrom(modelValue)
  mode.value = 'manual'
}

function cancelManual(): void {
  mode.value = initialMode()
}

const manualEndereco = computed(() =>
  formatarEnderecoLocal({
    logradouro: draft.value.logradouroLocal,
    numero: draft.value.numeroLocal,
    complemento: draft.value.complementoLocal,
    cidade: draft.value.cidadeLocal,
    estado: draft.value.estadoLocal,
  }),
)

const canSaveManual = computed(() => Boolean(draft.value.nomeLocal.trim() || manualEndereco.value))

function saveManual(): void {
  emit('update:modelValue', commitManualLocation(draft.value))
  mode.value = 'view'
}

function applyPickedPosition(position: { latitude: number; longitude: number }): void {
  draft.value = {
    ...draft.value,
    latitudeLocal: String(position.latitude),
    longitudeLocal: String(position.longitude),
  }
}

function removeLocation(): void {
  emit('update:modelValue', emptyEventSegmentLocation())
  mode.value = placesSearchEnabled ? 'search' : 'manual'
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <span class="text-sm font-medium text-text">{{ label }}</span>

    <!-- Local definido: confirmação visual, nunca o campo de busca ocupando espaço. -->
    <template v-if="mode === 'view'">
      <div class="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted/40 p-4">
        <div class="flex items-start gap-2">
          <Icon name="lucide:map-pin" class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div class="min-w-0">
            <p v-if="modelValue.nomeLocal" class="text-sm font-medium text-text">
              {{ modelValue.nomeLocal }}
            </p>
            <p v-if="modelValue.enderecoLocal" class="text-sm text-text-muted">
              {{ modelValue.enderecoLocal }}
            </p>
          </div>
        </div>

        <UiVenueMap
          v-if="embedQuery"
          :query="embedQuery"
          :label="modelValue.nomeLocal || label"
          size="sm"
        />

        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <UiButton
            v-if="externalMapsUrl"
            variant="ghost"
            size="sm"
            :to="externalMapsUrl"
            target="_blank"
          >
            <Icon name="lucide:external-link" class="h-4 w-4" />
            Ver no mapa
          </UiButton>
          <UiButton variant="ghost" size="sm" @click="startSearch">Alterar local</UiButton>
          <UiButton variant="ghost" size="sm" @click="removeLocation">Remover local</UiButton>
        </div>
      </div>
    </template>

    <!-- Busca: o caminho principal. -->
    <template v-else-if="mode === 'search'">
      <AdminLocationSearchBox
        v-if="placesSearchEnabled"
        placeholder="Ex.: Igreja Batista Central, ou Av. Miguel Sutil, 1234"
        autofocus
        @select="selectSuggestion"
      />

      <p v-if="isLoadingPlace" class="text-xs text-text-muted">Carregando local...</p>
      <p v-if="errorMessage" class="text-sm text-danger" role="alert">{{ errorMessage }}</p>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p class="text-xs text-text-muted">Não encontrou o local?</p>
        <UiButton variant="ghost" size="sm" @click="startManual">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Informar local manualmente
        </UiButton>
        <UiButton v-if="hasLocation" variant="ghost" size="sm" @click="mode = 'view'">
          Cancelar
        </UiButton>
      </div>
    </template>

    <!-- Cadastro manual. -->
    <template v-else>
      <AdminLocationManualForm v-model="draft" @open-map-picker="isMapPickerOpen = true" />

      <div class="flex flex-wrap items-center gap-2">
        <UiButton size="sm" :disabled="!canSaveManual" @click="saveManual">Salvar local</UiButton>
        <UiButton variant="ghost" size="sm" @click="cancelManual">Cancelar</UiButton>
        <UiButton v-if="placesSearchEnabled" variant="ghost" size="sm" @click="startSearch">
          Buscar no mapa
        </UiButton>
      </div>

      <AdminLocationMapPicker
        v-model="isMapPickerOpen"
        :latitude="draft.latitudeLocal ? Number(draft.latitudeLocal) : null"
        :longitude="draft.longitudeLocal ? Number(draft.longitudeLocal) : null"
        :address-hint="manualEndereco || draft.nomeLocal"
        @confirm="applyPickedPosition"
      />
    </template>
  </div>
</template>
