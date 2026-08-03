<script setup lang="ts">
import type { GuestPersonInput } from '#shared/schemas/guests'

interface Props {
  modelValue: GuestPersonInput
  groupOptions: Array<{ value: string; label: string }>
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: GuestPersonInput] }>()

function update<K extends keyof GuestPersonInput>(key: K, value: GuestPersonInput[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const sexOptions = [
  { value: 'female', label: 'Feminino' },
  { value: 'male', label: 'Masculino' },
  { value: 'other', label: 'Outro' },
]

const weddingRoleOptions = [
  { value: '', label: 'Nenhum' },
  { value: 'padrinho', label: 'Padrinho' },
  { value: 'madrinha', label: 'Madrinha' },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiInput
        :model-value="modelValue.fullName"
        label="Nome completo"
        @update:model-value="update('fullName', $event)"
      />
      <UiInput
        :model-value="modelValue.nickname"
        label="Apelido (opcional)"
        @update:model-value="update('nickname', $event)"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UiSelect
        :model-value="modelValue.sex"
        label="Sexo (opcional)"
        placeholder="Não informar"
        :options="sexOptions"
        @update:model-value="update('sex', $event as GuestPersonInput['sex'])"
      />
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-text">Data de nascimento (opcional)</label>
        <input
          type="date"
          :value="modelValue.birthDate"
          class="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text"
          @change="update('birthDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <UiSelect
        :model-value="modelValue.weddingRole"
        label="Padrinho/Madrinha"
        :options="weddingRoleOptions"
        @update:model-value="update('weddingRole', $event as GuestPersonInput['weddingRole'])"
      />
    </div>

    <UiSelect
      :model-value="modelValue.groupId"
      label="Grupo (opcional)"
      placeholder="Sem grupo"
      :options="groupOptions"
      @update:model-value="update('groupId', $event)"
    />

    <UiTextarea
      :model-value="modelValue.dietaryRestrictions"
      label="Restrição alimentar (opcional)"
      @update:model-value="update('dietaryRestrictions', $event)"
    />

    <UiTextarea
      :model-value="modelValue.notes"
      label="Observações internas (opcional)"
      placeholder="Nunca exibidas ao convidado"
      @update:model-value="update('notes', $event)"
    />
  </div>
</template>
