<!--
  Configurações virou um módulo com menu de seção próprio, como Convidados.

  As quatro abas que ficavam no topo (Geral, Aparência, Conteúdo,
  Colaboradores) são os GRUPOS do menu lateral, e as seções que eram âncoras
  numa coluna dentro da página são os ITENS desses grupos. Cronograma e Galeria
  entraram no mesmo módulo: as duas são o casal preparando o que o convidado
  vai ver, não operação do dia a dia.

  A aba deixou de ser escolhida — é derivada de `?secao=<id>`. Com a seção na
  URL, o menu lateral sabe qual item acender, o link é salvável e o botão
  Voltar funciona; como estado de componente, nada disso valia. A lista de
  assuntos vive em `app/utils/admin-nav.ts`, porque agora é navegação: o menu
  monta a coluna a partir dela e esta página lê a MESMA lista para saber qual
  conteúdo desenhar.
-->
<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()

const secaoAtual = computed(() => {
  const valor = route.query[QUERY_SECAO_CONFIGURACOES]
  return typeof valor === 'string' ? valor : null
})

const assunto = computed(() => assuntoDaSecao(secaoAtual.value))

const { getWedding } = useWedding()
// Aguardado (não apenas destructuring de useFetch): sem isso, o formulário de
// Aparência é populado por um watcher assíncrono que roda DEPOIS do walk de
// renderização do SSR, produzindo HTML de servidor com os presets/fontes
// ainda não destacados. Vue não corrige esse tipo de mismatch de hidratação
// em produção (só avisa em dev) — o destaque ficava "preso" incorretamente
// até uma interação forçar um novo render.
const { data: wedding, status, refresh } = await getWedding()

/** Rola até o cartão da seção — o `scroll-mt` do SectionCard dá a folga do topo. */
function rolarAteSecao(secao: string | null) {
  if (!secao) return
  nextTick(() => {
    document.getElementById(secao)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

onMounted(() => {
  // `/configuracoes` sem seção mostraria o conteúdo de Geral com nenhum item
  // aceso no menu. `replace`, não `push`: normalizar o endereço não é um passo
  // que o Voltar deva desfazer.
  if (!secaoAtual.value) {
    router.replace({
      query: {
        ...route.query,
        [QUERY_SECAO_CONFIGURACOES]: SETTINGS_ASSUNTOS[0].secoes[0].id,
      },
    })
    return
  }
  rolarAteSecao(secaoAtual.value)
})

watch(secaoAtual, (secao) => rolarAteSecao(secao))
</script>

<template>
  <AdminSection title="Configurações" :description="assunto.blurb">
    <div v-if="status === 'pending'" class="flex flex-col gap-5">
      <UiSkeleton class="h-14 w-full" />
      <UiSkeleton class="h-64 w-full" />
    </div>

    <template v-else>
      <AdminSettingsGeneralTab v-if="assunto.id === 'geral'" :wedding="wedding" @saved="refresh" />
      <AdminSettingsAppearanceTab
        v-else-if="assunto.id === 'aparencia'"
        :wedding="wedding"
        :couple-names="wedding?.nomes_noivos ?? ''"
        @refresh="refresh"
      />
      <AdminSettingsContentTab
        v-else-if="assunto.id === 'conteudo'"
        :wedding="wedding"
        @saved="refresh"
      />
      <AdminSettingsMembersTab v-else-if="assunto.id === 'colaboradores'" />
    </template>
  </AdminSection>
</template>
