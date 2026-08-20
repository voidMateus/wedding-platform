<script setup lang="ts">
import type { GallerySourceConnection } from '~/types/gallery'

interface Props {
  connection: GallerySourceConnection
  isConnectingGoogle: boolean
}

const { connection, isConnectingGoogle } = defineProps<Props>()

defineEmits<{
  reconnect: []
  'request-disconnect': []
}>()

const modeLabel = computed(() =>
  connection.mode === 'oauth' ? 'Conta Google (pasta privada)' : 'Link de pasta pública',
)
const lastSyncedLabel = computed(() => {
  const value = connection.last_synced_at
  return value ? new Date(value).toLocaleString('pt-BR') : 'ainda não sincronizado'
})
</script>

<template>
  <UiCard class="mb-6 flex flex-col gap-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-text">{{ modeLabel }}</p>
        <p class="text-sm text-text-muted">
          Pasta: {{ connection.folder_name || connection.folder_id }}
        </p>
      </div>
      <span
        class="rounded-full px-3 py-1 text-xs font-medium"
        :class="{
          'bg-green-100 text-green-800': connection.status === 'active',
          'bg-amber-100 text-amber-800': connection.status === 'reauth_required',
          'bg-red-100 text-red-800': connection.status === 'error',
        }"
      >
        {{
          connection.status === 'active'
            ? 'Conectado'
            : connection.status === 'reauth_required'
              ? 'Reconexão necessária'
              : 'Erro na sincronização'
        }}
      </span>
    </div>

    <p class="text-xs text-text-muted">
      Última sincronização: {{ lastSyncedLabel }}
      <template v-if="connection.last_sync_photo_count !== null">
        · {{ connection.last_sync_photo_count }} foto(s)
      </template>
    </p>

    <p v-if="connection.last_sync_error" class="text-xs text-red-600" role="alert">
      {{ connection.last_sync_error }}
    </p>

    <div v-if="connection.status === 'reauth_required'" class="flex flex-wrap gap-2">
      <UiButton size="sm" :disabled="isConnectingGoogle" @click="$emit('reconnect')">
        {{ isConnectingGoogle ? 'Reconectando...' : 'Reconectar Google Drive' }}
      </UiButton>
    </div>

    <div class="flex justify-end">
      <UiButton size="sm" variant="ghost" @click="$emit('request-disconnect')"
        >Desconectar</UiButton
      >
    </div>
  </UiCard>
</template>
