<script setup lang="ts">
definePageMeta({ layout: 'admin' })

async function handleDone() {
  await navigateTo('/admin/convidados')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold text-text">Novo convidado</h1>
      <p class="mt-1 text-sm text-text-muted">
        Cadastre o convidado e, se houver, os acompanhantes — tudo em um único fluxo.
      </p>
    </div>
    <AdminGuestsGuestPartyWizard @done="handleDone" />
  </div>
</template>
