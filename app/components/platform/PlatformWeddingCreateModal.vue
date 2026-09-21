<!--
  Criar um casamento pelo painel interno (docs/fase5-multievento.md seção 6).

  Não é cadastro self-service: quem preenche é a equipe interna, e o e-mail
  informado vira o DONO. Criação pelo próprio casal é Fase 6, e depende de
  billing.

  O aviso de que o casamento nasce em rascunho não é decoração — é a
  propriedade que torna a criação segura de fazer, e quem cria precisa saber
  que não acabou de pôr um site no ar.

  O endereço do site responde enquanto se digita, nos dois sentidos (rodada de
  usabilidade de 20/09/2026, ponto 1): ele se sugere a partir do nome do casal,
  que está na linha de cima, e diz se está livre antes do Criar — antes, a
  única resposta era o `:error`, e a colisão só aparecia no 409, com o convite
  do dono já a caminho de ser disparado.
-->
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useDebounceFn } from '@vueuse/core'
import { useForm } from 'vee-validate'
import { platformWeddingCreateSchema } from '#shared/schemas/platform-wedding'
import { sugerirEnderecoDoSite } from '#shared/utils/endereco-do-site'
import { getApiErrorMessage } from '~/utils/api-error'

const aberto = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  created: []
}>()

const toast = useToast()
const { createWedding, verificarEnderecoDoSite } = usePlatformOverview()
const siteUrl = useSiteUrl()

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(platformWeddingCreateSchema),
  initialValues: { slug: '', nomesNoivos: '', dataEvento: '', emailDono: '' },
})

const [slug] = defineField('slug')
const [nomesNoivos] = defineField('nomesNoivos')
const [dataEvento] = defineField('dataEvento')
const [emailDono] = defineField('emailDono')

/**
 * Sugerir sim, decidir não: a partir do momento em que o operador escreve o
 * endereço, o nome do casal para de mexer nele. Esvaziar o campo devolve a
 * sugestão — campo em branco é desistência do texto próprio, não escolha pelo
 * vazio.
 */
const enderecoEditadoAMao = ref(false)

type EstadoDoEndereco = 'ocioso' | 'checando' | 'livre' | 'ocupado'
const estadoDoEndereco = ref<EstadoDoEndereco>('ocioso')

/** O endereço normalizado como o servidor vai gravá-lo, ou `null` se o formato ainda não fecha. */
const enderecoNormalizado = computed(() => {
  const resultado = platformWeddingCreateSchema.shape.slug.safeParse(slug.value ?? '')
  return resultado.success ? resultado.data : null
})

/** O que o casal vai ditar por telefone — é esse endereço que se está conferindo. */
const enderecoFinal = computed(() => {
  const base = siteUrl.value || (import.meta.client ? window.location.origin : '')
  return `${base.replace(/^https?:\/\//, '')}/${enderecoNormalizado.value ?? ''}`
})

function aoDigitarEndereco(valor: string) {
  enderecoEditadoAMao.value = valor.trim().length > 0
  slug.value = valor
}

watch(nomesNoivos, (nomes) => {
  if (enderecoEditadoAMao.value) return
  slug.value = sugerirEnderecoDoSite(nomes ?? '')
})

// 400ms: uma pausa de digitação. Sem debounce, "ana-e-bruno" custaria onze
// consultas ao banco para responder uma pergunta só.
const conferirEndereco = useDebounceFn(async (endereco: string) => {
  try {
    const { slug: conferido, disponivel } = await verificarEnderecoDoSite(endereco)

    // Resposta atrasada de um endereço que já não é o da tela: quem continuou
    // digitando receberia o veredito do texto anterior.
    if (conferido !== enderecoNormalizado.value) return

    estadoDoEndereco.value = disponivel ? 'livre' : 'ocupado'
  } catch {
    // Falhar a conferência não pode bloquear a criação: ela é conveniência, e
    // a garantia real é o `unique` do banco, tratado no envio.
    estadoDoEndereco.value = 'ocioso'
  }
}, 400)

