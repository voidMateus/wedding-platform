<!--
  A entrada rápida do Modo Lista: digita o nome, Enter, digita o próximo.

  É o princípio que motivou a tela inteira — *digitar → organizar*, não *abrir
  formulário → preencher → salvar → repetir*. O casal monta a lista no Excel
  justamente porque a planilha deixa despejar dezenas de nomes rápido; um
  cadastro completo por pessoa perde a lista para o Excel antes da vigésima.

  Por isso o campo mora no RODAPÉ DO BLOCO, e não numa barra no topo: o grupo
  de destino é o bloco em que se está digitando, então ele não precisa ser
  escolhido — e o nome nasce onde vai aparecer.

  Só nome. Categoria, contato e o resto são refinamento depois, pela linha ou
  pelo cadastro completo; pedir qualquer campo a mais aqui reintroduz o
  formulário que esta tela existe para evitar.
-->
<script setup lang="ts">
interface Props {
  /** Grupo (ou subdivisão) de destino. `null` no bloco "Sem grupo". */
  grupoId: string | null
  /** Nome do bloco — aparece no rótulo e no aria-label. */
  grupoLabel: string
}

const { grupoId, grupoLabel } = defineProps<Props>()

const emit = defineEmits<{
  /** Uma pessoa entrou. O pai decide quando recarregar a lista. */
  adicionado: []
  /** Pedido de cadastro completo, com este grupo já escolhido. */
  'abrir-cadastro': []
}>()

const { createGuest } = useGuests()

const aberto = ref(false)
const nome = ref('')
const salvando = ref(false)
const erro = ref<string | null>(null)
/** Nomes desta sessão de digitação — some ao fechar o campo. */
const adicionados = ref<string[]>([])

function abrir() {
  erro.value = null
  adicionados.value = []
  aberto.value = true
}

function fechar() {
  aberto.value = false
  nome.value = ''
  erro.value = null
}

async function adicionar() {
  const nomeCompleto = nome.value.trim()
  if (!nomeCompleto || salvando.value) return

  salvando.value = true
  erro.value = null
  try {
    await createGuest({ nomeCompleto, grupoId, emConsideracao: false })
    // Limpa e devolve o cursor imediatamente: quem está despejando nomes não
    // pode esperar a lista recarregar entre um e outro. A linha aparece na
    // tabela quando o recarregamento do pai chega.
    nome.value = ''
    adicionados.value.push(nomeCompleto)
    emit('adicionado')
  } catch (err) {
    // O texto digitado FICA no campo: perder o nome junto com o erro obrigaria
    // a redigitar para tentar de novo.
    const apiError = err as { data?: { message?: string } }
    erro.value = apiError.data?.message ?? 'Não foi possível adicionar. Tente de novo.'
  } finally {
    salvando.value = false
  }
}
</script>

<template>
  <div class="px-4 py-2 md:pl-12">
    <button
      v-if="!aberto"
      type="button"
      :aria-label="`Adicionar convidado em ${grupoLabel}`"
      class="flex w-full items-center gap-1.5 py-0.5 text-left text-xs text-text-muted transition-brand hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      @click="abrir"
    >
      <Icon name="lucide:plus" class="h-3.5 w-3.5 shrink-0" />
      Adicionar convidado
    </button>

    <div v-else class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <UiInput
          v-model="nome"
          autofocus
          :disabled="salvando"
          :aria-label="`Nome do convidado em ${grupoLabel}`"
          placeholder="Nome e Enter para adicionar"
          class="max-w-xs flex-1"
          @keyup.enter="adicionar"
          @keyup.esc="fechar"
        />
        <UiButton size="sm" :disabled="!nome.trim() || salvando" @click="adicionar">
          {{ salvando ? 'Adicionando...' : 'Adicionar' }}
        </UiButton>
        <AdminRowAction icon="lucide:x" label="Fechar entrada rápida" @click="fechar" />
      </div>

      <p v-if="erro" class="text-xs text-danger" role="alert">{{ erro }}</p>

      <!-- `aria-live`: a linha nova entra na tabela só quando o recarregamento
           chega, então sem este retorno o Enter parece não ter feito nada. -->
      <p v-else class="text-xs text-text-muted" role="status" aria-live="polite">
        <template v-if="adicionados.length">
          <span class="num">{{ adicionados.length }}</span>
          {{ adicionados.length === 1 ? 'adicionado' : 'adicionados' }} —
          <span class="text-text">{{ adicionados[adicionados.length - 1] }}</span>
          <button
            type="button"
            class="ml-2 text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="emit('abrir-cadastro')"
          >
            abrir cadastro completo
          </button>
        </template>
        <template v-else>
          Só o nome — categoria e contato ficam para depois.
          <button
            type="button"
            class="ml-1 text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            @click="emit('abrir-cadastro')"
          >
            cadastro completo
          </button>
        </template>
      </p>
    </div>
  </div>
</template>
