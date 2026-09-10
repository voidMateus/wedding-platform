<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import type { InviteDetail, InviteEvent } from '~/types/invite'

// Rótulo e cor vêm do mapa único (app/utils/status-presentation.ts) — o
// convite enviado e sem resposta é warning; não enviado é só "ainda não
// aconteceu", então neutral.

interface Props {
  modelValue: boolean
  inviteId?: string | null
}

const props = withDefaults(defineProps<Props>(), { inviteId: null })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  /** Algo mudou no convite (nome, membros, arquivamento) — o pai recarrega a listagem. */
  changed: []
}>()

const { fetchInvite, fetchInviteTimeline, setInviteSent, setInviteArchived } = useInvites()
const { getWedding } = useWedding()
const toast = useToast()

// Mesma chave 'wedding' já usada pelo layout admin — dedup automático, sem
// fetch extra. O slug monta o link público de RSVP.
const { data: wedding } = getWedding()
const activeSlug = useActiveWeddingSlug()

const invite = ref<InviteDetail | null>(null)
const timeline = ref<InviteEvent[]>([])
const isLoading = ref(false)
const hasLoadError = ref(false)
const isBusy = ref(false)

const stagePresentation = computed(() =>
  invite.value
    ? inviteStagePresentation(invite.value.stage)
    : { label: '', tone: 'neutral' as const, action: null },
)

async function load() {
  if (!props.inviteId) {
    invite.value = null
    timeline.value = []
    return
  }
  // Convite diferente do que está em memória: descarta antes de buscar, senão
  // o modal abriria piscando o dado do registro anterior.
  if (invite.value && invite.value.id !== props.inviteId) {
    invite.value = null
    timeline.value = []
  }
  isLoading.value = true
  hasLoadError.value = false
  try {
    const [detail, events] = await Promise.all([
      fetchInvite(props.inviteId),
      fetchInviteTimeline(props.inviteId),
    ])
    invite.value = detail
    timeline.value = events.data
  } catch {
    hasLoadError.value = true
  } finally {
    isLoading.value = false
  }
}

// Recarrega a cada abertura (e a cada troca de convite com o modal aberto): o
// detalhe precisa refletir o que está no banco agora.
watch(
  () => [props.modelValue, props.inviteId] as const,
  ([isOpen]) => {
    if (isOpen) load()
  },
  { immediate: true },
)

/** Recarrega o detalhe e avisa a listagem — usado por toda mutação das seções. */
async function handleChanged() {
  await load()
  emit('changed')
}

/**
 * Marca ou desmarca o envio, nos dois sentidos e sem confirmação.
 *
 * Sem diálogo de propósito: desmarcar É a recuperação de um clique errado, e
 * pedir confirmação para desfazer seria colocar atrito na frente do atrito.
 * (Arquivar confirma porque tira o convite da listagem — aqui nada desaparece.)
 *
 * Vale notar o que desmarcar NÃO faz: se o convidado já abriu o convite, o
 * estágio continua "Aberto", porque acesso é fato comprovado e envio é
 * informação do casal. Desmarcar corrige o registro, não apaga o que aconteceu.
 */
async function toggleSent() {
  if (!invite.value) return
  const marcando = !invite.value.enviado_em
  isBusy.value = true
  try {
    await setInviteSent(invite.value.id, marcando)
    toast.success(marcando ? 'Convite marcado como enviado.' : 'Marcação de envio desfeita.')
    await handleChanged()
  } catch (err) {
    toast.error(
      getApiErrorMessage(
        err,
        marcando
          ? 'Não foi possível marcar o convite como enviado.'
          : 'Não foi possível desfazer a marcação de envio.',
      ),
    )
  } finally {
    isBusy.value = false
  }
}

// Confirmação inline, não um segundo modal: o detalhe do convite já é um
// modal, e empilhar diálogo sobre diálogo embaralha foco e ESC.
const isConfirmingArchive = ref(false)

