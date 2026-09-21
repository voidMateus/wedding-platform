<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { loginWithPasswordSchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const { signInWithPassword, signInWithMagicLink, pedirRedefinicaoDeSenha } = useAuth()
const route = useRoute()

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(loginWithPasswordSchema),
})

const [email] = defineField('email')
const [password] = defineField('password')

const formError = ref<string | null>(null)

/**
 * Uma mensagem de sucesso, não uma por caminho: "link enviado" e "e-mail de
 * redefinição enviado" nunca acontecem ao mesmo tempo, e dois avisos empilhados
 * fariam a tela parecer ter feito duas coisas.
 */
const sucesso = ref<string | null>(null)

const enviandoLink = ref(false)
const enviandoRedefinicao = ref(false)

const onSubmit = handleSubmit(async (values) => {
  formError.value = null
  sucesso.value = null
  try {
    await signInWithPassword(values)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/admin'
    await navigateTo(redirect)
  } catch {
    formError.value = 'E-mail ou senha inválidos.'
  }
})

/** Os dois caminhos por e-mail precisam do endereço, e nenhum dos dois o adivinha. */
function semEmail(aviso: string): boolean {
  formError.value = null
  sucesso.value = null

  if (email.value) return false

  formError.value = aviso
  return true
}

async function handleMagicLink() {
  if (semEmail('Informe o e-mail para receber o link de acesso.')) return

  enviandoLink.value = true
  try {
    await signInWithMagicLink({ email: email.value as string })
    sucesso.value = 'Link de acesso enviado — confira seu e-mail.'
  } catch {
    formError.value = 'Não foi possível enviar o link de acesso.'
  } finally {
    enviandoLink.value = false
  }
}

async function handleEsqueciSenha() {
  if (semEmail('Informe o e-mail para receber o link de redefinição.')) return

  enviandoRedefinicao.value = true
  try {
    await pedirRedefinicaoDeSenha({ email: email.value as string })
    // A frase não confirma que a conta existe: a resposta do servidor é a mesma
    // nos dois casos, de propósito, e a tela não pode prometer mais do que ele.
    sucesso.value = 'Se este e-mail tiver conta, o link para redefinir a senha está a caminho.'
  } catch {
    formError.value = 'Não foi possível enviar o link de redefinição.'
  } finally {
    enviandoRedefinicao.value = false
  }
}

const ocupado = computed(
  () => isSubmitting.value || enviandoLink.value || enviandoRedefinicao.value,
)
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

      <div class="flex flex-col gap-1.5">
        <UiInput
          v-model="password"
          type="password"
          label="Senha"
          autocomplete="current-password"
          :error="errors.password"
        />

        <!-- Abaixo do campo, discreto: é o caminho de quem já travou, não uma
             das opções que a tela oferece de entrada. -->
        <button
          type="button"
          class="self-end text-xs text-text-muted underline underline-offset-2 transition-brand hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="ocupado"
          @click="handleEsqueciSenha"
        >
          {{ enviandoRedefinicao ? 'Enviando…' : 'Esqueci minha senha' }}
        </button>
      </div>

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
        v-if="sucesso"
        class="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
        role="status"
      >
        <Icon name="lucide:mail-check" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ sucesso }}
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
