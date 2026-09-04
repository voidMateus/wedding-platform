<script setup lang="ts">
import { formatCentsToBRL } from '#shared/utils/format-currency'

// Tela de retorno do checkout online (CLAUDE.md, seção 18/28) — funciona
// como "pull": mesmo que o webhook da InfinitePay já tenha confirmado,
// chamar getPaymentStatus aqui reforça a confirmação (idempotente) e cobre
// o caso do webhook nunca chegar. Sempre noindex — o próprio `paymentId`
// (UUID, gerado por nós no checkout) já funciona como credencial de acesso,
// sem precisar de token de convite (CLAUDE.md, seção 18.2/4.5).
definePageMeta({ layout: 'default' })
useSeoMeta({ title: 'Pagamento', robots: 'noindex, nofollow' })

const route = useRoute()
const slug = useWeddingSlug()
const paymentId = route.params.paymentId as string

// A InfinitePay anexa transaction_nsu/slug na querystring do redirect de
// volta ao site (CLAUDE.md, seção 18.4/28.3) — achado real, necessários pro
// payment_check confirmar de fato (order_nsu sozinho não é suficiente). Só
// chegam na primeira carga da página; o servidor persiste pra reaproveitar
// nas tentativas seguintes do polling, mesmo sem esses query params.
const paymentHints = {
  transactionNsu:
    typeof route.query.transaction_nsu === 'string' ? route.query.transaction_nsu : undefined,
  slug: typeof route.query.slug === 'string' ? route.query.slug : undefined,
}

const { result, loadError } = useGiftPaymentPolling(paymentId, paymentHints)

const backLink = computed(() => `/${slug}/presentes`)
</script>

<template>
  <div class="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
    <template v-if="!result && !loadError">
      <UiSkeleton class="h-14 w-14 rounded-full" />
      <p class="text-sm text-text-muted">Confirmando seu pagamento…</p>
    </template>

    <template v-else-if="loadError && !result">
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger"
      >
        <Icon name="lucide:alert-triangle" class="h-6 w-6" />
      </span>
      <h1 class="font-display text-2xl font-semibold text-heading">Não conseguimos confirmar</h1>
      <p class="text-sm text-text-muted">
        Houve um problema ao consultar o pagamento. Se você já pagou, ele será confirmado em breve.
      </p>
    </template>

    <template v-else-if="result?.status === 'confirmado'">
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon name="lucide:heart" class="h-6 w-6" />
      </span>
      <h1 class="font-display text-2xl font-semibold text-heading">Obrigado!</h1>
      <p class="text-sm text-text-muted">
        Seu presente ({{ result.giftTitle }}, {{ formatCentsToBRL(result.amountCents) }}) foi
        recebido.
      </p>
    </template>

    <template v-else-if="result?.status === 'falhou'">
      <span
        class="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger"
      >
        <Icon name="lucide:alert-triangle" class="h-6 w-6" />
      </span>
      <h1 class="font-display text-2xl font-semibold text-heading">Pagamento recebido, mas...</h1>
      <p class="text-sm text-text-muted">
        Seu pagamento foi confirmado, mas não conseguimos reservar o presente automaticamente
        (provavelmente esgotou nesse meio-tempo). Fale com o casal para resolver.
      </p>
    </template>

    <template v-else>
      <UiSkeleton class="h-14 w-14 rounded-full" />
      <p class="text-sm text-text-muted">
        Ainda estamos confirmando seu pagamento — isso pode levar alguns instantes.
      </p>
    </template>

    <UiButton :to="backLink" variant="ghost" class="mt-4">Voltar aos presentes</UiButton>
  </div>
</template>