async function toggleArchive() {
  if (!invite.value) return
  const isArchiving = !invite.value.arquivado_em
  isConfirmingArchive.value = false
  isBusy.value = true
  try {
    await setInviteArchived(invite.value.id, isArchiving)
    toast.success(isArchiving ? 'Convite arquivado.' : 'Convite desarquivado.')
    await handleChanged()
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível arquivar o convite.'))
  } finally {
    isBusy.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    :title="invite?.nome ?? 'Convite'"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <!-- Esqueleto só na primeira carga: numa recarga depois de uma mutação o
         conteúdo continua montado de propósito. O link de acesso recém-gerado
         só existe em memória e não pode ser recuperado depois — desmontar a
         seção durante o refresh apagaria o link antes de dar tempo de copiar. -->
    <div v-if="isLoading && !invite" class="flex flex-col gap-3">
      <UiSkeleton class="h-8 w-full" />
      <UiSkeleton class="h-40 w-full" />
      <UiSkeleton class="h-24 w-full" />
    </div>

    <UiEmptyState
      v-else-if="hasLoadError && !invite"
      icon="lucide:alert-triangle"
      title="Não foi possível carregar o convite"
      description="Verifique sua conexão e tente novamente."
    >
      <UiButton variant="ghost" @click="load">Tentar novamente</UiButton>
    </UiEmptyState>

    <div v-else-if="invite" class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <!-- UM badge de estágio, não três empilhados. "enviado" saiu
               porque virou estágio do funil; "arquivado" fica porque não é
               estágio — é escopo, e um convite arquivado pode estar em
               qualquer ponto do funil. A providência ao lado é o que o
               estágio pede a seguir. -->
          <UiBadge :tone="stagePresentation.tone">
            {{ stagePresentation.label }}
          </UiBadge>
          <span v-if="stagePresentation.action" class="text-xs text-text-muted">
            {{ stagePresentation.action }}
          </span>
          <span v-if="invite.memberCount" class="num text-xs text-text-muted">
            {{ invite.respondedCount }} de {{ invite.memberCount }} responderam
          </span>
          <UiBadge v-if="invite.arquivado_em" tone="neutral">arquivado</UiBadge>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <!-- Sempre visível, nos dois sentidos: "enviado" é informação manual
               do casal, e um clique errado ficava permanente — empurrando o
               convite para um estágio falso do funil sem caminho de volta. -->
          <UiButton size="sm" variant="ghost" :disabled="isBusy" @click="toggleSent">
            {{ invite.enviado_em ? 'Desmarcar envio' : 'Marcar como enviado' }}
          </UiButton>
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="isBusy"
            @click="isConfirmingArchive = true"
          >
            {{ invite.arquivado_em ? 'Desarquivar' : 'Arquivar' }}
          </UiButton>
        </div>
      </div>

      <div
        v-if="isConfirmingArchive"
        class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2"
      >
        <p class="text-sm text-text">
          <template v-if="invite.arquivado_em">
            Desarquivar <strong>{{ invite.nome }}</strong
            >? Ele volta para a lista de convites ativos.
          </template>
          <template v-else>
            Arquivar <strong>{{ invite.nome }}</strong
            >? Ele sai da lista, mas nada é apagado — os convidados e as respostas continuam, e você
            pode desarquivar depois.
          </template>
        </p>
        <div class="flex shrink-0 items-center gap-2">
          <UiButton
            size="sm"
            variant="ghost"
            :disabled="isBusy"
            @click="isConfirmingArchive = false"
          >
            Cancelar
          </UiButton>
          <UiButton
            size="sm"
            :variant="invite.arquivado_em ? 'primary' : 'destructive'"
            :disabled="isBusy"
            @click="toggleArchive"
          >
            {{ invite.arquivado_em ? 'Desarquivar' : 'Arquivar' }}
          </UiButton>
        </div>
      </div>

      <AdminInvitesInviteIdentitySection :key="invite.id" :invite="invite" @saved="handleChanged" />

      <AdminInvitesInviteGuestsSection
        :invite="invite"
        :wedding-slug="activeSlug"
        @changed="handleChanged"
      />

      <AdminInvitesInviteAccessLinkSection
        :key="`link-${invite.id}`"
        :invite-id="invite.id"
        :wedding-slug="wedding?.slug"
        @changed="handleChanged"
      />

      <AdminInvitesInviteTimelineSection :events="timeline" :members="invite.members" />
    </div>
  </UiModal>
</template>