watch(enderecoNormalizado, (endereco) => {
  if (!endereco) {
    estadoDoEndereco.value = 'ocioso'
    return
  }
  estadoDoEndereco.value = 'checando'
  conferirEndereco(endereco)
})

const onSubmit = handleSubmit(async (values) => {
  try {
    await createWedding(values)
    toast.success('Casamento criado — o dono recebeu um e-mail de acesso.')
    resetForm()
    enderecoEditadoAMao.value = false
    estadoDoEndereco.value = 'ocioso'
    aberto.value = false
    emit('created')
  } catch (err) {
    // O 409 é a resposta da corrida que a conferência não cobre (dois
    // operadores no mesmo endereço): o campo passa a dizer o que o toast diz.
    if ((err as { statusCode?: number })?.statusCode === 409) {
      estadoDoEndereco.value = 'ocupado'
    }
    toast.error(getApiErrorMessage(err, 'Não foi possível criar este casamento.'))
  }
})
</script>

<template>
  <UiModal v-model="aberto" title="Criar casamento">
    <form id="criar-casamento" class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput
        v-model="nomesNoivos"
        label="Nome do casal"
        placeholder="Ana & Bruno"
        :error="errors.nomesNoivos"
      />

      <div class="flex flex-col gap-1.5">
        <UiInput
          :model-value="slug"
          label="Endereço do site"
          placeholder="ana-e-bruno"
          :hint="
            estadoDoEndereco === 'ocioso'
              ? 'É o que vai depois do domínio. Só letras minúsculas, números e hífen.'
              : undefined
          "
          :error="errors.slug"
          @update:model-value="aoDigitarEndereco"
        />

        <!-- `role="status"` porque o veredito chega depois, sem o operador ter
             feito nada: sem ele, quem usa leitor de tela digita e não é
             avisado de que o endereço já está tomado. -->
        <p
          v-if="estadoDoEndereco !== 'ocioso'"
          role="status"
          class="flex items-start gap-1.5 text-xs leading-relaxed"
          :class="{
            'text-text-muted': estadoDoEndereco === 'checando',
            'text-success': estadoDoEndereco === 'livre',
            'text-danger': estadoDoEndereco === 'ocupado',
          }"
        >
          <Icon
            v-if="estadoDoEndereco !== 'checando'"
            :name="estadoDoEndereco === 'livre' ? 'lucide:check-circle-2' : 'lucide:alert-triangle'"
            class="mt-0.5 h-3.5 w-3.5 shrink-0"
            aria-hidden="true"
          />
          <span v-if="estadoDoEndereco === 'checando'"
            >Conferindo se este endereço está livre…</span
          >
          <span v-else-if="estadoDoEndereco === 'livre'">
            Livre — o site do casal vai ficar em
            <strong class="font-medium">{{ enderecoFinal }}</strong>
          </span>
          <span v-else>Já existe um casamento neste endereço. Escolha outro.</span>
        </p>
      </div>

      <UiDatePicker v-model="dataEvento" label="Data do evento" :error="errors.dataEvento" />

      <UiInput
        v-model="emailDono"
        type="email"
        label="E-mail do dono"
        placeholder="pessoa@exemplo.com"
        hint="Quem receber este acesso vira dono do casamento. Se ainda não tiver conta, recebe um convite."
        :error="errors.emailDono"
      />

      <p class="rounded-md bg-surface-muted px-3 py-2 text-xs text-text-muted">
        O casamento nasce como <strong class="font-medium text-text">rascunho</strong>: o site
        público responde 404 até o próprio casal publicar.
      </p>
    </form>

    <template #footer>
      <UiButton variant="ghost" :disabled="isSubmitting" @click="aberto = false">Cancelar</UiButton>
      <UiButton type="submit" form="criar-casamento" :disabled="isSubmitting">Criar</UiButton>
    </template>
  </UiModal>
</template>
