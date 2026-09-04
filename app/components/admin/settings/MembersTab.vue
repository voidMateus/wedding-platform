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

const memberCount = computed(() => data.value?.data?.length ?? 0)
const accessDescription = computed(() =>
  memberCount.value === 1 ? '1 pessoa neste evento.' : `${memberCount.value} pessoas neste evento.`,
)

// Espelha exatamente a regra do servidor (server/api/wedding/members/[id].
// delete.ts): o último dono restante não pode sair, senão o casamento fica
// sem ninguém capaz de gerenciar acessos. Mostrar isso na linha evita
// oferecer um botão que só vai devolver erro — e é só UX, a autorização
// continua sendo do endpoint (CLAUDE.md seção 4.2).
const ownerCount = computed(
  () => data.value?.data?.filter((member) => member.papel === 'dono').length ?? 0,
)

function isLastOwner(papel: string): boolean {
  return papel === 'dono' && ownerCount.value <= 1
}

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
  <div class="flex flex-col gap-5">
    <!-- O cartão existe também para colaborador, só sem o formulário: o
         sub-menu da aba aponta uma âncora para #convidar, e esconder a seção
         inteira deixaria esse link sem destino. -->
    <AdminSettingsSectionCard
      section-id="convidar"
      title="Convidar colaborador"
      description="Colaboradores podem editar o site e a lista de convidados. Só o dono altera pagamentos e acessos."
    >
      <form
        v-if="isOwner"
        class="flex flex-col gap-4 sm:flex-row sm:items-start"
        @submit="onSubmit"
      >
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
        <!-- mt-6 alinha o botão à base dos campos, abaixo da linha de rótulo. -->
        <UiButton type="submit" :disabled="isSubmitting" class="shrink-0 sm:mt-6">
          Convidar
        </UiButton>
      </form>

      <p v-else class="text-sm text-text-muted">
        Só o dono deste casamento pode convidar novos colaboradores.
      </p>
    </AdminSettingsSectionCard>

    <AdminSettingsSectionCard
      section-id="acessos"
      title="Quem tem acesso"
      :description="status === 'pending' ? undefined : accessDescription"
    >
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

      <ul v-else class="divide-y divide-border overflow-hidden rounded-md border border-border">
        <li
          v-for="member in data?.data"
          :key="member.id"
          class="flex items-center justify-between gap-4 px-4 py-3"
        >
          <div class="min-w-0">
            <p class="truncate text-sm font-medium text-text">
              {{ member.email ?? member.usuario_id }}
            </p>
            <!-- primary, não success: papel é identidade, não desfecho de processo. -->
            <UiBadge :tone="member.papel === 'dono' ? 'primary' : 'neutral'" class="mt-1">
              {{ member.papel === 'dono' ? 'Dono' : 'Colaborador' }}
            </UiBadge>
          </div>
          <span v-if="isLastOwner(member.papel)" class="shrink-0 text-xs text-text-muted">
            Não pode ser removido
          </span>
          <UiButton
            v-else-if="isOwner"
            size="sm"
            variant="destructive"
            class="shrink-0"
            @click="openRemoveModal(member.id)"
          >
            Remover
          </UiButton>
        </li>
      </ul>
    </AdminSettingsSectionCard>

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
