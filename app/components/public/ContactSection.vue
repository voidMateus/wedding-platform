<script setup lang="ts">
import { CONTACT_CONTENT } from '#shared/wedding-content'
</script>

<template>
  <PublicEditorialSection id="contato" title="Contato">
    <div class="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <p class="leading-relaxed text-body">{{ CONTACT_CONTENT.intro }}</p>
      <a
        :href="`mailto:${CONTACT_CONTENT.email}`"
        class="inline-flex min-h-11 items-center gap-2 px-2 font-medium text-primary underline-offset-2 hover:underline"
      >
        <Icon name="lucide:mail" class="h-4 w-4" />
        {{ CONTACT_CONTENT.email }}
      </a>
      <p class="text-sm text-text-muted">{{ CONTACT_CONTENT.note }}</p>
    </div>
  </PublicEditorialSection>
</template>
