<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { loginWithPasswordSchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const { signInWithPassword, signInWithMagicLink } = useAuth()
const route = useRoute()

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginWithPasswordSchema),
})

const [email] = defineField('email')
const [password] = defineField('password')

const formError = ref<string | null>(null)
const magicLinkSent = ref(false)

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  try {
    await signInWithPassword(values)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    await navigateTo(redirect)
  } catch {
    formError.value = 'E-mail ou senha inválidos.'
  }
})

async function handleMagicLink() {
  formError.value = null
  magicLinkSent.value = false

  if (!email.value) {
    formError.value = 'Informe o e-mail para receber o link de acesso.'
    return
  }

  try {
    await signInWithMagicLink({ email: email.value })
    magicLinkSent.value = true
  } catch {
    formError.value = 'Não foi possível enviar o link de acesso.'
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-lg font-semibold text-text">Entrar</h1>
      <p class="mt-1 text-sm text-text-muted">Acesso do casal e colaboradores.</p>
    </div>

    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput
        v-model="email"
        type="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        :error="errors.email"
      />
      <UiInput v-model="password" type="password" label="Senha" :error="errors.password" />

      <p v-if="formError" class="text-sm text-danger" role="alert">{{ formError }}</p>
      <p v-if="magicLinkSent" class="text-sm text-success" role="status">
        Link de acesso enviado — confira seu e-mail.
      </p>

      <UiButton type="submit" :disabled="isSubmitting">Entrar</UiButton>
      <UiButton type="button" variant="ghost" :disabled="isSubmitting" @click="handleMagicLink">
        Entrar com link mágico
      </UiButton>
    </form>
  </div>
</template>
