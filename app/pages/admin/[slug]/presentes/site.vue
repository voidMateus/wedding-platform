<!--
  Como aparece no site — o outro lado da lista de presentes.

  As duas telas vizinhas olham para dentro: o que eu ofereci, o que já entrou.
  Esta olha para fora, e responde a pergunta que o casal faz antes de mandar o
  link para alguém: **o convidado está vendo o quê?**

  As respostas estavam espalhadas em três lugares que não se conversavam — o
  estado de publicação em Configurações, o texto de abertura em "Mensagens do
  site", as categorias num modal da lista — e nenhum deles dizia que os três
  juntos formam uma página só.

  **Esta tela não é dona de nenhum campo.** O texto vive em Configurações e o
  botão leva até lá; a publicação é a mesma de sempre; o que se edita aqui é o
  que só existe aqui (a ordem das categorias) e o que é atalho legítimo (tirar
  um presente da lista, que é a mesma coluna `esta_ativo` do formulário). É a
  regra do wizard de Primeiros passos, pela mesma razão: dois donos do mesmo
  campo divergem no primeiro ajuste.
-->
<script setup lang="ts">
import { resolveWeddingContent } from '#shared/wedding-content'
import { QUERY_SECAO_CONFIGURACOES } from '~/utils/admin-nav'
import type { ThemeConfig } from '#shared/schemas/theme'
import type { GiftInput } from '#shared/schemas/gifts'
import type { Gift } from '~/types/gift'

definePageMeta({ layout: 'admin' })

const slug = useActiveWeddingSlug()

const { getWedding } = useWedding()
const { data: wedding, status: statusDoCasamento } = getWedding()

const { listGifts } = useGifts()
const { data: giftsData, status: statusDosPresentes, refresh: refreshGifts } = listGifts()

const { listGiftCategories } = useGiftCategories()
const { data: categoriesData, refresh: refreshCategories } = listGiftCategories()

const carregando = computed(
  () => statusDoCasamento.value === 'pending' || statusDosPresentes.value === 'pending',
)

const publicado = computed(() => wedding.value?.status_ciclo_vida === 'publicado')

const tema = computed(() => wedding.value?.config_tema as unknown as ThemeConfig | null)

/**
 * A seção da home é opt-in (CLAUDE.md, seção 13): ausente ou vazia significa
 * nenhuma. Sem ela ligada, a página de presentes continua existindo e
 * respondendo — o que some é o caminho até ela a partir do site.
 */
const secaoNaHome = computed(() => (tema.value?.activeSections ?? []).includes('presentes'))

const textoDeAbertura = computed(
  () => resolveWeddingContent(wedding.value?.config_conteudo).giftsIntroMessage,
)

const presentes = computed<Gift[]>(() => giftsData.value?.data ?? [])
const forasDaLista = computed(() => presentes.value.filter((presente) => !presente.esta_ativo))
const naLista = computed(() => presentes.value.length - forasDaLista.value.length)

const enderecoPublico = computed(() => `/${slug}/presentes`)
const enderecoDasMensagens = computed(
  () => `/admin/${slug}/configuracoes?${QUERY_SECAO_CONFIGURACOES}=mensagens`,
)

const categorias = computed(() => categoriesData.value?.data ?? [])

const { updateGift } = useGifts()
const toast = useToast()
const devolvendo = ref<string | null>(null)

/**
 * Devolver um presente à lista daqui é o mesmo `esta_ativo` do formulário — e
 * o caminho inverso (tirar da lista) continua lá, junto do resto do cadastro.
 * Aqui só existe o que esta tela consegue responder sozinha: "por que este
 * item não está aparecendo?".
 */
