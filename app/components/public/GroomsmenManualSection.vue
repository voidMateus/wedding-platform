<script setup lang="ts">
import { GROOMSMEN_MANUAL_CONTENT } from '#shared/wedding-content'
</script>

<template>
  <PublicEditorialSection id="manual-padrinhos" title="Manual dos Padrinhos">
    <div class="mx-auto flex max-w-3xl flex-col gap-8">
      <p class="text-center leading-relaxed text-body">{{ GROOMSMEN_MANUAL_CONTENT.intro }}</p>
      <PublicTopicGrid :topics="GROOMSMEN_MANUAL_CONTENT.topics" />
    </div>
  </PublicEditorialSection>
</template>
