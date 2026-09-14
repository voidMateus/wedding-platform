<!--
  Situação do site — a casa fixa de `casamentos.status_ciclo_vida`
  (docs/fase4-onboarding.md seção 8.2).

  Fica aqui, e não só no roteiro de Primeiros passos, porque o roteiro SOME
  quando os sete passos terminam: publicar e despublicar precisam continuar
  existindo em algum lugar depois disso.

  Não é um ToggleRow apesar de ser booleano. Despublicar derruba o link e o QR
  que já foram compartilhados com os convidados, e uma chavinha é o controle
  de quem espera poder desfazer olhando — aqui o efeito acontece do lado de
  fora, onde o casal não vê. Botão explícito, com o efeito escrito antes.

  Emite `saved` em vez de manter estado próprio: o `wedding` é compartilhado
  (chave 'wedding' do useFetch), e recarregá-lo é o que mantém esta seção, o
  roteiro do Início e qualquer outra tela contando a mesma história.
-->
<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import type { Wedding } from '~/types/wedding'

interface Props {
  wedding: Wedding | null | undefined
}

const { wedding } = defineProps<Props>()

const emit = defineEmits<{
  saved: []
}>()

const toast = useToast()
const { updateWeddingLifecycle } = useWedding()

const publicado = computed(() => wedding?.status_ciclo_vida === 'publicado')
const arquivado = computed(() => wedding?.status_ciclo_vida === 'arquivado')
const enviando = ref(false)

const enderecoPublico = computed(() => (wedding ? `/${wedding.slug}` : '/'))

async function alternar() {
  if (!wedding || arquivado.value) return

  enviando.value = true
  try {
    await updateWeddingLifecycle({
      statusCicloVida: publicado.value ? 'rascunho' : 'publicado',
    })
    toast.success(publicado.value ? 'O site saiu do ar.' : 'O site está no ar!')
    emit('saved')
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'Não foi possível alterar a situação do site.'))
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 rounded-md border border-border px-4 py-3">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Icon
          :name="publicado ? 'lucide:globe' : 'lucide:globe-lock'"
          class="h-4 w-4 shrink-0"
          :class="publicado ? 'text-success' : 'text-text-muted'"
          aria-hidden="true"
        />
        <span class="text-sm font-medium text-text">Situação do site</span>
        <UiBadge :tone="publicado ? 'success' : 'neutral'">
          {{ publicado ? 'No ar' : 'Rascunho' }}
        </UiBadge>
      </div>

      <UiButton
        v-if="!arquivado"
        :variant="publicado ? 'outline' : 'primary'"
        size="sm"
        :disabled="enviando"
        @click="alternar"
      >
        <template v-if="enviando">Salvando...</template>
        <template v-else>{{ publicado ? 'Tirar do ar' : 'Publicar site' }}</template>
      </UiButton>
    </div>

    <p class="text-xs leading-relaxed text-text-muted">
      <template v-if="arquivado">
        Este casamento está arquivado: o site não fica no ar e os dados seguem preservados.
      </template>
      <template v-else-if="publicado">
        Qualquer pessoa com o link vê o site, a lista de presentes e o RSVP. Ao tirar do ar, o link
        e o QR code que você já compartilhou param de funcionar enquanto o site estiver em rascunho.
      </template>
      <template v-else>
        Só vocês veem o site. Quem abrir o link recebe "página não encontrada", e o RSVP e a lista
        de presentes não respondem.
      </template>
    </p>

    <NuxtLink
      :to="enderecoPublico"
      target="_blank"
      class="text-xs font-medium text-primary underline-offset-4 hover:underline"
    >
      {{ publicado ? 'Ver site público' : 'Ver como está ficando' }}
    </NuxtLink>
  </div>
</template>
