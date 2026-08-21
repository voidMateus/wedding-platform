<script setup lang="ts">
import type { GuestPersonInput } from '#shared/schemas/guests'
import type { Group } from '~/types/group'

interface Props {
  modelValue: GuestPersonInput
  groupOptions: Array<{ value: string; label: string }>
  /** Mostra o erro "obrigatório" no campo de nome (o pai decide quando validar). */
  fullNameError?: string | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: GuestPersonInput]
  'group-created': [group: Group]
}>()

function update<K extends keyof GuestPersonInput>(key: K, value: GuestPersonInput[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const sexOptions = [
  { value: 'feminino', label: 'Feminino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'outro', label: 'Outro' },
]

const weddingRoleOptions = [
  { value: '', label: 'Nenhum' },
  { value: 'padrinho', label: 'Padrinho' },
  { value: 'madrinha', label: 'Madrinha' },
]

// Criar um grupo sem sair do cadastro do convidado (CLAUDE.md, seção 12.1) —
// evita o casal precisar ir em Grupos cadastrar tudo antes de começar.
const { createGroup } = useGroups()
const isCreatingGroup = ref(false)
const newGroupName = ref('')
const isSavingGroup = ref(false)

function openCreateGroup() {
  newGroupName.value = ''
  isCreatingGroup.value = true
}

async function handleCreateGroup() {
  const name = newGroupName.value.trim()
  if (!name) return
  isSavingGroup.value = true
  try {
    const group = await createGroup({ nome: name })
    update('grupoId', group.id)
    emit('group-created', group)
    isCreatingGroup.value = false
  } finally {
    isSavingGroup.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <UiInput
        :model-value="modelValue.nomeCompleto"
        label="Nome completo"
        :error="fullNameError ?? undefined"
        @update:model-value="update('nomeCompleto', $event)"
      />
      <UiInput
        :model-value="modelValue.apelido"
        label="Apelido (opcional)"
        @update:model-value="update('apelido', $event)"
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UiSelect
        :model-value="modelValue.sexo"
        label="Sexo (opcional)"
        placeholder="Não informar"
        :options="sexOptions"
        @update:model-value="update('sexo', $event as GuestPersonInput['sexo'])"
      />
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-text">Data de nascimento (opcional)</label>
        <input
          type="date"
          :value="modelValue.dataNascimento"
          class="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text"
          @change="update('dataNascimento', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <UiSelect
        :model-value="modelValue.papelCasamento"
        label="Padrinho/Madrinha"
        :options="weddingRoleOptions"
        @update:model-value="update('papelCasamento', $event as GuestPersonInput['papelCasamento'])"
      />
    </div>

    <div class="flex flex-col gap-1">
      <UiSelect
        :model-value="modelValue.grupoId"
        label="Grupo (opcional)"
        placeholder="Sem grupo"
        :options="groupOptions"
        @update:model-value="update('grupoId', $event)"
      />
      <button
        v-if="!isCreatingGroup"
        type="button"
        class="self-start text-xs text-primary hover:underline"
        @click="openCreateGroup"
      >
        + Criar novo grupo
      </button>
      <div v-else class="flex items-center gap-2">
        <UiInput
          v-model="newGroupName"
          placeholder="Nome do novo grupo"
          class="flex-1"
          @keyup.enter="handleCreateGroup"
        />
        <UiButton type="button" size="sm" :disabled="isSavingGroup" @click="handleCreateGroup">
          Criar
        </UiButton>
        <UiButton type="button" size="sm" variant="ghost" @click="isCreatingGroup = false">
          Cancelar
        </UiButton>
      </div>
    </div>

    <UiTextarea
      :model-value="modelValue.restricoesAlimentares"
      label="Restrição alimentar (opcional)"
      @update:model-value="update('restricoesAlimentares', $event)"
    />

    <UiTextarea
      :model-value="modelValue.observacoes"
      label="Observações internas (opcional)"
      placeholder="Nunca exibidas ao convidado"
      @update:model-value="update('observacoes', $event)"
    />
  </div>
</template>
