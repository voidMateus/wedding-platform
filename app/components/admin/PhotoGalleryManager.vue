<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { photoMetadataSchema } from '#shared/schemas/photos'
import type { PhotoWithUrl } from '~/types/photo'

// Galeria via Google Drive (CLAUDE.md, Fase Galeria via Google Drive): as
// fotos são espelhadas de uma pasta do Drive (não mais upload manual). Este
// componente gerencia a conexão (OAuth ou link público), a sincronização e a
// edição do metadado nosso (legenda/ordem/ponto de foco), preservado entre
// syncs.
const { getConnection, connectGoogle, connectPublicLink, syncNow, disconnect } = useGalleryConnection()
const { connectAndPickFolder } = useGoogleDrivePicker()
const { listPhotos, updatePhoto, reorderPhotos } = useWeddingPhotos()
const toast = useToast()

const { data: connectionData, refresh: refreshConnection } = getConnection()
const { data: photosData, status: photosStatus, refresh: refreshPhotos } = listPhotos()

const connection = computed(() => connectionData.value?.connection ?? null)
const photos = computed(() => photosData.value?.data ?? [])
const showConnectForms = ref(false)

// --- Reordenação por drag-and-drop ---
// Cópia local mutável da lista (a grade arrasta contra ela); ressincroniza
// sempre que o fetch atualiza (após refresh/sync).
const localPhotos = ref<PhotoWithUrl[]>([])
watch(photos, (value) => (localPhotos.value = [...value]), { immediate: true })

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)
const isReordering = ref(false)

function onDragStart(index: number) {
  dragIndex.value = index
}
function onDragOver(index: number) {
  if (dragIndex.value !== null) overIndex.value = index
}
function onDragEnd() {
  dragIndex.value = null
  overIndex.value = null
}
async function onDrop(targetIndex: number) {
  const from = dragIndex.value
  onDragEnd()
  if (from === null || from === targetIndex) return

  const list = [...localPhotos.value]
  const [moved] = list.splice(from, 1)
  if (!moved) return
  list.splice(targetIndex, 0, moved)
  localPhotos.value = list // otimista

  isReordering.value = true
  try {
    await reorderPhotos(list.map((photo) => photo.id))
    await refreshPhotos()
  } catch {
    toast.error('Não foi possível salvar a nova ordem.')
    await refreshPhotos() // reverte para o estado do servidor
  } finally {
    isReordering.value = false
  }
}

const modeLabel = computed(() =>
  connection.value?.mode === 'oauth' ? 'Conta Google (pasta privada)' : 'Link de pasta pública',
)
const lastSyncedLabel = computed(() => {
  const value = connection.value?.last_synced_at
  return value ? new Date(value).toLocaleString('pt-BR') : 'ainda não sincronizado'
})

async function refreshAll() {
  await Promise.all([refreshConnection(), refreshPhotos()])
}

