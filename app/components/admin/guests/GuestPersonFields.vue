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

// Data de nascimento e faixa etária respondem à mesma pergunta, com
// precedência: a data, quando existe, sempre vence a faixa informada à mão.
// Mas nenhuma das duas é obrigatória — o casal quase nunca sabe a data de
// nascimento de todos os convidados, e "sei que ele é adulto" precisa ser
// suficiente para concluir o cadastro (CLAUDE.md, seção 12).
const { classify, manualOptions } = useAgeGroups()

const classificacao = computed(() =>
  classify({
    data_nascimento: props.modelValue.dataNascimento || null,
    faixa_etaria_manual: props.modelValue.faixaEtariaManual || null,
  }),
)

/** Com data de nascimento, a faixa é calculada e o seletor manual não compete com ela. */
const isCalculada = computed(() => classificacao.value.origem === 'calculada')

/**
 * Travado, o campo mostra a faixa CALCULADA — não o valor manual guardado.
 * Exibir "Não informada" ao lado de uma data de nascimento válida diria o
 * oposto do que o sistema faz. O valor manual continua gravado intacto, e
 * volta a valer se a data for apagada.
 */
const faixaExibida = computed(() =>
  isCalculada.value
    ? (classificacao.value.chave ?? '')
    : (props.modelValue.faixaEtariaManual ?? ''),
)

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

    <!--
      Data de nascimento ANTES da faixa etária, e as duas lado a lado: é a
      ordem da regra de precedência (a data válida sempre vence a faixa
      manual), então ler de cima para baixo descreve o que o sistema faz.
      Pareadas, também fica claro que as duas respondem à mesma pergunta — a
      faixa é o caminho de quem não sabe a data.
    -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium text-text" :for="`nascimento-${modelValue.id ?? 'novo'}`">
          Data de nascimento (opcional)
        </label>
        <input
          :id="`nascimento-${modelValue.id ?? 'novo'}`"
          type="date"
          :value="modelValue.dataNascimento"
          class="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-text"
          @change="update('dataNascimento', ($event.target as HTMLInputElement).value)"
        />

        <!-- Idade e classificação são sempre derivadas (idade na data do
             evento x faixas do evento) — exibidas, nunca gravadas. -->
        <p
          v-if="classificacao.idadeNoEvento !== null"
          class="text-xs leading-relaxed text-text-muted"
        >
          <span class="num font-medium text-text">{{ classificacao.idadeNoEvento }}</span>
          {{ classificacao.idadeNoEvento === 1 ? 'ano' : 'anos' }} na data do casamento
        </p>
        <p v-else class="text-xs leading-relaxed text-text-muted">
          Preenchendo a data, a faixa etária passa a ser calculada.
        </p>
      </div>

      <UiSelect
        :model-value="faixaExibida"
        label="Faixa etária"
        :options="manualOptions"
        :disabled="isCalculada"
        :hint="
          isCalculada
            ? 'Calculada pela data de nascimento.'
            : 'Use quando não souber a data de nascimento.'
        "
        @update:model-value="
          update('faixaEtariaManual', $event as GuestPersonInput['faixaEtariaManual'])
        "
      />
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <UiSelect
        :model-value="modelValue.sexo"
        label="Sexo (opcional)"
        placeholder="Não informar"
        :options="sexOptions"
        @update:model-value="update('sexo', $event as GuestPersonInput['sexo'])"
      />
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
      :model-value="modelValue.observacoes"
      label="Observações internas (opcional)"
      placeholder="Nunca exibidas ao convidado"
      @update:model-value="update('observacoes', $event)"
    />
  </div>
</template>
