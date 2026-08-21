<script setup lang="ts">
import type { InviteDetail } from '~/types/invite'

interface Props {
  invite: InviteDetail
}

const props = defineProps<Props>()
const emit = defineEmits<{
  /** Etiqueta adicionada/removida do convite — o pai recarrega o `invite`. */
  changed: []
}>()

const { updateInvite } = useInvites()
const { listInviteTags, createInviteTag, deleteInviteTag } = useInviteTags()
const toast = useToast()

const { data: tagsData, refresh: refreshTags } = listInviteTags()

const newTagName = ref('')

function isTagSelected(tagId: string) {
  return props.invite.tags.some((t) => t.id === tagId)
}

async function toggleTag(tagId: string) {
  const currentIds = props.invite.tags.map((t) => t.id)
  const nextIds = isTagSelected(tagId)
    ? currentIds.filter((id) => id !== tagId)
    : [...currentIds, tagId]
  await updateInvite(props.invite.id, {
    nome: props.invite.nome,
    observacoes: props.invite.observacoes ?? '',
    convidadoResponsavelId: props.invite.convidado_responsavel_id ?? '',
    tagIds: nextIds,
  })
  emit('changed')
}

async function addNewTag() {
  const name = newTagName.value.trim()
  if (!name) return
  try {
    const tag = await createInviteTag({ nome: name })
    await refreshTags()
    await toggleTag(tag.id)
    newTagName.value = ''
  } catch {
    toast.error('Não foi possível criar a etiqueta.')
  }
}

const deleteTarget = ref<{ id: string; nome: string } | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

function openDeleteModal(tag: { id: string; nome: string }) {
  deleteTarget.value = tag
  isDeleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true
  try {
    await deleteInviteTag(deleteTarget.value.id)
    await refreshTags()
    emit('changed')
    isDeleteModalOpen.value = false
    deleteTarget.value = null
  } catch {
    toast.error('Não foi possível excluir a etiqueta.')
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UiCard>
    <template #header>
      <h2 class="text-lg font-medium text-text">Etiquetas</h2>
    </template>
    <div class="flex flex-wrap gap-2">
      <UiChip
        v-for="tag in tagsData?.data ?? []"
        :key="tag.id"
        :label="tag.nome"
        :selected="isTagSelected(tag.id)"
        clickable
        removable
        @click="toggleTag(tag.id)"
        @remove="openDeleteModal(tag)"
      />
    </div>
    <div class="mt-3 flex items-center gap-2">
      <UiInput v-model="newTagName" placeholder="Nova etiqueta" class="max-w-xs" />
      <UiButton size="sm" variant="ghost" @click="addNewTag">Adicionar</UiButton>
    </div>

    <UiModal v-model="isDeleteModalOpen" title="Excluir etiqueta">
      <p class="text-sm text-text">
        Tem certeza que deseja excluir a etiqueta <strong>{{ deleteTarget?.nome }}</strong
        >? Ela será removida de todos os convites que a usam.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDeleting" @click="isDeleteModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDeleting" @click="confirmDelete"
          >Excluir</UiButton
        >
      </template>
    </UiModal>
  </UiCard>
</template>
