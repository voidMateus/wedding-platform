<!--
  O editor das mensagens do casal — um texto por tipo de envio.

  Mora AQUI, e não em Configurações, porque é onde ele é usado: a
  pré-visualização precisa de um convite real para resolver as variáveis, e
  quem abre esta tela está prestes a mandar.

  Um modelo por tipo, compartilhado entre canais: o WhatsApp usa o texto puro,
  e o e-mail (entrega seguinte) usará o mesmo texto dentro do layout dele. É
  isso que impede os dois de divergirem no primeiro ajuste.
-->
<script setup lang="ts">
import {
  MODELOS_PADRAO,
  ROTULOS_TIPO_COMUNICACAO,
  TIPOS_COMUNICACAO,
  VARIAVEIS_COMUNICACAO,
  renderizarModelo,
} from '#shared/utils/modelo-comunicacao'
import type { TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import type { ModelosComunicacaoInput } from '#shared/schemas/comunicacoes'

interface Props {
  open: boolean
}

defineProps<Props>()
const emit = defineEmits<{ close: [] }>()

const { salvarModelos } = useCommunications()
const { getWedding } = useWedding()
const toast = useToast()

const { data: wedding, refresh } = getWedding()

const tipoAberto = ref<TipoComunicacao>('convite')
const rascunhos = ref<Record<TipoComunicacao, string>>({
  save_the_date: '',
  convite: '',
  lembrete: '',
})
const isSaving = ref(false)

/**
 * Carrega o que está gravado — e deixa em branco o que nunca foi personalizado.
 *
 * Em branco, não com o padrão copiado dentro: o campo vazio mostra o padrão
 * como `placeholder`, e é isso que faz "voltar ao padrão" ser simplesmente
 * apagar o texto. Copiar o padrão para dentro do campo congelaria uma versão
 * dele, e uma melhoria futura no texto da plataforma nunca alcançaria quem
 * abriu esta tela uma vez.
 */
watch(
  wedding,
  (valor) => {
    const modelos = (valor?.config_comunicacao ?? {}) as ModelosComunicacaoInput
    for (const tipo of TIPOS_COMUNICACAO) rascunhos.value[tipo] = modelos[tipo] ?? ''
  },
  { immediate: true },
)

/** Exemplo fixo: a pré-visualização mostra a FORMA da mensagem, não um envio. */
const EXEMPLO = {
  nome: 'Ana',
  casal: computed(() => wedding.value?.nomes_noivos ?? 'Vocês dois'),
  data: '11/12/2027',
  local: 'Espaço Villa Bella',
  prazo: '30/10/2027',
  link: 'meusitecasamento.com/.../rsvp/ABC123',
}

const previa = computed(() =>
  renderizarModelo(rascunhos.value[tipoAberto.value] || MODELOS_PADRAO[tipoAberto.value], {
    nome: EXEMPLO.nome,
    casal: EXEMPLO.casal.value,
    data: EXEMPLO.data,
    local: EXEMPLO.local,
    prazo: EXEMPLO.prazo,
    link: EXEMPLO.link,
  }),
)

function inserirVariavel(chave: string) {
  rascunhos.value[tipoAberto.value] =
    `${rascunhos.value[tipoAberto.value] || MODELOS_PADRAO[tipoAberto.value]} {{${chave}}}`
}

async function salvar() {
  isSaving.value = true
  try {
    await salvarModelos(rascunhos.value)
    await refresh()
    toast.success('Mensagens salvas.')
    emit('close')
  } catch (err) {
    toast.error(getApiErrorMessage(err, 'Não foi possível salvar as mensagens.'))
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="open"
    title="Mensagens"
    description="O texto que sai para o convidado, por tipo de envio. Deixe em branco para usar o padrão."
    size="lg"
    @update:model-value="emit('close')"
  >
    <div class="flex flex-col gap-4">
      <AdminFilterChips
        v-model="tipoAberto"
        :items="TIPOS_COMUNICACAO.map((t) => ({ value: t, label: ROTULOS_TIPO_COMUNICACAO[t] }))"
        group-label="Tipo de mensagem"
      />

      <UiTextarea
        v-model="rascunhos[tipoAberto]"
        :label="`Mensagem de ${ROTULOS_TIPO_COMUNICACAO[tipoAberto].toLowerCase()}`"
        :placeholder="MODELOS_PADRAO[tipoAberto]"
        :rows="6"
        hint="Vazio usa o texto padrão da plataforma, que já funciona sozinho."
      />

      <div class="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-text-muted">
        <span>Inserir:</span>
        <button
          v-for="variavel in VARIAVEIS_COMUNICACAO"
          :key="variavel.chave"
          type="button"
          class="rounded-md border border-dashed border-border px-2 py-0.5 transition-brand hover:border-primary/40 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :title="variavel.descricao"
          @click="inserirVariavel(variavel.chave)"
        >
          {{ variavel.chave }}
        </button>
      </div>

      <!-- A prévia é a mesma função que o servidor usa para montar o texto que
           realmente vai (`renderizarModelo`, em `shared/`). Duas implementações
           divergiriam justamente no caso que ninguém testa: a variável rara. -->
      <div class="rounded-md border border-border bg-surface-muted p-4">
        <p class="mb-2 text-xs uppercase tracking-wide text-text-muted">Como vai chegar</p>
        <p class="whitespace-pre-wrap text-sm text-text">{{ previa }}</p>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" :disabled="isSaving" @click="emit('close')">Cancelar</UiButton>
      <UiButton :disabled="isSaving" @click="salvar">Salvar</UiButton>
    </template>
  </UiModal>
</template>
