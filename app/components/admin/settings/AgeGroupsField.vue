<!--
  Editor das faixas da classificação etária do evento.

  Duas coisas são configuráveis: QUAIS faixas o casamento usa e até que idade
  cada uma vai. Nem toda festa separa em quatro — muitas querem só "criança" e
  "adulto".

  Só as idades FINAIS são editáveis: a inicial de cada faixa é sempre a final da
  anterior + 1, recalculada aqui a cada mudança. É o que torna impossível montar
  "Criança 0–7 / Adolescente 5–17" (sobreposição) ou "Criança 0–7 / Adolescente
  10–17" (idades 8 e 9 sem faixa) pela interface — a mesma regra que o servidor
  revalida em shared/schemas/wedding.ts, porque a interface nunca é a garantia.

  Desligar uma faixa NÃO é só removê-la: a vizinha mais nova herda o território
  dela (desligar Adolescente estica Criança até 17). Sem essa herança, um
  convidado de 14 anos deixaria de casar com qualquer faixa e viraria "não
  informada" em silêncio, na lista inteira.
-->
<script setup lang="ts">
import type { FaixaEtariaInput } from '#shared/schemas/wedding'
import {
  FAIXAS_ETARIAS_PADRAO,
  FAIXA_ETARIA_CHAVES,
  FAIXA_ETARIA_ROTULOS,
  MIN_FAIXAS_ETARIAS_ATIVAS,
  type FaixaEtariaChave,
} from '#shared/utils/faixa-etaria'

interface Props {
  modelValue: FaixaEtariaInput[] | undefined
  error?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ 'update:modelValue': [value: FaixaEtariaInput[]] }>()

/** O array É a lista de faixas ativas — faixa desligada é faixa ausente. */
const ativas = computed<FaixaEtariaInput[]>(
  () => props.modelValue ?? FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
)

function limitePadrao(chave: FaixaEtariaChave): number | null {
  return FAIXAS_ETARIAS_PADRAO.find((faixa) => faixa.chave === chave)?.idadeMaxima ?? null
}

/**
 * Recompõe as idades iniciais em cascata a partir das finais, e garante que a
 * última faixa fique aberta no topo — sem isso a classificação teria teto e
 * ninguém acima dele seria classificado.
 *
 * `indiceEditado` é a faixa em que o casal está digitando: ela mantém o número
 * digitado, senão o valor mudaria embaixo do cursor. Nas trocas de ligar/
 * desligar não há ninguém digitando, e o default -1 desliga essa exceção.
 */
function comCascata(lista: FaixaEtariaInput[], indiceEditado = -1): FaixaEtariaInput[] {
  const resultado = lista.map((faixa) => ({ ...faixa }))
  let proximaMinima = 0
  resultado.forEach((faixa, i) => {
    faixa.idadeMinima = proximaMinima
    if (i === resultado.length - 1) {
      faixa.idadeMaxima = null
      return
    }
    // Esticar uma faixa por cima da seguinte empurra a seguinte, em vez de
    // deixar a tela num estado inválido que o casal teria que consertar à mão
    // (subir Criança para 17 deixava Adolescente em 18–17).
    if (
      i > indiceEditado &&
      typeof faixa.idadeMaxima === 'number' &&
      faixa.idadeMaxima < faixa.idadeMinima
    ) {
      faixa.idadeMaxima = faixa.idadeMinima
    }
    // Enquanto o casal digita, a idade final pode estar vazia ou abaixo da
    // inicial: mantém o que ele digitou (o erro do schema explica o problema) e
    // só avança a cascata quando o valor faz sentido.
    proximaMinima =
      typeof faixa.idadeMaxima === 'number' && faixa.idadeMaxima >= faixa.idadeMinima
        ? faixa.idadeMaxima + 1
        : faixa.idadeMinima
  })
  return resultado
}

interface LinhaDaFaixa {
  chave: FaixaEtariaChave
  rotulo: string
  ativa: boolean
  faixa: FaixaEtariaInput | null
  ehUltimaAtiva: boolean
  podeDesligar: boolean
  /** Vazio quando pode desligar — vira `title` do controle. */
  motivo: string
}

const linhas = computed<LinhaDaFaixa[]>(() =>
  FAIXA_ETARIA_CHAVES.map((chave) => {
    const indice = ativas.value.findIndex((faixa) => faixa.chave === chave)
    const ativa = indice >= 0
    const noMinimo = ativas.value.length <= MIN_FAIXAS_ETARIAS_ATIVAS

    // A primeira faixa ATIVA nunca desliga: a herança é sempre para baixo, e
    // abaixo dela não há ninguém para receber a idade 0.
    let motivo = ''
    if (ativa && indice === 0) motivo = 'Alguém precisa cobrir a idade 0 — esta faixa fica.'
    else if (ativa && noMinimo) {
      motivo = `A classificação precisa de pelo menos ${MIN_FAIXAS_ETARIAS_ATIVAS} faixas.`
    }

    return {
      chave,
      rotulo: FAIXA_ETARIA_ROTULOS[chave],
      ativa,
      faixa: ativa ? ativas.value[indice]! : null,
      ehUltimaAtiva: ativa && indice === ativas.value.length - 1,
      podeDesligar: ativa && !motivo,
      motivo,
    }
  }),
)

