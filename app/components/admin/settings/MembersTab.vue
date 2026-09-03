<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { weddingMemberInviteSchema } from '#shared/schemas/wedding-members'
import { getApiErrorMessage } from '~/utils/api-error'

// Gestão de colaboradores (docs/PLANO-SAAS.md, Passo 3) — a única UI que
// consome server/api/wedding/members/**, existentes desde a implementação
// dos endpoints mas sem tela nenhuma até agora. Convidar/remover só aparece
// pra quem tem papel 'dono' (mesma checagem já feita no servidor, aqui só
// pra UX — nunca a fonte de autorização, CLAUDE.md seção 4.2).
const authStore = useAuthStore()
const isOwner = computed(() => authStore.weddingContext?.role === 'dono')

const toast = useToast()
const { listWeddingMembers, inviteWeddingMember, removeWeddingMember } = useWeddingMembers()
const { data, status, error, refresh } = listWeddingMembers()

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(weddingMemberInviteSchema),
  initialValues: { email: '', papel: 'colaborador' },
})

const [email] = defineField('email')
const [papel] = defineField('papel')

const onSubmit = handleSubmit(async (values) => {
  try {
    await inviteWeddingMember(values)
    resetForm({ values: { email: '', papel: 'colaborador' } })
    toast.success('Colaborador convidado — um e-mail de acesso foi enviado.')
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível convidar este colaborador.'))
  }
})

const removeTargetId = ref<string | null>(null)
const isRemoveModalOpen = ref(false)
const isRemoving = ref(false)

function openRemoveModal(id: string) {
  removeTargetId.value = id
  isRemoveModalOpen.value = true
}

async function confirmRemove() {
  if (!removeTargetId.value) return
  isRemoving.value = true
  try {
    await removeWeddingMember(removeTargetId.value)
    isRemoveModalOpen.value = false
    removeTargetId.value = null
    await refresh()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível remover este colaborador.'))
  } finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UiCard v-if="isOwner">
      <form class="flex flex-col gap-4 sm:flex-row sm:items-end" @submit="onSubmit">
        <UiInput
          v-model="email"
          type="email"
          label="E-mail do colaborador"
          placeholder="pessoa@exemplo.com"
          class="flex-1"
          :error="errors.email"
        />
        <UiSelect
          v-model="papel"
          label="Papel"
          :options="[
            { value: 'colaborador', label: 'Colaborador' },
            { value: 'dono', label: 'Dono' },
          ]"
          :error="errors.papel"
        />
        <UiButton type="submit" :disabled="isSubmitting">Convidar</UiButton>
      </form>
    </UiCard>

    <UiCard padding="md">
      <div v-if="status === 'pending'" class="flex flex-col gap-2">
        <UiSkeleton v-for="n in 2" :key="n" class="h-12 w-full" />
      </div>

      <UiEmptyState
        v-else-if="error"
        icon="lucide:alert-triangle"
        title="Não foi possível carregar os colaboradores"
        description="Verifique sua conexão e tente novamente."
      >
        <UiButton variant="ghost" @click="refresh()">Tentar novamente</UiButton>
      </UiEmptyState>

      <ul v-else class="flex flex-col divide-y divide-border">
        <li
          v-for="member in data?.data"
          :key="member.id"
          class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div>
            <p class="text-sm font-medium text-text">{{ member.email ?? member.usuario_id }}</p>
            <UiBadge :tone="member.papel === 'dono' ? 'success' : 'neutral'">
              {{ member.papel === 'dono' ? 'Dono' : 'Colaborador' }}
            </UiBadge>
          </div>
          <UiButton
            v-if="isOwner"
            size="sm"
            variant="destructive"
            @click="openRemoveModal(member.id)"
          >
            Remover
          </UiButton>
        </li>
      </ul>
    </UiCard>

    <UiModal v-model="isRemoveModalOpen" title="Remover colaborador">
      <p class="text-sm text-text">
        Tem certeza que deseja remover o acesso deste colaborador a este casamento? A conta dele
        continua existindo — só o vínculo com este casamento é removido.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isRemoving" @click="isRemoveModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isRemoving" @click="confirmRemove">
          Remover
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
