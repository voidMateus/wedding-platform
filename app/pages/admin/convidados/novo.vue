<script setup lang="ts">
definePageMeta({ layout: 'admin' })

async function handleDone() {
  await navigateTo('/admin/convidados')
}
</script>

<template>
  <AdminSection
    title="Novo convidado"
    description="Cadastre o convidado e, se houver, os acompanhantes — tudo em um único fluxo."
  >
    <AdminGuestsGuestPartyWizard @done="handleDone" />
  </AdminSection>
</template>
