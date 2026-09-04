<script setup lang="ts">
export interface InviteDraft {
  choice: 'create' | 'later'
  name: string
  notes: string
}

interface Props {
  modelValue: InviteDraft
  /** Total de pessoas do grupo (responsável + acompanhantes), só pro texto descritivo. */
  partySize: number
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: InviteDraft] }>()

function update<K extends keyof InviteDraft>(key: K, value: InviteDraft[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<template>
  <div>
    <h2 class="mb-1 text-lg font-medium text-text">Convite</h2>
    <p class="mb-4 text-sm text-text-muted">
      Este grupo possui {{ partySize }} pessoas. Deseja criar um convite para elas agora?
    </p>

    <UiRadioGroup
      :model-value="modelValue.choice"
      :options="[
        { value: 'create', label: 'Criar convite agora' },
        { value: 'later', label: 'Fazer depois' },
      ]"
      @update:model-value="update('choice', $event as InviteDraft['choice'])"
    />

    <div v-if="modelValue.choice === 'create'" class="mt-4 flex flex-col gap-4">
      <UiInput
        :model-value="modelValue.name"
        label="Nome do convite"
        @update:model-value="update('name', $event)"
      />
      <UiTextarea
        :model-value="modelValue.notes"
        label="Observações internas (opcional)"
        @update:model-value="update('notes', $event)"
      />
    </div>
  </div>
</template>
