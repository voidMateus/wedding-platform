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
 * O que o Supabase respondeu, cru.
 *
 * Fica visível na tela abaixo da mensagem amigável. Traduzir toda falha para
 * "o link expirou" é confortável e inútil: as causas são diferentes (link já
 * consumido por varredura de e-mail, fluxo PKCE sem verificador, projeto sem a
 * URL na allowlist) e cada uma pede uma ação diferente de quem está tentando
 * entrar — ou de quem vai depurar.
 */
const detalhe = ref<string | null>(null)

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

/** Lê um parâmetro na query **ou** no fragmento (`#`) — o Supabase usa os dois. */
function parametroDoLink(nome: string): string {
  const naQuery = route.query[nome]
  if (typeof naQuery === 'string' && naQuery) return naQuery

  // O fluxo implícito devolve tudo depois do `#`, que não faz parte da query e
  // que o servidor nunca vê. Ignorá-lo fazia um erro explicado pelo Supabase
  // chegar aqui como "endereço sem link válido".
  if (import.meta.client && window.location.hash.length > 1) {
    return new URLSearchParams(window.location.hash.slice(1)).get(nome) ?? ''
  }
  return ''
}

onMounted(async () => {
  const code = parametroDoLink('code')

  const codigoDoErro = parametroDoLink('error_code')
  const descricaoDoErro = parametroDoLink('error_description').replace(/\+/g, ' ')

  if (codigoDoErro || descricaoDoErro) {
    erro.value =
      codigoDoErro === 'otp_expired'
        ? 'Este link expirou ou já foi usado.'
        : 'O provedor de acesso recusou este link.'
    detalhe.value = [codigoDoErro, descricaoDoErro].filter(Boolean).join(' — ') || null
    return
  }

  // Sem `code` não é motivo para desistir: `/auth/confirmar` verifica no
  // servidor e chega aqui com a sessão já nos cookies, e o fluxo implícito
  // entrega os tokens no fragmento, que o próprio client recolhe. Quem decide
  // se há acesso é a sessão, não a query string.
  try {
    await completarAcessoPorLink(code || null)
  } catch (falha) {
    detalhe.value = falha instanceof Error ? falha.message : null
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
      <!-- A resposta crua do provedor: é ela que diz o que fazer a seguir. -->
      <p v-if="detalhe" class="mt-2 font-mono text-xs break-words text-text-muted/80">
        {{ detalhe }}
      </p>
    </div>

    <!-- Saída sempre: quem chegou aqui por um link que não funcionou não pode
         ficar numa tela que só explica o problema. -->
    <UiButton v-if="erro" to="/login" class="self-start">Pedir um novo link</UiButton>
  </div>
</template>
