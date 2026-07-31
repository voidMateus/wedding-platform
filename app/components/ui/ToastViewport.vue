<script setup lang="ts">
const uiStore = useUiStore()
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
  >
    <div v-for="toast in uiStore.toasts" :key="toast.id" class="pointer-events-auto w-full max-w-sm">
      <UiToast :tone="toast.tone" :message="toast.message" @dismiss="uiStore.dismissToast(toast.id)" />
    </div>
  </div>
</template>
