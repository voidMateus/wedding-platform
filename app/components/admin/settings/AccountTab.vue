<!--
  Conta: o acesso da PESSOA, não do evento.

  É o único assunto de Configurações que não guarda dado do casamento — e é
  aqui porque é onde alguém procura (rodada de usabilidade de 20/09/2026, ponto
  4). Trocar a própria senha não é passo de roteiro nem decisão de evento: é
  manutenção de conta, e quem a faz já está dentro.

  A troca não passa por rota nossa: quem autoriza é a sessão do navegador, pelo
  próprio Supabase. Um endpoint intermediário só acrescentaria um lugar por
  onde a senha passa.
-->
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { definirSenhaSchema } from '#shared/schemas/auth'

const toast = useToast()
const usuario = useSupabaseUser()
const { definirSenha } = useAuth()

const { handleSubmit, defineField, errors, resetForm, isSubmitting } = useForm({
  validationSchema: toTypedSchema(definirSenhaSchema),
  initialValues: { senha: '', confirmacao: '' },
})

const [senha] = defineField('senha')
const [confirmacao] = defineField('confirmacao')

const onSubmit = handleSubmit(async (values) => {
  try {
    await definirSenha(values.senha)
    resetForm()
    toast.success('Senha alterada.')
  } catch (falha) {
    toast.error(falha instanceof Error ? falha.message : 'Não foi possível alterar a senha.')
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <AdminSettingsSectionCard
      section-id="senha"
      title="Senha"
      description="Vale para a sua conta, em todos os casamentos que você acessa."
    >
      <p v-if="usuario?.email" class="text-sm text-text-muted">
        Você está conectado como <strong class="font-medium text-text">{{ usuario.email }}</strong
        >.
      </p>

      <form class="flex max-w-md flex-col gap-4" @submit="onSubmit">
        <UiInput
          v-model="senha"
          type="password"
          label="Nova senha"
          autocomplete="new-password"
          hint="Pelo menos 8 caracteres."
          :error="errors.senha"
        />
        <UiInput
          v-model="confirmacao"
          type="password"
          label="Repita a nova senha"
          autocomplete="new-password"
          :error="errors.confirmacao"
        />

        <UiButton type="submit" class="self-start" :disabled="isSubmitting">
          {{ isSubmitting ? 'Salvando…' : 'Alterar senha' }}
        </UiButton>
      </form>

      <template #aside>
        <p>
          A senha atual não é pedida porque a sessão já provou quem é você — é a mesma garantia que
          abre o painel.
        </p>
        <p>Esqueceu a senha e não consegue entrar? O link de redefinição fica na tela de login.</p>
      </template>
    </AdminSettingsSectionCard>
  </div>
</template>
