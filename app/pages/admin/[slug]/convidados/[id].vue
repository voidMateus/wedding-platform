<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const guestId = computed(() => route.params.id as string)
const activeSlug = useActiveWeddingSlug()

const { getGuest } = useGuests()
const { data: guest, status } = getGuest(guestId)

async function handleDone() {
  await navigateTo(`/admin/${activeSlug}/convidados`)
}
</script>

<template>
  <AdminSection title="Editar convidado">
    <div v-if="status === 'pending'" class="flex flex-col gap-2">
      <UiSkeleton class="h-64 w-full" />
    </div>

    <AdminGuestsGuestPartyWizard v-else-if="guest" :initial-guest="guest" @done="handleDone" />
  </AdminSection>
</template>
