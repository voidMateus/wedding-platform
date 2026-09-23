<!--
  Definir ou redefinir a senha (rodada de usabilidade de 20/09/2026, ponto 4).

  Não existia tela nenhuma: o convite criava o acesso, o login oferecia senha
  **ou** link mágico, e não havia como definir a primeira senha nem recuperar a
  esquecida. Na prática o casal ficava dependente do link — e, com o ponto 5,
  nem disso.

  Uma tela para os dois casos, porque o que acontece aqui é o mesmo: a pessoa
  chega com uma sessão que o e-mail acabou de provar, e escolhe a senha. O que
  muda é só o texto, e `?novo=1` (que o convite traz) o decide.

  Não há rota nossa no caminho da senha: quem autoriza a troca é a sessão, e um
  endpoint intermediário só acrescentaria um lugar por onde ela passa.
-->
<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { definirSenhaSchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })

const route = useRoute()
const usuario = useSupabaseUser()
const { definirSenha, aguardarUsuario } = useAuth()

/** O convite chega com `?novo=1`: quem nunca teve senha não está "redefinindo". */
const primeiraSenha = computed(() => route.query.novo === '1')

/**
 * Enquanto não se sabe se há sessão, a tela não acusa nada.
 *
 * São duas chegadas: `/auth/confirmar` grava os cookies antes de redirecionar, e
 * aí o usuário já vem do servidor; o formato antigo entrega os tokens no
 * fragmento, que só o client recolhe, depois da hidratação. Decidir por
 * `usuario.value` no primeiro tick mostraria "link inválido" para metade dos
 * acessos legítimos.
 */
const procurandoSessao = ref(true)

onMounted(async () => {
  await aguardarUsuario()
  procurandoSessao.value = false
})

const { handleSubmit, defineField, errors, isSubmitting } = useForm({
  validationSchema: toTypedSchema(definirSenhaSchema),
  initialValues: { senha: '', confirmacao: '' },
})

const [senha] = defineField('senha')
const [confirmacao] = defineField('confirmacao')

const erro = ref<string | null>(null)

const onSubmit = handleSubmit(async (values) => {
  erro.value = null
  try {
    await definirSenha(values.senha)
    await navigateTo('/admin')
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Não foi possível salvar a senha agora.'
  }
})
</script>

<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="font-display text-2xl font-semibold text-text">
        {{ primeiraSenha ? 'Definir sua senha' : 'Escolher uma nova senha' }}
      </h1>
      <p class="mt-1.5 text-sm text-text-muted">
        {{
          primeiraSenha
            ? 'A partir daqui você entra com seu e-mail e esta senha.'
            : 'Depois de salvar, use a nova senha para entrar.'
        }}
      </p>
    </div>

    <div v-if="procurandoSessao" class="flex flex-col gap-3">
      <UiSkeleton class="h-10 w-full" />
      <UiSkeleton class="h-10 w-full" />
    </div>

    <!-- Sem sessão não há o que autorizar a troca. A saída é pedir o link de
         novo, nunca um formulário que vai falhar no envio. -->
    <template v-else-if="!usuario">
      <p
        class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        role="alert"
      >
        <Icon name="lucide:circle-alert" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Este endereço só funciona a partir do link enviado por e-mail, e o seu expirou ou já foi
        usado.
      </p>
      <UiButton to="/login" class="self-start">Voltar para o login</UiButton>
    </template>

    <form v-else class="flex flex-col gap-4" @submit="onSubmit">
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

      <p
        v-if="erro"
        class="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger"
        role="alert"
      >
        <Icon name="lucide:circle-alert" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {{ erro }}
      </p>

      <UiButton type="submit" size="lg" class="mt-1 w-full justify-center" :disabled="isSubmitting">
        {{ isSubmitting ? 'Salvando…' : 'Salvar senha' }}
      </UiButton>
    </form>
  </div>
</template>
