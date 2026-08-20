<script setup lang="ts">
import type { PhotoWithUrl } from '~/types/photo'

// Galeria via Google Drive (CLAUDE.md, Fase Galeria via Google Drive): as
// fotos são espelhadas de uma pasta do Drive (não mais upload manual). Este
// componente orquestra a conexão (OAuth ou link público), a sincronização e
// a edição do metadado nosso (legenda/ordem/ponto de foco, preservado entre
// syncs) — a apresentação de cada parte vive em componentes próprios
// (AdminGalleryConnectionCard/ConnectForms/PhotoGrid/EditPhotoModal).
const { getConnection, connectGoogle, connectPublicLink, syncNow, disconnect } =
  useGalleryConnection()
const { connectAndPickFolder } = useGoogleDrivePicker()
const { listPhotos, reorderPhotos } = useWeddingPhotos()
const toast = useToast()

const { data: connectionData, refresh: refreshConnection } = getConnection()
const { data: photosData, status: photosStatus, refresh: refreshPhotos } = listPhotos()

const connection = computed(() => connectionData.value?.connection ?? null)
const photos = computed(() => photosData.value?.data ?? [])
const showConnectForms = ref(false)

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

// --- Reordenação ---
async function handleReorder(orderedIds: string[]) {
  try {
    await reorderPhotos(orderedIds)
    await refreshPhotos()
  } catch {
    toast.error('Não foi possível salvar a nova ordem.')
    await refreshPhotos() // reverte para o estado do servidor
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

// --- Edição de metadados ---
const isEditModalOpen = ref(false)
const editingPhoto = ref<PhotoWithUrl | null>(null)

function openEditModal(photo: PhotoWithUrl) {
  editingPhoto.value = photo
  isEditModalOpen.value = true
}
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

    <AdminGalleryConnectionCard
      v-if="connection"
      :connection="connection"
      :is-connecting-google="isConnectingGoogle"
      @reconnect="connectGoogleDrive"
      @request-disconnect="isDisconnectModalOpen = true"
    />

    <AdminGalleryConnectForms
      v-if="!connection || showConnectForms"
      v-model:public-link-url="publicLinkUrl"
      :is-connecting-google="isConnectingGoogle"
      :is-connecting-link="isConnectingLink"
      @connect-google="connectGoogleDrive"
      @connect-link="connectLink"
    />

    <div v-if="connection">
      <AdminGalleryPreviewSetting />

      <AdminGalleryPhotoGrid
        :photos="photos"
        :status="photosStatus"
        :is-syncing="isSyncing"
        @reorder="handleReorder"
        @edit="openEditModal"
        @sync="handleSync"
      />
    </div>

    <AdminGalleryEditPhotoModal
      v-model="isEditModalOpen"
      :photo="editingPhoto"
      @saved="refreshPhotos"
    />

    <UiModal v-model="isDisconnectModalOpen" title="Desconectar fonte da galeria">
      <p class="text-sm text-text">
        Isso remove as fotos espelhadas da galeria do site. Os arquivos originais no Google Drive
        não são afetados. Você pode reconectar quando quiser.
      </p>
      <template #footer>
        <UiButton
          variant="ghost"
          :disabled="isDisconnecting"
          @click="isDisconnectModalOpen = false"
        >
          Cancelar
        </UiButton>
        <UiButton variant="destructive" :disabled="isDisconnecting" @click="confirmDisconnect">
          Desconectar
        </UiButton>
      </template>
    </UiModal>
  </AdminSection>
</template>
