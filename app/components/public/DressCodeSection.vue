<script setup lang="ts">
import { DRESS_CODE_CONTENT } from '#shared/wedding-content'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding
}

defineProps<Props>()
</script>

<template>
  <PublicEditorialSection id="dress-code" eyebrow="Como se vestir" title="Dress Code">
    <div class="mx-auto flex max-w-xl flex-col items-center gap-8 text-center">
      <PublicDressCodeIllustration />
      <p class="leading-relaxed text-body">{{ DRESS_CODE_CONTENT.description }}</p>

      <ul class="flex flex-col gap-2 self-start text-left text-body">
        <li
          v-for="tip in DRESS_CODE_CONTENT.suggestions"
          :key="tip"
          class="flex items-start gap-2"
        >
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" aria-hidden="true" />
          <span>{{ tip }}</span>
        </li>
      </ul>
    </div>
  </PublicEditorialSection>
</template>
