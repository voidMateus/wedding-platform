<script setup lang="ts">
import { formatarEnderecoLocal } from '#shared/utils/endereco-local'
import type { EventSegmentLocation } from '~/types/event-segment-location'

/**
 * Cadastro manual do local — o caminho para o que não existe como Place
 * (chácara, sítio, salão pequeno, endereço rural). Campos de endereço
 * comuns e mais nada: nenhuma latitude, nenhuma longitude, nenhum campo
 * técnico (CLAUDE.md, seção 12). A posição no mapa, quando o casal quiser
 * defini-la, sai do marcador arrastado em AdminLocationMapPicker.
 */
interface Props {
  modelValue: EventSegmentLocation
}

const { modelValue } = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: EventSegmentLocation]
  'open-map-picker': []
}>()

function update(key: keyof EventSegmentLocation, value: string): void {
  emit('update:modelValue', { ...modelValue, [key]: value })
}

const hasPosition = computed(
  () => Boolean(modelValue.latitudeLocal) && Boolean(modelValue.longitudeLocal),
)

/** Prévia do endereço como o convidado vai lê-lo — o mesmo compositor que o servidor grava. */
const enderecoPreview = computed(() =>
  formatarEnderecoLocal({
    logradouro: modelValue.logradouroLocal,
    numero: modelValue.numeroLocal,
    complemento: modelValue.complementoLocal,
    cidade: modelValue.cidadeLocal,
    estado: modelValue.estadoLocal,
  }),
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiInput
      :model-value="modelValue.nomeLocal"
      label="Nome do local"
      placeholder="Ex.: Chácara Recanto das Flores"
      @update:model-value="update('nomeLocal', $event)"
    />

    <UiInput
      :model-value="modelValue.logradouroLocal"
      label="Endereço"
      placeholder="Ex.: Estrada da Guarita, km 8"
      @update:model-value="update('logradouroLocal', $event)"
    />

    <div class="flex gap-3">
      <UiInput
        :model-value="modelValue.numeroLocal"
        label="Número"
        class="w-28"
        @update:model-value="update('numeroLocal', $event)"
      />
      <UiInput
        :model-value="modelValue.complementoLocal"
        label="Complemento"
        placeholder="Ex.: Portão azul, ao lado da capela"
        class="flex-1"
        @update:model-value="update('complementoLocal', $event)"
      />
    </div>

    <div class="flex gap-3">
      <UiInput
        :model-value="modelValue.cidadeLocal"
        label="Cidade"
        class="flex-1"
        @update:model-value="update('cidadeLocal', $event)"
      />
      <UiInput
        :model-value="modelValue.estadoLocal"
        label="Estado"
        placeholder="MT"
        class="w-24"
        @update:model-value="update('estadoLocal', $event)"
      />
    </div>

    <p v-if="enderecoPreview" class="text-xs text-text-muted">
      No site aparece como: <span class="text-text">{{ enderecoPreview }}</span>
    </p>

    <div class="flex flex-wrap items-center gap-3">
      <UiButton variant="outline" size="sm" @click="emit('open-map-picker')">
        <Icon name="lucide:map-pin" class="h-4 w-4" />
        {{ hasPosition ? 'Ajustar posição no mapa' : 'Definir localização no mapa' }}
      </UiButton>
      <p v-if="hasPosition" class="text-xs text-success">Posição no mapa definida.</p>
      <p v-else class="text-xs text-text-muted">
        Opcional — sem posição, o site mostra o mapa pelo endereço.
      </p>
    </div>
  </div>
</template>
