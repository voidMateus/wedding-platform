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
const enviandoLink = ref(false)

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

  enviandoLink.value = true
  try {
    await signInWithMagicLink({ email: email.value })
    magicLinkSent.value = true
  } catch {
    formError.value = 'Não foi possível enviar o link de acesso.'
  } finally {
    enviandoLink.value = false
  }
}

const ocupado = computed(() => isSubmitting.value || enviandoLink.value)
</script>

<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="font-display text-2xl font-semibold text-text">Entrar</h1>
      <p class="mt-1.5 text-sm text-text-muted">
        O painel do casal, da assessoria e de quem ajuda a organizar.
      </p>
    </div>

    <form class="flex flex-col gap-4" @submit="onSubmit">
      <UiInput
        v-model="email"
        type="email"
        label="E-mail"
        placeholder="voce@exemplo.com"
        autocomplete="email"
        :error="errors.email"
      />
      <UiInput
        v-model="password"
        type="password"
        label="Senha"
        autocomplete="current-password"
        :error="errors.password"
      />

      <!-- Mensagem de estado com moldura, não texto solto: no desenho antigo
           ela nascia entre o campo e o botão, do mesmo tamanho do rótulo, e
           quem errava a senha reenviava o formulário sem ter visto o aviso. -->
      <p
        v-if="formError"
        class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        role="alert"
      >
        <Icon name="lucide:circle-alert" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ formError }}
      </p>
      <p
        v-if="magicLinkSent"
        class="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        role="status"
      >
        <Icon name="lucide:mail-check" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Link de acesso enviado — confira seu e-mail.
      </p>

      <UiButton type="submit" size="lg" class="mt-1 w-full justify-center" :disabled="ocupado">
        {{ isSubmitting ? 'Entrando…' : 'Entrar' }}
      </UiButton>
    </form>

    <!-- O link mágico é o OUTRO caminho, não um segundo botão do mesmo: os dois
         empilhados com o mesmo peso faziam a tela oferecer duas portas sem
         dizer para que serve cada uma. Aqui ele fica depois do divisor, com a
         frase que explica quando usá-lo — é o caminho de quem nunca definiu
         senha (todo acesso criado por convite começa assim). -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <span class="h-px flex-1 bg-border" />
        <span class="text-xs tracking-wide text-text-muted uppercase">ou</span>
        <span class="h-px flex-1 bg-border" />
      </div>

      <UiButton
        type="button"
        variant="ghost"
        size="lg"
        class="w-full justify-center"
        :disabled="ocupado"
        @click="handleMagicLink"
      >
        {{ enviandoLink ? 'Enviando…' : 'Receber link por e-mail' }}
      </UiButton>

      <p class="text-center text-xs leading-relaxed text-text-muted">
        Sem senha definida? Informe o e-mail acima e entre pelo link que enviamos.
      </p>
    </div>
  </div>
</template>
