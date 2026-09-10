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
/** Para o link do convite vinculado apontar para a tela de Convites deste casamento. */
const slug = useActiveWeddingSlug()

const { data: groupsData, refresh: refreshGroups } = listGroups({ pageSize: 100 })
const groupOptions = computed(() => montarOpcoesDeGrupo(groupsData.value?.data ?? []))

const isEditing = computed(() => Boolean(props.guestId))

const isLoading = ref(false)
const hasLoadError = ref(false)

const primary = ref(emptyPerson())
const companions = ref<CompanionEntry[]>([])
/**
 * Posição deste convidado na fila do núcleo. Era implícita e sempre zero, o
 * que fazia salvar pela Maria reescrever "João e Maria" como "Maria e João" na
 * lista inteira — ver `primaryPosition` em `guestPartySyncSchema`.
 */
const primaryPosition = ref(0)
const removedGuestIds = ref<string[]>([])
/**
 * O convite já vinculado, quando existe. `GET /api/guests/:id` sempre devolveu
 * `invite: { id, nome }`, e o formulário guardava só um booleano para ESCONDER
 * o bloco — então a tela sabia do vínculo e não contava a ninguém: nem o nome,
 * nem o caminho para a tela de Convites.
 */
const inviteVinculado = ref<{ id: string; nome: string } | null>(null)
const inviteDraft = ref<InviteDraft>({ criar: false, nome: '' })

const primaryNameError = ref<string | null>(null)
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

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
  // Onde este convidado entra na fila: `partyMembers` vem ordenado por
  // `ordem_nucleo` e sem ele, então a posição dele é quantos vêm antes.
  primaryPosition.value = detail
    ? (detail.partyMembers ?? []).filter((member) => member.ordem_nucleo < detail.ordem_nucleo)
        .length
    : 0
  removedGuestIds.value = []
  inviteVinculado.value = detail?.invite ?? null
  // `criar: false` a cada abertura: virou ação pedida, não resposta já dada.
  // Como caixa pré-marcada, o convite nascia sem ninguém escolher — e o casal
  // que planeja os convites na tela de Convites (um cartão para uma família
  // inteira, por exemplo) tinha de desmarcar para não acumular convite por
  // núcleo cadastrado.
  inviteDraft.value = { criar: false, nome: '' }
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

// O nome do convite é DERIVADO do primeiro nome, e a linha de convite o mostra
// antes de salvar para não haver surpresa. Não é mais um campo aqui: renomear é
// assunto da tela de Convites, que é onde o convite se administra.
//
// Sem `if (inviteDraft.nome)` para travar: como ninguém digita mais nada aqui,
// não existe valor do usuário a preservar — e travar deixaria o nome preso ao
// primeiro rascunho, anunciando "Família Joao" depois de o campo virar "Maria".
watch(
  () => primary.value.nomeCompleto,
  (nome) => {
    const primeiroNome = nome.trim().split(/\s+/)[0]
    inviteDraft.value = {
      ...inviteDraft.value,
      nome: primeiroNome ? `Família ${primeiroNome}` : '',
    }
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
      primaryPosition: primaryPosition.value,
      removedGuestIds: removedGuestIds.value,
      // Só quando pedido, e nunca sobre um convite que já existe: mexer no
      // convite vinculado é assunto da tela de Convites.
      invite:
        !inviteVinculado.value && inviteDraft.value.criar
          ? { nome: inviteDraft.value.nome || 'Convite' }
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
        v-model:primary-position="primaryPosition"
        :group-options="groupOptions"
        :primary-id="primary.id"
        :primary-name="primary.nomeCompleto"
        class="border-t border-border pt-5"
        @group-created="() => refreshGroups()"
        @remove-existing="(guestId) => removedGuestIds.push(guestId)"
      />

      <!-- Sem `v-if`: a linha existe sempre, porque o estado do vínculo é
           informação em todos os casos — inclusive (e principalmente) quando já
           existe convite, situação em que o bloco antigo desaparecia. -->
      <AdminGuestsGuestPartyInvite
        v-model="inviteDraft"
        :party-size="companions.length + 1"
        :invite-vinculado="inviteVinculado"
        :wedding-slug="slug"
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
