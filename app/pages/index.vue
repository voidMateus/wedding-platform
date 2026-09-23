<!--
  A raiz do domínio: a PORTA (rodada de usabilidade de 20/09/2026, ponto 6).

  Ela foi escrita para o convidado que erra o endereço, e continua servindo a
  ele — mas era também o que o CASAL via ao digitar o domínio, sem nenhum
  caminho para entrar. Quem tem conta e não guardou o link do e-mail chegava a
  uma página que só explicava por que não podia fazer nada.

  **Não é a página de vendas.** A página comercial (posicionamento, preços,
  prova social, cadastro) está nomeada em `docs/ROADMAP.md` como trabalho
  próprio, para quando houver o que vender — ela tem outro público, outra
  métrica, e a indexação é decisão dela. Esta continua `noindex`.

  Reaproveita o layout `auth` de propósito: ele já é a fronteira entre a marca
  (à esquerda, na linguagem do convite) e a ferramenta (à direita, na do
  painel), e entrar é atravessar de um lado ao outro. Um desenho novo aqui
  seria uma terceira linguagem para dizer a mesma coisa.

  O SDK do Supabase **não** é carregado nesta rota (`supabase-auth.client.ts`
  só o importa em /admin, /login, /plataforma e /auth), e é por isso que
  "Entrar" é um link para a tela de login, e não um formulário aqui dentro.
-->
<script setup lang="ts">
import { NOME_DO_PRODUTO } from '#shared/marca'

definePageMeta({ layout: 'auth' })

useSeoMeta({
  title: NOME_DO_PRODUTO,
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="flex flex-col gap-7">
    <div>
      <h1 class="font-display text-2xl font-semibold text-text">Entre no seu painel</h1>
      <p class="mt-1.5 text-sm leading-relaxed text-text-muted">
        A lista de convidados, as confirmações de presença, o orçamento, os presentes e o site que
        os seus convidados visitam — para o casal e para quem ajuda a organizar.
      </p>
    </div>

    <UiButton to="/login" size="lg" class="w-full justify-center">Entrar</UiButton>

    <!-- O convidado perdido continua chegando aqui, e continua sendo atendido —
         agora como segunda leitura, não como a única. -->
    <div class="border-t border-border pt-5">
      <p class="text-sm leading-relaxed text-text-muted">
        <span class="font-medium text-text">Você é convidado?</span>
        O site de cada casamento fica num endereço próprio, algo como
        <span class="font-medium text-text">meusitecasamento.com.br/nome-do-casal</span>. Use o link
        que você recebeu.
      </p>
    </div>
  </div>
</template>
