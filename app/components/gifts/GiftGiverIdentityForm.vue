<script setup lang="ts">
// Passo de identificação antes de escolher a forma de presentear (CLAUDE.md,
// seção 18) — o token de acesso identifica só o convite, não a pessoa.
// Self-contained: lê/escreve o estado compartilhado da sessão diretamente
// (useGiftGiverIdentity), em vez de props/emits de v-model — reutilizado
// igual nos dois modais (GiftDeliveryChoiceModal/GiftPaymentModal).

const identity = useGiftGiverIdentity()
const showError = ref(false)

const emit = defineEmits<{ continue: [] }>()

function handleContinue() {
  if (!identity.value.name.trim()) {
    showError.value = true
    return
  }
  showError.value = false
  emit('continue')
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-text-muted">Antes de continuar, como podemos te chamar?</p>
    <UiInput
      v-model="identity.name"
      label="Seu nome"
      placeholder="Nome completo"
      :error="showError ? 'Informe seu nome.' : undefined"
    />
    <UiInput v-model="identity.phone" label="Telefone (opcional)" placeholder="(11) 99999-9999" />
    <UiButton class="w-full" @click="handleContinue">Continuar</UiButton>
  </div>
</template>
