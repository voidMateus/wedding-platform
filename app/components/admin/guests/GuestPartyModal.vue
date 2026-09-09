<!--
  O cadastro de convidado — uma tela só, não mais um wizard de quatro passos.

  O wizard existia por simetria com a importação, mas as duas coisas não são
  parecidas: importar é um processo com etapas de verdade (arquivo, de-para,
  revisão), e cadastrar uma pessoa é preencher um formulário. Em passos, o
  caso comum — "Maria, adulta, família da noiva" — custava três avanços, um
  deles só para dizer "nenhum acompanhante", e outro para revisar dados que
  ainda estavam na tela anterior. O passo de Revisão em particular só existia
  porque os campos ficavam escondidos uns dos outros.

  Numa tela, a hierarquia é o que organiza: a pessoa em cima, o núcleo de
  acompanhantes no meio, o convite no fim — e cada bloco só mostra o que
  precisa, com o resto atrás de "Mais detalhes".

  Excluir NÃO fica aqui, apesar de o modelo que inspirou a tela ter o botão no
  rodapé do painel: as duas telas de convidados já excluem pela ação da linha,
  com confirmação. Um terceiro caminho abriria um diálogo de confirmação dentro
  deste diálogo, prendendo o foco em duas camadas.
-->
<script setup lang="ts">
import type { GuestDetail } from '~/composables/useGuests'
import type { CompanionEntry } from './GuestPartyCompanions.vue'
import type { InviteDraft } from './GuestPartyInvite.vue'

interface Props {
  modelValue: boolean
  /** Ausente/null abre em cadastro; com id, carrega o convidado e abre em edição. */
  guestId?: string | null
  /**
   * Grupo já escolhido ao abrir em cadastro — é o que faz a linha "Adicionar
   * convidado..." de um bloco do Modo Lista levar a pessoa para AQUELE grupo,
   * em vez de a um formulário vazio que obriga a escolher de novo o que o
   * clique já disse. Ignorado em edição: ali o grupo é o que está no banco.
   */
  initialGroupId?: string | null
}

const props = withDefaults(defineProps<Props>(), { guestId: null, initialGroupId: null })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Convidado (com acompanhantes/convite) salvo — o pai recarrega a listagem e fecha. */
  saved: []
}>()

const { fetchGuestDetail, syncGuestParty } = useGuests()
const { listGroups } = useGroups()
const toast = useToast()

const { data: groupsData, refresh: refreshGroups } = listGroups({ pageSize: 100 })
const groupOptions = computed(() => montarOpcoesDeGrupo(groupsData.value?.data ?? []))

const isEditing = computed(() => Boolean(props.guestId))

const isLoading = ref(false)
const hasLoadError = ref(false)

const primary = ref(emptyPerson())
const companions = ref<CompanionEntry[]>([])
const removedGuestIds = ref<string[]>([])
const hasExistingInvite = ref(false)
const inviteDraft = ref<InviteDraft>({ criar: true, nome: '', observacoes: '' })

const primaryNameError = ref<string | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

/**
 * O convite só se propõe quando há grupo para convidar e ainda não existe um.
 * Com um convite já vinculado, mexer nele é assunto da tela de Convites.
 */
const mostrarConvite = computed(() => companions.value.length > 0 && !hasExistingInvite.value)

/**
 * Repõe o formulário do zero a cada abertura.
 *
 * Antes isto era uma `:key` que remontava o wizard inteiro — sem ela, o
 * segundo "Editar" da sessão mostrava os dados do primeiro. Com o estado aqui,
 * a reposição é explícita: quem abre o modal define o formulário, e não sobra
 * nada da abertura anterior.
 */
function aplicarConvidado(detail: GuestDetail | null) {
  primary.value = detail
    ? personFromGuest(detail)
    : { ...emptyPerson(), grupoId: props.initialGroupId ?? '' }
  companions.value = (detail?.partyMembers ?? []).map((member) => ({
    key: member.id,
    person: personFromGuest(member),
  }))
  removedGuestIds.value = []
  hasExistingInvite.value = Boolean(detail?.invite)
  inviteDraft.value = { criar: true, nome: '', observacoes: '' }
  primaryNameError.value = null
  errorMessage.value = null
}