function messageFromError(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'data' in err) {
    const data = (err as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return err instanceof Error ? err.message : fallback
}

// --- Conexão ---
const isConnectingGoogle = ref(false)
const publicLinkUrl = ref('')
const isConnectingLink = ref(false)
const isSyncing = ref(false)

async function connectGoogleDrive() {
  isConnectingGoogle.value = true
  try {
    const picked = await connectAndPickFolder()
    if (!picked) return
    await connectGoogle(picked)
    showConnectForms.value = false
    await refreshAll()
    toast.success('Google Drive conectado e galeria sincronizada.')
  } catch (err) {
    toast.error(messageFromError(err, 'Não foi possível conectar ao Google Drive.'))
  } finally {
    isConnectingGoogle.value = false
  }
}

async function connectLink() {
  if (!publicLinkUrl.value.trim()) return
  isConnectingLink.value = true
  try {
    await connectPublicLink(publicLinkUrl.value.trim())
    publicLinkUrl.value = ''
    showConnectForms.value = false
    await refreshAll()
    toast.success('Pasta pública conectada e galeria sincronizada.')
  } catch (err) {
    toast.error(messageFromError(err, 'Não foi possível conectar a pasta.'))
  } finally {
    isConnectingLink.value = false
  }
}

async function handleSync() {
  isSyncing.value = true
  try {
    const { sync } = await syncNow()
    await refreshAll()
    if (sync.ok) {
      toast.success(`Galeria sincronizada — ${sync.photoCount ?? 0} foto(s).`)
    } else if (sync.reauthRequired) {
      toast.warning('O acesso ao Google expirou. Reconecte a conta.')
    } else {
      toast.error(sync.reason || 'Falha ao sincronizar.')
    }
  } catch (err) {
    toast.error(messageFromError(err, 'Falha ao sincronizar.'))
  } finally {
    isSyncing.value = false
  }
}

// --- Desconexão ---
const isDisconnectModalOpen = ref(false)
const isDisconnecting = ref(false)

async function confirmDisconnect() {
  isDisconnecting.value = true
  try {
    await disconnect()
    isDisconnectModalOpen.value = false
    await refreshAll()
    toast.success('Fonte desconectada. As fotos foram removidas da galeria.')
  } catch (err) {
    toast.error(messageFromError(err, 'Não foi possível desconectar.'))
  } finally {
    isDisconnecting.value = false
  }
}

// --- Edição de metadados (legenda/ordem/ponto de foco) ---
const isEditModalOpen = ref(false)
const editingPhoto = ref<PhotoWithUrl | null>(null)
const editErrorMessage = ref<string | null>(null)

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(photoMetadataSchema),
  initialValues: { caption: '', displayOrder: 0, focalX: 50, focalY: 50 },
})

const [caption] = defineField('caption')
const [displayOrder] = defineField('displayOrder')
const [focalX] = defineField('focalX')
const [focalY] = defineField('focalY')

const displayOrderText = computed({
  get: () => (displayOrder.value === undefined ? '' : String(displayOrder.value)),
  set: (value: string) => {
    displayOrder.value = value === '' ? undefined : Number(value)
  },
})

const focalPoint = computed({
  get: () => ({ x: focalX.value ?? 50, y: focalY.value ?? 50 }),
  set: (value: { x: number; y: number }) => {
    focalX.value = value.x
    focalY.value = value.y
  },
})

function focalStyle(photo: PhotoWithUrl) {
  return { objectPosition: `${photo.focal_x}% ${photo.focal_y}%` }
}

function openEditModal(photo: PhotoWithUrl) {
  editingPhoto.value = photo
  editErrorMessage.value = null
  resetForm({
    values: {
      caption: photo.caption ?? '',
      displayOrder: photo.display_order,
      focalX: photo.focal_x,
      focalY: photo.focal_y,
    },
  })
  isEditModalOpen.value = true
}

const onEditSubmit = handleSubmit(async (values) => {
  if (!editingPhoto.value) return
  editErrorMessage.value = null
  try {
    await updatePhoto(editingPhoto.value.id, values)
    isEditModalOpen.value = false
    await refreshPhotos()
    toast.success('Foto atualizada.')
  } catch {
    editErrorMessage.value = 'Não foi possível salvar as alterações.'
  }
})
</script>

