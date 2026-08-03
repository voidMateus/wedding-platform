<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const guestId = computed(() => route.params.id as string)

const { getGuest } = useGuests()
const { data: guest, status } = getGuest(guestId)

async function handleDone() {
  await navigateTo('/admin/convidados')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-text">Editar convidado</h1>
    </div>

    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton class="h-64 w-full" />
    </div>

    <AdminGuestsGuestPartyWizard v-else-if="guest" :initial-guest="guest" @done="handleDone" />
  </div>
</template>