async function devolverALista(presente: Gift) {
  devolvendo.value = presente.id
  try {
    // O PATCH recebe o presente inteiro, e `null` do banco vira ausência no
    // schema: mandar `null` num campo opcional é recusado pelo Zod, e mandar
    // o campo de fora apagaria o valor.
    await updateGift(presente.id, {
      titulo: presente.titulo,
      descricao: presente.descricao ?? '',
      categoriaId: presente.categoria_id ?? '',
      precoCentavos: presente.preco_centavos ?? undefined,
      quantidadeDisponivel: presente.quantidade_disponivel ?? undefined,
      urlImagem: presente.url_imagem ?? '',
      ePresenteCota: presente.e_presente_cota,
      valorMetaCentavos: presente.valor_meta_centavos ?? undefined,
      valorCotaCentavos: presente.valor_cota_centavos ?? undefined,
      estiloExibicao: presente.estilo_exibicao === 'emocional' ? 'emocional' : 'padrao',
      iconeEmocional: (presente.icone_emocional ?? '') as GiftInput['iconeEmocional'],
      estaAtivo: true,
    })
    await refreshGifts()
    toast.success(`"${presente.titulo}" voltou para a lista.`)
  } catch {
    toast.error('Não foi possível devolver o presente à lista.')
  } finally {
    devolvendo.value = null
  }
}
</script>

<template>
  <AdminSection
    title="Como aparece no site"
    description="O que o convidado vê quando abre a lista de presentes."
  >
    <template #actions>
      <UiButton variant="ghost" :to="enderecoPublico" target="_blank">
        <Icon name="lucide:external-link" class="h-4 w-4" />
        Abrir a página
      </UiButton>
    </template>

    <div v-if="carregando" class="flex flex-col gap-5">
      <UiSkeleton class="h-32 w-full" />
      <UiSkeleton class="h-48 w-full" />
    </div>

    <template v-else>
      <AdminPanel title="A página">
        <div class="flex flex-col gap-4 p-4 sm:p-5">
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
            <UiBadge :tone="publicado ? 'success' : 'neutral'">
              {{ publicado ? 'Site publicado' : 'Site em rascunho' }}
            </UiBadge>
            <p class="text-sm text-text-muted">
              <template v-if="publicado">
                A lista está no ar em <strong class="text-text">/{{ slug }}/presentes</strong>.
              </template>
              <template v-else>
                Enquanto o site é rascunho, esta página responde 404 para quem não é do casal.
              </template>
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-4">
            <UiBadge :tone="secaoNaHome ? 'success' : 'warning'">
              {{ secaoNaHome ? 'No menu do site' : 'Fora do menu do site' }}
            </UiBadge>
            <p class="text-sm text-text-muted">
              <template v-if="secaoNaHome">
                A home tem o convite para a lista, e ele aparece no menu.
              </template>
              <template v-else>
                A página existe e o link direto funciona — mas nada na home leva até ela. Ligue a
                seção "Lista de presentes" em Aparência → Ordem das seções.
              </template>
            </p>
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Texto de abertura">
        <div class="flex flex-col gap-3 p-4 sm:p-5">
          <p class="text-sm text-text italic">"{{ textoDeAbertura }}"</p>
          <p class="text-xs text-text-muted">
            É a frase que abre a página, acima da lista. Ela é editada junto das outras mensagens do
            site — aqui ela aparece para que dê para conferir sem sair daqui.
          </p>
          <div>
            <UiButton :to="enderecoDasMensagens" size="sm" variant="ghost">
              <Icon name="lucide:pencil" class="h-4 w-4" />
              Editar em Mensagens do site
            </UiButton>
          </div>
        </div>
      </AdminPanel>

      <AdminGiftsCategoriesPanel :categorias="categorias" @changed="refreshCategories()" />

      <AdminPanel
        title="Fora da lista"
        :meta="`${naLista} ${naLista === 1 ? 'presente aparece' : 'presentes aparecem'}`"
      >
        <div class="flex flex-col gap-3 p-4 sm:p-5">
          <template v-if="forasDaLista.length">
            <p class="text-sm text-text-muted">
              Estes presentes existem no cadastro e não aparecem para o convidado.
            </p>
            <ul class="flex flex-col divide-y divide-border">
              <li
                v-for="presente in forasDaLista"
                :key="presente.id"
                class="flex items-center justify-between gap-3 py-2"
              >
                <span class="text-sm text-text">{{ presente.titulo }}</span>
                <UiButton
                  size="sm"
                  variant="ghost"
                  :disabled="devolvendo === presente.id"
                  @click="devolverALista(presente)"
                >
                  Devolver à lista
                </UiButton>
              </li>
            </ul>
          </template>
          <p v-else class="text-sm text-text-muted">
            Todos os presentes cadastrados aparecem para o convidado.
          </p>
        </div>
      </AdminPanel>
    </template>
  </AdminSection>
</template>
