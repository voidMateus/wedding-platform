<!--
  Criar um casamento pelo painel interno (docs/fase5-multievento.md seção 6).

  Não é cadastro self-service: quem preenche é a equipe interna, e o e-mail
  informado vira o DONO. Criação pelo próprio casal é Fase 6, e depende de
  billing.

  O aviso de que o casamento nasce em rascunho não é decoração — é a
  propriedade que torna a criação segura de fazer, e quem cria precisa saber
  que não acabou de pôr um site no ar.
-->
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { platformWeddingCreateSchema } from '#shared/schemas/platform-wedding'
import { getApiErrorMessage } from '~/utils/api-error'

const aberto = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  created: []
}>()

const toast = useToast()
const { createWedding } = usePlatformOverview()

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(platformWeddingCreateSchema),
  initialValues: { slug: '', nomesNoivos: '', dataEvento: '', emailDono: '' },
})

const [slug] = defineField('slug')
const [nomesNoivos] = defineField('nomesNoivos')
const [dataEvento] = defineField('dataEvento')
const [emailDono] = defineField('emailDono')

const onSubmit = handleSubmit(async (values) => {
  try {
    await createWedding(values)
    toast.success('Casamento criado — o dono recebeu um e-mail de acesso.')
    resetForm()
    aberto.value = false
    emit('created')
  } catch (err) {
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

      <UiInput
        v-model="slug"
        label="Endereço do site"
        placeholder="ana-e-bruno"
        hint="É o que vai depois do domínio. Só letras minúsculas, números e hífen."
        :error="errors.slug"
      />

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