<template>
  <AdminSection
    title="Galeria"
    description="As fotos são espelhadas de uma pasta do Google Drive — atualize na pasta e sincronize aqui."
  >
    <template v-if="connection" #actions>
      <UiButton variant="ghost" :disabled="isSyncing" @click="showConnectForms = !showConnectForms">
        Trocar fonte
      </UiButton>
      <UiButton :disabled="isSyncing" @click="handleSync">
        {{ isSyncing ? 'Sincronizando...' : 'Sincronizar agora' }}
      </UiButton>
    </template>

    <!-- Status da conexão -->
    <UiCard v-if="connection" class="mb-6 flex flex-col gap-3">
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
        <UiButton size="sm" :disabled="isConnectingGoogle" @click="connectGoogleDrive">
          {{ isConnectingGoogle ? 'Reconectando...' : 'Reconectar Google Drive' }}
        </UiButton>
      </div>

      <div class="flex justify-end">
        <UiButton size="sm" variant="ghost" @click="isDisconnectModalOpen = true">Desconectar</UiButton>
      </div>
    </UiCard>

    <!-- Escolha da fonte (sem conexão, ou ao trocar de fonte) -->
    <div v-if="!connection || showConnectForms" class="mb-6 grid gap-4 md:grid-cols-2">
      <UiCard class="flex flex-col gap-3">
        <div>
          <p class="font-medium text-text">Conectar Google Drive</p>
          <p class="text-sm text-text-muted">
            Conecte sua conta Google e escolha a pasta das fotos. Funciona com pastas privadas.
          </p>
        </div>
        <UiButton :disabled="isConnectingGoogle" @click="connectGoogleDrive">
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
          v-model="publicLinkUrl"
          placeholder="https://drive.google.com/drive/folders/..."
          label="Link da pasta"
        />
        <UiButton variant="outline" :disabled="isConnectingLink" @click="connectLink">
          {{ isConnectingLink ? 'Conectando...' : 'Conectar pasta pública' }}
        </UiButton>
      </UiCard>
    </div>

    <!-- Grade de fotos -->
    <div v-if="connection">
      <AdminGalleryPreviewSetting />

      <div
        v-if="photosStatus === 'pending'"
        class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8"
      >
        <UiSkeleton v-for="n in 8" :key="n" class="aspect-square w-full rounded-lg" />
      </div>

      <UiEmptyState
        v-else-if="!photos.length"
        icon="lucide:image"
        title="Nenhuma foto sincronizada ainda"
        description="Adicione fotos à pasta do Google Drive e clique em Sincronizar agora."
      >
        <UiButton :disabled="isSyncing" @click="handleSync">Sincronizar agora</UiButton>
      </UiEmptyState>

      <div v-else>
        <p class="mb-3 text-xs text-text-muted">
          Arraste as fotos para reordenar. Passe o mouse sobre uma foto para editar.
        </p>
        <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          <div
            v-for="(photo, index) in localPhotos"
            :key="photo.id"
            draggable="true"
            :title="photo.caption || undefined"
            class="group relative cursor-move overflow-hidden rounded-lg border border-border transition-brand"
            :class="{
              'opacity-40': dragIndex === index,
              'ring-2 ring-primary': overIndex === index && dragIndex !== index,
            }"
            @dragstart="onDragStart(index)"
            @dragover.prevent="onDragOver(index)"
            @drop="onDrop(index)"
            @dragend="onDragEnd"
          >
            <img
              :src="photo.url"
              :alt="photo.caption || 'Foto da galeria'"
              class="aspect-square w-full object-cover"
              :style="focalStyle(photo)"
              loading="lazy"
              draggable="false"
            />
            <span
              class="pointer-events-none absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-xs font-medium leading-none text-white"
            >
              {{ photo.display_order }}
            </span>
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition-brand group-hover:pointer-events-auto group-hover:opacity-100"
            >
              <UiButton size="sm" variant="secondary" @click="openEditModal(photo)">Editar</UiButton>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UiModal v-model="isEditModalOpen" title="Editar foto">
      <form class="flex flex-col gap-4" @submit="onEditSubmit">
        <AdminImageFocalPointPicker
          v-if="editingPhoto"
          v-model="focalPoint"
          :src="editingPhoto.url"
          :alt="editingPhoto.caption || 'Foto da galeria'"
          preview-aspect-class="aspect-square"
        />
        <UiInput v-model="caption" label="Legenda (opcional)" :error="errors.caption" />
        <UiInput
          v-model="displayOrderText"
          type="number"
          label="Ordem de exibição"
          :error="errors.displayOrder"
        />
        <p v-if="editErrorMessage" class="text-sm text-red-600" role="alert">{{ editErrorMessage }}</p>
        <div class="mt-2 flex justify-end gap-2">
          <UiButton type="button" variant="ghost" @click="isEditModalOpen = false">Cancelar</UiButton>
          <UiButton type="submit" :disabled="isSubmitting">Salvar</UiButton>
        </div>
      </form>
    </UiModal>

    <UiModal v-model="isDisconnectModalOpen" title="Desconectar fonte da galeria">
      <p class="text-sm text-text">
        Isso remove as fotos espelhadas da galeria do site. Os arquivos originais no Google Drive
        não são afetados. Você pode reconectar quando quiser.
      </p>
      <template #footer>
        <UiButton variant="ghost" :disabled="isDisconnecting" @click="isDisconnectModalOpen = false">
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDisconnecting" @click="confirmDisconnect">
          Desconectar
        </UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
