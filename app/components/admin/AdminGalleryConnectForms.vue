<script setup lang="ts">
interface Props {
  isConnectingGoogle: boolean
  isConnectingLink: boolean
  publicLinkUrl: string
}

defineProps<Props>()

defineEmits<{
  'update:publicLinkUrl': [value: string]
  'connect-google': []
  'connect-link': []
}>()
</script>

<template>
  <div class="mb-6 grid gap-4 md:grid-cols-2">
    <UiCard class="flex flex-col gap-3">
      <div>
        <p class="font-medium text-text">Conectar Google Drive</p>
        <p class="text-sm text-text-muted">
          Conecte sua conta Google e escolha a pasta das fotos. Funciona com pastas privadas.
        </p>
      </div>
      <UiButton :disabled="isConnectingGoogle" @click="$emit('connect-google')">
        {{ isConnectingGoogle ? 'Conectando...' : 'Conectar Google Drive' }}
      </UiButton>
    </UiCard>

    <UiCard class="flex flex-col gap-3">
      <div>
        <p class="font-medium text-text">Usar link de pasta pública</p>
        <p class="text-sm text-text-muted">
          Cole o link de uma pasta compartilhada como "qualquer pessoa com o link pode ver".
        </p>
      </div>
      <UiInput
        :model-value="publicLinkUrl"
        placeholder="https://drive.google.com/drive/folders/..."
        label="Link da pasta"
        @update:model-value="$emit('update:publicLinkUrl', $event)"
      />
      <UiButton variant="outline" :disabled="isConnectingLink" @click="$emit('connect-link')">
        {{ isConnectingLink ? 'Conectando...' : 'Conectar pasta pública' }}
      </UiButton>
    </UiCard>
  </div>
</template>
