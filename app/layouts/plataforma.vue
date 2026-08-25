<script setup lang="ts">
// Contexto próprio (docs/PLANO-SAAS.md, Passo 8) -- nunca reaproveita
// layouts/admin.vue: aquele layout chama getWedding() incondicionalmente no
// <script setup>, o que não faz sentido sem um casamento ativo (CLAUDE.md,
// seção 7 -- "nenhuma página alterna visual admin/público via v-if dentro do
// mesmo layout"; um contexto novo ganha layout próprio, não um `if` a mais
// num existente).
const { signOut } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-surface-muted">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <span class="text-sm font-medium text-text">Painel da Plataforma</span>
      <UiButton variant="ghost" size="sm" @click="signOut">Sair</UiButton>
    </header>
    <main class="p-6">
      <slot />
    </main>
  </div>
</template>
