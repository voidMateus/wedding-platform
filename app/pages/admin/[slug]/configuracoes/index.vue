<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const settingsTabs = [
  { id: 'geral', label: 'Geral' },
  { id: 'aparencia', label: 'Aparência' },
  { id: 'conteudo', label: 'Conteúdo' },
  { id: 'colaboradores', label: 'Colaboradores' },
]
const activeTab = ref('geral')

const { getWedding } = useWedding()
// Aguardado (não apenas destructuring de useFetch): sem isso, o formulário de
// Aparência é populado por um watcher assíncrono que roda DEPOIS do walk de
// renderização do SSR, produzindo HTML de servidor com os presets/fontes
// ainda não destacados. Vue não corrige esse tipo de mismatch de hidratação
// em produção (só avisa em dev) — o destaque ficava "preso" incorretamente
// até uma interação forçar um novo render. Aguardar aqui garante que
// wedding.value já está resolvido antes do primeiro render, em SSR e client.
const { data: wedding, status, refresh } = await getWedding()
</script>

<template>
  <AdminSection title="Configurações" meta="Dados do evento, aparência e acesso">
    <div v-if="status === 'pending'" class="mx-auto flex w-full max-w-2xl flex-col gap-2">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
    </div>

    <UiTabs
      v-else
      v-model="activeTab"
      variant="chips"
      :tabs="settingsTabs"
      class="mx-auto w-full max-w-2xl"
    >
      <template #geral>
        <AdminSettingsGeneralTab :wedding="wedding" />
      </template>

      <template #aparencia>
        <AdminSettingsAppearanceTab
          :wedding="wedding"
          :couple-names="wedding?.nomes_noivos ?? ''"
          @refresh="refresh"
        />
      </template>

      <template #conteudo>
        <AdminSettingsContentTab :wedding="wedding" @saved="refresh" />
      </template>

      <template #colaboradores>
        <AdminSettingsMembersTab />
      </template>
    </UiTabs>
  </AdminSection>
</template>
