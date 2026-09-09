<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { RSVP_SEARCH_MIN_CHARS } from '#shared/schemas/rsvp'
import type { RsvpInvitePayload, RsvpSearchResult } from '~/types/rsvp'

definePageMeta({ layout: 'default' })

// noindex: a busca por nome é um fluxo pessoal do convidado, não conteúdo
// para buscador — mas o título ainda identifica o casamento para quem tem a
// aba aberta entre várias.
useSeoMeta({
  title: 'Confirmação de Presença',
  robots: 'noindex, nofollow',
})

const { searchGuests, selectGuest, confirmGuest } = useRsvp()
const slug = useWeddingSlug()
const backToSiteLink = computed(() => `/${slug}`)

// Dados públicos do casamento (já usados na home, mesma chave de cache —
// CLAUDE.md §26) só para dar contexto no painel esquerdo do cartão de
// busca (nome do casal/data). Nada sensível: a mesma informação já é
// visível pra qualquer pessoa com o link do site.
const { getPublicWedding } = usePublicWedding()
const { data: wedding } = await getPublicWedding()

// Slug inexistente responde 404 de verdade (mesma regra da home): a página não
// pode existir sem o casamento por trás dela. `fatal` para o erro subir no SSR
// e o status HTTP ser realmente 404, não uma tela de erro dentro de um 200.
if (!wedding.value) {
  throw createError({ statusCode: 404, statusMessage: 'Casamento não encontrado', fatal: true })
}

const formattedDate = computed(() =>
  wedding.value
    ? new Date(`${wedding.value.data_evento}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null,
)

type Step = 'search' | 'light-confirm' | 'invite'
const step = ref<Step>('search')

// --- passo 1: busca ---

const query = ref('')
const results = ref<RsvpSearchResult[]>([])
const isSearching = ref(false)
const searchError = ref<string | null>(null)

const debouncedSearch = useDebounceFn(async (value: string) => {
  isSearching.value = true
  try {
    const response = await searchGuests(value)
    results.value = response.data
  } catch {
    searchError.value = 'Não foi possível buscar agora. Tente novamente.'
  } finally {
    isSearching.value = false
  }
}, 300)

watch(query, (value) => {
  searchError.value = null
  if (value.trim().length < RSVP_SEARCH_MIN_CHARS) {
    results.value = []
    return
  }
  debouncedSearch(value.trim())
})

// --- passo 2: confirmação leve ---

const selectedGuestId = ref<string | null>(null)
const maskedNames = ref<string[]>([])

async function handleSelectResult(result: RsvpSearchResult) {
  selectedGuestId.value = result.guestId
  const response = await selectGuest(result.guestId)
  maskedNames.value = response.maskedNames
  step.value = 'light-confirm'
}

function backToSearch() {
  step.value = 'search'
  selectedGuestId.value = null
  maskedNames.value = []
}

// --- passo 3: confirmação total ---

const invitePayload = ref<RsvpInvitePayload | null>(null)

async function handleConfirmIdentity() {
  if (!selectedGuestId.value) return
  invitePayload.value = await confirmGuest(selectedGuestId.value)
  step.value = 'invite'
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col justify-center px-6 py-16">
    <!--
      Só a etapa 'search' não tem uma "etapa anterior" real dentro do
      próprio fluxo de RSVP — por isso é a única que volta direto pro site.
      'light-confirm' já tem "Buscar de novo" (volta pra busca) e 'invite'
      tem seu próprio botão "Voltar à busca" (RsvpInviteFlow, evento @back).
    -->
    <NuxtLink
      v-if="step === 'search'"
      :to="backToSiteLink"
      class="mb-6 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted transition-brand hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Voltar ao site
    </NuxtLink>

    <template v-if="step === 'search'">
      <!--
        Contexto em cima, busca embaixo — em TODA largura.
        Havia aqui um cartão de duas colunas no desktop, com o contexto à
        esquerda e o campo à direita. Não funcionava: o lado da busca tem uma
        linha de conteúdo (um campo, e a lista de resultados só depois de
        digitar), então ficava um painel quase vazio flutuando ao lado de um
        painel cheio — desequilíbrio que só piorava quanto mais larga a tela.
        Empilhado, a leitura é a mesma do celular, que já estava certa: quem é
        o casal, o que se pede, e então o campo.
      -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
        class="flex flex-col gap-8"
      >
        <PublicPageHeader
          :eyebrow="wedding?.nomes_noivos"
          title="Confirme sua Presença"
          description="Digite seu nome para localizar seu convite e confirmar sua presença e a dos seus acompanhantes."
        >
          <p v-if="formattedDate" class="text-xs tracking-[0.2em] text-text-muted uppercase">
            {{ formattedDate }}
          </p>
        </PublicPageHeader>

        <div
          class="flex flex-col gap-4 rounded-xl border border-border/70 bg-surface-elevated p-6 sm:p-8"
        >
          <UiInput v-model="query" placeholder="Seu nome completo" autofocus />

          <p v-if="searchError" class="text-sm text-danger" role="alert">{{ searchError }}</p>

          <ul v-if="results.length" class="flex flex-col gap-2">
            <li v-for="result in results" :key="result.guestId">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-left text-sm text-text transition-brand hover:border-primary/40 hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                @click="handleSelectResult(result)"
              >
                {{ result.fullName }}
                <Icon name="lucide:chevron-right" class="h-4 w-4 text-text-muted" />
              </button>
            </li>
          </ul>
          <p
            v-else-if="query.trim().length >= RSVP_SEARCH_MIN_CHARS && !isSearching"
            class="text-center text-sm text-text-muted"
          >
            Nenhum convidado encontrado com esse nome.
          </p>
        </div>
      </div>
    </template>

    <template v-else-if="step === 'light-confirm'">
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
        class="flex flex-col items-center gap-4 rounded-xl border border-border/70 bg-surface-elevated p-8 text-center sm:p-10"
      >
        <span
          class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Icon name="lucide:party-popper" class="h-5 w-5" />
        </span>
        <div>
          <p class="font-display text-xl font-semibold text-heading">Encontramos você!</p>
          <p v-if="maskedNames.length" class="mt-1 text-sm text-text-muted">
            Seu convite também inclui: {{ maskedNames.join(', ') }}
          </p>
        </div>
        <div class="flex gap-3">
          <UiButton @click="handleConfirmIdentity">Sim, sou eu</UiButton>
          <UiButton variant="ghost" @click="backToSearch">Buscar de novo</UiButton>
        </div>
      </div>
    </template>

    <template v-else-if="step === 'invite' && invitePayload">
      <div class="flex flex-col gap-6">
        <div class="text-center">
          <p class="text-sm uppercase tracking-widest text-text-muted">
            {{ invitePayload.wedding.coupleNames }}
          </p>
          <h1 class="mt-1 font-display text-2xl font-semibold text-heading">
            Confirmação de Presença
          </h1>
        </div>
        <RsvpInviteFlow :payload="invitePayload" @back="backToSearch" />
      </div>
    </template>
  </div>
</template>
