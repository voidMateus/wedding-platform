<script setup lang="ts">
export interface InviteDraft {
  choice: 'create' | 'later'
  name: string
  notes: string
  tagIds: string[]
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

const { listInviteTags, createInviteTag } = useInviteTags()
const { data: tagsData, refresh: refreshTags } = listInviteTags()

const newTagName = ref('')

function toggleTag(tagId: string) {
  update(
    'tagIds',
    props.modelValue.tagIds.includes(tagId)
      ? props.modelValue.tagIds.filter((id) => id !== tagId)
      : [...props.modelValue.tagIds, tagId],
  )
}

async function addNewTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await createInviteTag({ nome: name })
    await refreshTags()
    update('tagIds', [...props.modelValue.tagIds, tag.id])
    newTagName.value = ''
  } catch {
    // etiqueta duplicada ou inválida — silenciosamente ignorado, usuário pode tentar de novo
  }
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

      <div class="flex flex-col gap-2">
        <span class="text-sm font-medium text-text">Etiquetas (opcional)</span>
        <div class="flex flex-wrap gap-2">
          <UiChip
            v-for="tag in tagsData?.data ?? []"
            :key="tag.id"
            :label="tag.nome"
            :selected="modelValue.tagIds.includes(tag.id)"
            clickable
            @click="toggleTag(tag.id)"
          />
        </div>
        <div class="flex items-center gap-2">
          <UiInput v-model="newTagName" placeholder="Nova etiqueta" class="max-w-xs" />
          <UiButton size="sm" variant="ghost" @click="addNewTag">Adicionar</UiButton>
        </div>
      </div>
    </div>
  </div>
</template>
