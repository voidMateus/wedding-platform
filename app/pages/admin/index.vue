<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold text-text">Dashboard</h1>
    <p class="mt-2 text-sm text-text-muted">
      Logado como {{ authStore.user?.email }} — wedding
      {{ authStore.weddingContext?.weddingId ?? 'nenhum vinculado' }}
    </p>
  </div>
</template>
