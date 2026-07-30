<script setup lang="ts">
const { signOut } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-surface-muted">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <span class="text-sm font-medium text-text">Wedding Platform — Painel</span>
      <UiButton variant="ghost" size="sm" @click="signOut">Sair</UiButton>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
