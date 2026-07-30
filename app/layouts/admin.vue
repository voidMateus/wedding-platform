<script setup lang="ts">
const { signOut } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-surface-muted">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
      <div class="flex items-center gap-6">
        <span class="text-sm font-medium text-text">Wedding Platform — Painel</span>
        <nav class="flex gap-4 text-sm text-text-muted">
          <NuxtLink to="/admin" class="hover:text-text">Dashboard</NuxtLink>
          <NuxtLink to="/admin/convidados" class="hover:text-text">Convidados</NuxtLink>
          <NuxtLink to="/admin/grupos" class="hover:text-text">Grupos</NuxtLink>
          <NuxtLink to="/admin/cronograma" class="hover:text-text">Cronograma</NuxtLink>
          <NuxtLink to="/admin/configuracoes" class="hover:text-text">Configurações</NuxtLink>
        </nav>
      </div>
      <UiButton variant="ghost" size="sm" @click="signOut">Sair</UiButton>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
