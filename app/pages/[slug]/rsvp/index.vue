<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { RSVP_SEARCH_MIN_CHARS } from '#shared/schemas/rsvp'
import type { RsvpInvitePayload, RsvpSearchResult } from '~/types/rsvp'

definePageMeta({ layout: 'default' })

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
const { data: wedding } = getPublicWedding()

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
  <div
    class="mx-auto flex min-h-[70vh] flex-col justify-center px-4 py-16"
    :class="step === 'search' ? 'max-w-3xl' : 'max-w-xl'"
  >
    <!--
      Só a etapa 'search' não tem uma "etapa anterior" real dentro do
      próprio fluxo de RSVP — por isso é a única que volta direto pro site.
      'light-confirm' já tem "Buscar de novo" (volta pra busca) e 'invite'
      tem seu próprio botão "Voltar à busca" (RsvpInviteFlow, evento @back).
    -->
    <NuxtLink
      v-if="step === 'search'"
      :to="backToSiteLink"
      class="mb-6 inline-flex min-h-11 w-fit items-center gap-1.5 text-sm text-text-muted hover:text-text"
    >
      <Icon name="lucide:arrow-left" class="h-4 w-4" />
      Voltar ao site
    </NuxtLink>

    <template v-if="step === 'search'">
      <!--
        Cartão em duas colunas (referência de estilo: mimodocasal.com.br) —
        painel esquerdo dá contexto emocional (casal/data), painel direito é
        a busca de verdade. Em telas estreitas empilha (painel de contexto
        vira um cabeçalho compacto acima do formulário).
      -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
        class="grid overflow-hidden rounded-xl border border-primary/10 bg-surface-elevated shadow-xl lg:grid-cols-[0.85fr_1.15fr]"
      >
        <div
          class="flex flex-col justify-center gap-4 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-8 sm:p-10"
        >
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="lucide:mail-check" class="h-5 w-5" />
          </span>
          <div v-if="wedding">
            <p class="font-display text-xl font-semibold text-heading">{{ wedding.nomes_noivos }}</p>
            <p class="text-sm text-text-muted">{{ formattedDate }}</p>
          </div>
          <div>
            <h1 class="font-display text-2xl font-semibold text-heading">Confirmação de Presença</h1>
            <p class="mt-1 text-sm leading-relaxed text-text-muted">
              Digite seu nome para localizar seu convite e confirmar presença, restrições alimentares e
              acompanhantes.
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-4 p-8 sm:p-10">
          <UiInput v-model="query" placeholder="Seu nome completo" autofocus />

          <p v-if="searchError" class="text-sm text-red-600" role="alert">{{ searchError }}</p>

          <ul v-if="results.length" class="flex flex-col gap-2">
            <li v-for="result in results" :key="result.guestId">
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-left text-sm text-text transition-colors hover:border-primary/40 hover:bg-primary/5"
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
        class="flex flex-col items-center gap-4 rounded-xl border border-primary/10 bg-surface-elevated p-8 text-center shadow-xl sm:p-10"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
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
          <h1 class="mt-1 font-display text-2xl font-semibold text-heading">Confirmação de Presença</h1>
        </div>
        <RsvpInviteFlow :payload="invitePayload" @back="backToSearch" />
      </div>
    </template>
  </div>
</template>
