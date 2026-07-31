<script setup lang="ts">
import { GUEST_MANUAL_CONTENT } from '#shared/wedding-content'
</script>

<template>
  <PublicEditorialSection id="manual-convidados" title="Manual dos Convidados" tone="muted">
    <div class="mx-auto flex max-w-3xl flex-col gap-8">
      <p class="text-center leading-relaxed text-body">{{ GUEST_MANUAL_CONTENT.intro }}</p>
      <PublicTopicGrid :topics="GUEST_MANUAL_CONTENT.topics" />
    </div>
  </PublicEditorialSection>
</template>
