<script setup lang="ts">
// Página provisória de verificação do scaffold — será substituída pela
// home pública real na Fase C (ver CLAUDE.md, seções 1 e 32).
</script>

<template>
  <main class="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
    <div>
      <h1 class="text-2xl font-semibold text-text">Wedding Platform</h1>
      <p class="mt-1 text-sm text-text-muted">
        Fundação técnica em configuração — Fase B (ver CLAUDE.md e docs/ARCHITECTURE.md).
      </p>
    </div>

    <section class="flex flex-col gap-4 rounded-lg border border-border p-4">
      <h2 class="text-sm font-medium text-text-muted">Verificação do Design System base</h2>
      <div class="flex flex-wrap items-center gap-3">
        <UiButton variant="primary">Primário</UiButton>
        <UiButton variant="secondary">Secundário</UiButton>
        <UiButton variant="ghost">Ghost</UiButton>
        <UiButton variant="destructive">Destrutivo</UiButton>
      </div>
      <UiInput label="Campo de exemplo" placeholder="Texto de exemplo" />
      <div class="flex gap-2">
        <UiBadge tone="neutral">Neutro</UiBadge>
        <UiBadge tone="success">Sucesso</UiBadge>
        <UiBadge tone="warning">Atenção</UiBadge>
        <UiBadge tone="danger">Erro</UiBadge>
      </div>
    </section>
  </main>
</template>
