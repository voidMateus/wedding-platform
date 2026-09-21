<!--
  A volta do link enviado por e-mail — convite, link de acesso, redefinição de
  senha.

  Esta página não existia, e é por isso que o link mágico não logava ninguém
  (rodada de usabilidade de 20/09/2026, ponto 5). O Supabase mandava a pessoa
  para o `site_url` do projeto com `?code=` na query, ou seja, para a raiz do
  domínio — uma página neutra que só diz "acesse pelo link do casamento". O
  código chegava e morria ali: além de não haver nada para trocá-lo por uma
  sessão, o plugin de auth (`app/plugins/supabase-auth.client.ts`) nem
  inicializa o client fora de /admin, /login, /plataforma e — agora — /auth.

  Uma página só para os três fluxos, com o destino em `?next=`: eles diferem no
  que vem depois, não no que acontece aqui.
-->
<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const DESTINO_PADRAO = '/admin'

const route = useRoute()
const { completarAcessoPorLink } = useAuth()

const erro = ref<string | null>(null)

/**
 * Para onde ir depois de a sessão existir.
 *
 * Só caminho interno: `next` vem da URL, e um destino absoluto transformaria
 * este callback num redirecionador aberto — alguém mandaria o link de acesso
 * legítimo do produto levando para fora dele.
 */
const destino = computed(() => {
  const pedido = typeof route.query.next === 'string' ? route.query.next : ''
  return pedido.startsWith('/') && !pedido.startsWith('//') ? pedido : DESTINO_PADRAO
})

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : ''

  // O Supabase também devolve o erro na própria URL (link expirado, já usado)
  // — e nesse caso não há código nenhum para tentar trocar.
  const erroDoLink =
    typeof route.query.error_description === 'string' ? route.query.error_description : ''

  if (erroDoLink || !code) {
    erro.value = erroDoLink
      ? 'Este link expirou ou já foi usado.'
      : 'Este endereço não tem um link de acesso válido.'
    return
  }

  try {
    await completarAcessoPorLink(code)
  } catch {
    // A causa mais comum não é link inválido: é link aberto em OUTRO navegador.
    // O PKCE guarda o verificador em quem pediu o link, então abrir no celular
    // um e-mail pedido no computador falha aqui — e a mensagem precisa dizer
    // isso, senão a pessoa tenta o mesmo caminho de novo.
    erro.value =
      'Não foi possível entrar com este link. Ele pode ter expirado, já ter sido usado, ou ter sido aberto em um navegador diferente daquele em que foi pedido.'
    return
  }

  await navigateTo(destino.value)
})
</script>

<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="font-display text-2xl font-semibold text-text">
        {{ erro ? 'Não foi possível entrar' : 'Entrando...' }}
      </h1>
      <p class="mt-1.5 text-sm text-text-muted">
        {{ erro ?? 'Só um instante — estamos confirmando seu acesso.' }}
      </p>
    </div>

    <!-- Saída sempre: quem chegou aqui por um link que não funcionou não pode
         ficar numa tela que só explica o problema. -->
    <UiButton v-if="erro" to="/login" class="self-start">Pedir um novo link</UiButton>
  </div>
</template>
