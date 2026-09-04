<script setup lang="ts">
definePageMeta({ layout: 'admin' })

/**
 * Metadado de navegação das abas. `sections` casa 1:1 com o `sectionId` dos
 * AdminSettingsSectionCard de cada aba — é o contrato do sub-menu lateral;
 * renomear um id aqui sem renomear no cartão deixa a âncora sem destino.
 */
const SETTINGS_TABS = {
  geral: {
    label: 'Geral',
    blurb: 'Dados do evento, RSVP e pagamentos.',
    sections: [
      { id: 'evento', label: 'O evento' },
      { id: 'rsvp', label: 'RSVP e convidados' },
      { id: 'faixas-etarias', label: 'Classificação etária' },
      { id: 'pagamentos', label: 'Presentes e pagamentos' },
    ],
  },
  aparencia: {
    label: 'Aparência',
    blurb: 'Fotos, tema e recursos do site.',
    sections: [
      { id: 'branding', label: 'Branding' },
      { id: 'tema', label: 'Opções de tema' },
      { id: 'avancado', label: 'Opções avançadas' },
      { id: 'experiencia', label: 'Experiência' },
    ],
  },
  conteudo: {
    label: 'Conteúdo',
    blurb: 'Textos exibidos aos convidados.',
    sections: [{ id: 'mensagens', label: 'Mensagens do site' }],
  },
  colaboradores: {
    label: 'Colaboradores',
    blurb: 'Quem pode editar este evento.',
    sections: [
      { id: 'convidar', label: 'Convidar colaborador' },
      { id: 'acessos', label: 'Quem tem acesso' },
    ],
  },
}

type SettingsTabId = keyof typeof SETTINGS_TABS

const tabItems = Object.entries(SETTINGS_TABS).map(([id, tab]) => ({ id, label: tab.label }))

const activeTab = ref<string>('geral')

// UiTabs emite string (contrato do Reka), não a união literal — o narrowing
// mantém o acesso indexado seguro sob noUncheckedIndexedAccess, sem cast.
function isSettingsTabId(value: string): value is SettingsTabId {
  return value in SETTINGS_TABS
}

const currentNav = computed(() => {
  const tab = isSettingsTabId(activeTab.value)
    ? SETTINGS_TABS[activeTab.value]
    : SETTINGS_TABS.geral
  return { label: tab.label, blurb: tab.blurb, sections: tab.sections }
})

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
  <AdminSection
    title="Configurações"
    description="Dados do evento, aparência e acesso — organizados por assunto."
  >
    <div v-if="status === 'pending'" class="flex flex-col gap-5">
      <UiSkeleton class="h-14 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <UiTabs v-else v-model="activeTab" variant="segmented" :tabs="tabItems">
      <template #geral>
        <AdminSettingsTabLayout v-bind="currentNav">
          <AdminSettingsGeneralTab :wedding="wedding" @saved="refresh" />
        </AdminSettingsTabLayout>
      </template>

      <template #aparencia>
        <AdminSettingsTabLayout v-bind="currentNav">
          <AdminSettingsAppearanceTab
            :wedding="wedding"
            :couple-names="wedding?.nomes_noivos ?? ''"
            @refresh="refresh"
          />
        </AdminSettingsTabLayout>
      </template>

      <template #conteudo>
        <AdminSettingsTabLayout v-bind="currentNav">
          <AdminSettingsContentTab :wedding="wedding" @saved="refresh" />
        </AdminSettingsTabLayout>
      </template>

      <template #colaboradores>
        <AdminSettingsTabLayout v-bind="currentNav">
          <AdminSettingsMembersTab />
        </AdminSettingsTabLayout>
      </template>
    </UiTabs>
  </AdminSection>
</template>
