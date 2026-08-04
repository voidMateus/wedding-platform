<script setup lang="ts">
import type { RsvpInvitePayload, RsvpSearchResult } from '~/types/rsvp'

definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Confirmação de Presença',
  robots: 'noindex, nofollow',
})

const { searchGuests, selectGuest, confirmGuest } = useRsvp()

type Step = 'search' | 'light-confirm' | 'invite'
const step = ref<Step>('search')

// --- passo 1: busca ---

const query = ref('')
const results = ref<RsvpSearchResult[]>([])
const isSearching = ref(false)
const searchError = ref<string | null>(null)

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(query, (value) => {
  clearTimeout(searchTimeout)
  searchError.value = null
  if (value.trim().length < 3) {
    results.value = []
    return
  }
  searchTimeout = setTimeout(async () => {
    isSearching.value = true
    try {
      const response = await searchGuests(value.trim())
      results.value = response.data
    } catch {
      searchError.value = 'Não foi possível buscar agora. Tente novamente.'
    } finally {
      isSearching.value = false
    }
  }, 300)
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
  <div class="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-4 py-16">
    <template v-if="step === 'search'">
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
        class="flex flex-col gap-6 rounded-lg border border-border bg-surface-elevated p-8 shadow-md sm:p-10"
      >
        <div class="flex flex-col items-center gap-3 text-center">
          <span class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="lucide:mail-check" class="h-5 w-5" />
          </span>
          <div>
            <h1 class="font-display text-2xl font-semibold text-heading">Confirmação de Presença</h1>
            <p class="mt-1 text-sm text-text-muted">Digite seu nome para localizar seu convite.</p>
          </div>
        </div>

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
        <p v-else-if="query.trim().length >= 3 && !isSearching" class="text-center text-sm text-text-muted">
          Nenhum convidado encontrado com esse nome.
        </p>
      </div>
    </template>

    <template v-else-if="step === 'light-confirm'">
      <div
        v-motion
        :initial="{ opacity: 0, y: 16 }"
        :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }"
        class="flex flex-col items-center gap-4 rounded-lg border border-border bg-surface-elevated p-8 text-center shadow-md sm:p-10"
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
        <RsvpInviteFlow :payload="invitePayload" />
      </div>
    </template>
  </div>
</template>
