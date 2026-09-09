<script setup lang="ts">
// Rodapé com o mesmo tratamento editorial das seções (banda tonal, marca
// central, tipografia serifada) — antes era só uma linha de texto solta,
// destoando do resto do site (pedido do usuário: "nosso rodapé também
// precisa ser bonito de igual forma", referência de estilo mimodocasal.com.br).
import { primeirosNomesCasal } from '#shared/utils/nomes-casal'

interface Props {
  coupleNames?: string | null
  eventDate?: string | null
  /** Arte própria do monograma — sem ela, o PublicMonogram desenha as iniciais do casal. */
  monogramImageUrl?: string | null
}

const { coupleNames, eventDate, monogramImageUrl } = defineProps<Props>()

/**
 * Só os primeiros nomes, como na barra de navegação.
 *
 * O nome completo em corpo de display não cabe na coluna estreita do rodapé:
 * "Mateus Augusto & Raquel Júlia" quebrava deixando "Júlia" sozinha na segunda
 * linha, o que é pior que abreviar de propósito. O nome inteiro continua no
 * Hero, onde a linha tem a largura da página.
 */
const footerName = computed(() => primeirosNomesCasal(coupleNames) ?? coupleNames)

const formattedDate = computed(() =>
  eventDate
    ? new Date(`${eventDate}T00:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null,
)
</script>

<template>
  <!-- Fundo liso e a mesma troca seca de fundo das seções: no protótipo do
       convite o rodapé é uma última página em branco com a assinatura no
       meio, sem gradiente nem onda de transição. -->
  <footer class="bg-surface px-6 py-12 text-center">
    <div class="mx-auto flex max-w-md flex-col items-center gap-3">
      <!--
        O monograma assina o rodapé como assina o pé de cada página do convite
        (Fase Rebrand do Convite) — substitui o ícone genérico de brilho, que
        não dizia nada sobre este casamento em particular. Sem nome de casal
        para derivar iniciais, o PublicMonogram não desenha nada e o rodapé
        segue com o resto.
      -->
      <PublicMonogram :couple-names="coupleNames" :image-url="monogramImageUrl" size="lg" />
      <p v-if="footerName" class="font-display text-2xl text-balance text-heading">
        {{ footerName }}
      </p>
      <p v-if="formattedDate" class="text-xs tracking-[0.3em] text-text-muted uppercase">
        {{ formattedDate }}
      </p>
      <UiSectionDivider class="my-2" />
      <p class="text-xs text-text-muted">
        Feito com <span class="text-primary">♥</span> por MeuSiteCasamento
      </p>
    </div>
  </footer>
</template>