async function loadGuest() {
  if (!props.guestId) {
    hasLoadError.value = false
    aplicarConvidado(null)
    return
  }
  isLoading.value = true
  hasLoadError.value = false
  try {
    aplicarConvidado(await fetchGuestDetail(props.guestId))
  } catch {
    hasLoadError.value = true
  } finally {
    isLoading.value = false
  }
}

// Recarrega a cada abertura (e a cada troca de convidado com o modal aberto):
// o detalhe precisa refletir o que está no banco agora, não o de uma edição
// anterior desta mesma sessão.
watch(
  () => [props.modelValue, props.guestId] as const,
  ([isOpen]) => {
    if (isOpen) loadGuest()
  },
  { immediate: true },
)

// Sugere o nome do convite a partir do responsável, sem nunca sobrescrever o
// que já foi digitado.
watch(
  () => primary.value.nomeCompleto,
  (nome) => {
    if (inviteDraft.value.nome || !nome) return
    const primeiroNome = nome.trim().split(/\s+/)[0]
    if (primeiroNome) inviteDraft.value = { ...inviteDraft.value, nome: `Família ${primeiroNome}` }
  },
)

function fechar() {
  emit('update:modelValue', false)
}

async function salvar() {
  if (!primary.value.nomeCompleto.trim()) {
    primaryNameError.value = 'Informe o nome do convidado.'
    return
  }
  primaryNameError.value = null
  errorMessage.value = null
  isSubmitting.value = true
  try {
    await syncGuestParty({
      primary: primary.value,
      companions: companions.value.map((entry) => entry.person),
      removedGuestIds: removedGuestIds.value,
      invite:
        mostrarConvite.value && inviteDraft.value.criar
          ? {
              nome: inviteDraft.value.nome || 'Convite',
              observacoes: inviteDraft.value.observacoes,
            }
          : undefined,
    })
    toast.success(isEditing.value ? 'Convidado atualizado.' : 'Convidado cadastrado.')
    emit('saved')
  } catch (err) {
    const apiError = err as { data?: { message?: string } }
    errorMessage.value = apiError.data?.message ?? 'Não foi possível salvar. Tente novamente.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="isEditing ? 'Editar convidado' : 'Novo convidado'"
    :description="
      isEditing ? undefined : 'Só o nome é obrigatório — o resto pode ficar para depois.'
    "
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="isLoading" class="flex flex-col gap-3">
      <UiSkeleton class="h-7 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <UiEmptyState
      v-else-if="hasLoadError"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o convidado"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="loadGuest">Tentar novamente</UiButton>
    </UiEmptyState>

    <div v-else class="flex flex-col gap-6">
      <AdminGuestsGuestPersonFields
        v-model="primary"
        :group-options="groupOptions"
        :full-name-error="primaryNameError"
        @group-created="() => refreshGroups()"
      />

      <AdminGuestsGuestPartyCompanions
        v-model="companions"
        :group-options="groupOptions"
        :primary-id="primary.id"
        class="border-t border-border pt-5"
        @group-created="() => refreshGroups()"
        @remove-existing="(guestId) => removedGuestIds.push(guestId)"
      />

      <AdminGuestsGuestPartyInvite
        v-if="mostrarConvite"
        v-model="inviteDraft"
        :party-size="companions.length + 1"
      />
    </div>

    <template #footer>
      <!-- O erro fica no rodapé, junto do botão que falhou: no fim da área
           rolável ele podia estar fora da vista no momento do clique. -->
      <p v-if="errorMessage" class="mr-auto self-center text-sm text-danger" role="alert">
        {{ errorMessage }}
      </p>
      <UiButton variant="ghost" @click="fechar">Cancelar</UiButton>
      <!-- "Cadastrar", não "Adicionar convidado": esse é o nome do botão que
           ABRE este modal, e dois controles com o mesmo nome acessível na
           mesma tela deixam o leitor de tela (e o teste) sem como distingui-los. -->
      <UiButton :disabled="isSubmitting || isLoading || hasLoadError" @click="salvar">
        {{ isSubmitting ? 'Salvando...' : isEditing ? 'Salvar' : 'Cadastrar convidado' }}
      </UiButton>
    </template>
  </UiModal>
</template>