function updateIdadeMaxima(chave: FaixaEtariaChave, texto: string) {
  const indice = ativas.value.findIndex((faixa) => faixa.chave === chave)
  if (indice < 0) return
  const valor = texto === '' ? null : Number(texto)
  const atualizadas = ativas.value.map((faixa, i) =>
    i === indice ? { ...faixa, idadeMaxima: valor } : { ...faixa },
  )
  emit('update:modelValue', comCascata(atualizadas, indice))
}

function desligar(chave: FaixaEtariaChave) {
  const indice = ativas.value.findIndex((faixa) => faixa.chave === chave)
  if (indice <= 0) return
  const removida = ativas.value[indice]!
  const restantes = ativas.value.filter((faixa) => faixa.chave !== chave).map((f) => ({ ...f }))
  // A vizinha mais nova herda o topo da removida — é isto que fecha o vão.
  // Desligando a última, ela herda o `null` e passa a ser a aberta no topo.
  restantes[indice - 1]!.idadeMaxima = removida.idadeMaxima
  emit('update:modelValue', comCascata(restantes))
}

function ligar(chave: FaixaEtariaChave) {
  const posicao = FAIXA_ETARIA_CHAVES.indexOf(chave)
  // Quem tinha absorvido o território é a ativa imediatamente abaixo: ela volta
  // ao corte padrão dela, porque o limite que está lá hoje é o da faixa que
  // estava desligada.
  const absorvedora = [...ativas.value]
    .reverse()
    .find((faixa) => FAIXA_ETARIA_CHAVES.indexOf(faixa.chave) < posicao)

  const remontadas = FAIXA_ETARIA_CHAVES.filter(
    (candidata) => candidata === chave || ativas.value.some((faixa) => faixa.chave === candidata),
  ).map((candidata) => {
    if (candidata === chave) {
      return { chave, idadeMinima: 0, idadeMaxima: limitePadrao(chave) }
    }
    const existente = ativas.value.find((faixa) => faixa.chave === candidata)!
    return candidata === absorvedora?.chave
      ? { ...existente, idadeMaxima: limitePadrao(candidata) }
      : { ...existente }
  })
  emit('update:modelValue', comCascata(remontadas))
}

function restoreDefault() {
  emit(
    'update:modelValue',
    FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
  )
}
</script>

<template>
  <!--
    O rótulo do grupo é "Faixas de idade", não "Classificação etária": o cartão
    da seção já se chama assim, e repetir o título dentro dele faz a tela
    parecer ter duas seções aninhadas.
  -->
  <AdminSettingsField label="Faixas de idade">
    <p class="text-xs leading-relaxed text-text-muted">
      Desmarque a faixa que este casamento não usa. A faixa de baixo assume as idades dela — nunca
      fica idade sem classificação.
    </p>

    <!--
      As quatro faixas do catálogo aparecem SEMPRE, marcadas ou não: escondendo
      as desligadas, não haveria de onde religá-las.
    -->
    <ul class="divide-y divide-border overflow-hidden rounded-md border border-border">
      <li
        v-for="linha in linhas"
        :key="linha.chave"
        class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-4 sm:px-4 sm:py-2.5"
      >
        <!-- O rótulo da caixa É o nome da faixa: uma caixa sem rótulo próprio
             não tem nome acessível, e um <span> ao lado não a nomeia. -->
        <span :title="linha.motivo || undefined" class="flex items-center">
          <UiCheckbox
            :model-value="linha.ativa"
            :label="linha.rotulo"
            :disabled="linha.ativa && !linha.podeDesligar"
            @update:model-value="linha.ativa ? desligar(linha.chave) : ligar(linha.chave)"
          />
        </span>

        <!-- Largura fixa a partir de sm: é o que alinha "de N", o campo e
             "anos" entre as linhas, inclusive as que não têm campo. -->
        <div class="flex items-center gap-2 text-sm text-text-muted sm:w-60">
          <template v-if="!linha.ativa">
            <span class="text-xs">não usada neste casamento</span>
          </template>

          <template v-else-if="linha.ehUltimaAtiva">
            <span class="whitespace-nowrap">
              de
              <span class="num inline-block w-5 text-right font-medium text-text">
                {{ linha.faixa!.idadeMinima }}</span
              >
            </span>
            <span class="whitespace-nowrap">anos ou mais</span>
          </template>

          <template v-else>
            <span class="whitespace-nowrap">
              de
              <span class="num inline-block w-5 text-right font-medium text-text">
                {{ linha.faixa!.idadeMinima }}</span
              >
            </span>
            <span>até</span>
            <UiInput
              :model-value="
                linha.faixa!.idadeMaxima === null ? '' : String(linha.faixa!.idadeMaxima)
              "
              type="number"
              :aria-label="`Idade final da faixa ${linha.rotulo}`"
              class="w-20"
              @update:model-value="updateIdadeMaxima(linha.chave, $event)"
            />
            <span>anos</span>
          </template>
        </div>
      </li>
    </ul>

    <p v-if="error" class="text-sm text-danger" role="alert">{{ error }}</p>

    <UiButton type="button" size="sm" variant="ghost" class="self-start" @click="restoreDefault">
      Restaurar classificação padrão
    </UiButton>
  </AdminSettingsField>
</template>
