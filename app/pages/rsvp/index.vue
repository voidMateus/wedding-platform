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
  <div class="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
    <template v-if="step === 'search'">
      <div>
        <h1 class="text-xl font-semibold text-text">Confirmação de Presença</h1>
        <p class="mt-2 text-sm text-text-muted">Digite seu nome para localizar seu convite.</p>
      </div>

      <UiInput v-model="query" placeholder="Digite seu nome" autofocus />

      <p v-if="searchError" class="text-sm text-red-600" role="alert">{{ searchError }}</p>

      <ul v-if="results.length" class="flex flex-col gap-2">
        <li v-for="result in results" :key="result.guestId">
          <button
            type="button"
            class="w-full rounded-md border border-border px-4 py-3 text-left text-sm text-text hover:bg-surface-muted"
            @click="handleSelectResult(result)"
          >
            {{ result.fullName }}
          </button>
        </li>
      </ul>
      <p v-else-if="query.trim().length >= 3 && !isSearching" class="text-sm text-text-muted">
        Nenhum convidado encontrado com esse nome.
      </p>
    </template>

    <template v-else-if="step === 'light-confirm'">
      <div class="flex flex-col items-center gap-4 text-center">
        <p class="text-xl font-semibold text-text">Encontramos você! 🎉</p>
        <p v-if="maskedNames.length" class="text-sm text-text-muted">
          Seu convite também inclui: {{ maskedNames.join(', ') }}
        </p>
        <div class="flex gap-2">
          <UiButton @click="handleConfirmIdentity">Sim, sou eu</UiButton>
          <UiButton variant="ghost" @click="backToSearch">Não, buscar de novo</UiButton>
        </div>
      </div>
    </template>

    <template v-else-if="step === 'invite' && invitePayload">
      <div>
        <p class="text-sm uppercase tracking-widest text-text-muted">
          {{ invitePayload.wedding.coupleNames }}
        </p>
        <h1 class="mt-1 text-xl font-semibold text-text">Confirmação de Presença</h1>
      </div>
      <RsvpInviteFlow :payload="invitePayload" />
    </template>
  </div>
</template>
