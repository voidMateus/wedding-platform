<!--
  A planta do salão: as mesas e os elementos nas coordenadas reais.

  TRÊS REGRAS QUE GOVERNAM ESTE COMPONENTE (docs/fase2-convidados.md, seção 3):

  1. **Arrastar posiciona a MESA; sentar é atributo da PESSOA.** A planta
     responde "como o salão está montado"; quem senta onde se resolve abrindo a
     mesa. Arrastar gente para dentro de círculos seria um segundo caminho para
     a mesma mutação.
  2. **A planta é a SEGUNDA representação, nunca a única.** A lista faz tudo, e
     é ela que funciona no celular e com leitor de tela. Aqui, o teclado faz o
     que o arrasto faz — setas movem, Enter abre — porque arrastar é o atalho
     de mouse, e atalho nunca pode ser a única forma de fazer algo.
  3. **Centímetro é a unidade, pixel é derivado.** Tudo que é gravado está em
     cm; a escala só existe na renderização. É o que faz a planta significar a
     mesma coisa em qualquer tela e conversar com a planta que o buffet mandou.

  `.client.vue`: depende de `matchMedia` e de medir o contêiner, e não tem o que
  renderizar no servidor.
-->
<script setup lang="ts">
import { limitarNaArea } from '#shared/utils/mesas'
import type { ElementoDaPlanta, MesaComOcupantes, SeatingResponse } from '~/types/mesa'

interface Props {
  mesas: MesaComOcupantes[]
  elementos: ElementoDaPlanta[]
  salao: SeatingResponse['salao']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  /** Uma peça foi solta numa posição nova — o pai persiste. */
  mover: [payload: { tipo: 'mesa' | 'elemento'; id: string; x: number; y: number }]
  abrirMesa: [id: string]
  abrirElemento: [id: string]
}>()

/** Passos do teclado, em centímetros. Shift é o ajuste fino. */
const PASSO_CM = 10
const PASSO_FINO_CM = 1

const palco = ref<HTMLElement | null>(null)
const viewport = ref<HTMLElement | null>(null)

/** Pixels por centímetro. 0.25 = 1 m vira 25 px, um salão de 20 m cabe em 500. */
const escala = ref(0.25)
const ESCALA_MIN = 0.08
const ESCALA_MAX = 0.8

/**
 * Arrastar só no desktop: num retângulo de 390 px, posicionar mesa arrastando é
 * pior que a lista — que já faz tudo. No celular a planta fica de leitura, com
 * toque para abrir a mesa.
 */
const podeArrastar = ref(false)

onMounted(async () => {
  podeArrastar.value = window.matchMedia('(min-width: 768px) and (pointer: fine)').matches
  // `nextTick` antes de medir: no `onMounted` o contêiner ainda não tem largura
  // final, e a conta dava uma escala presa no valor inicial — a planta abria
  // com as mesas do tamanho de moedas, e "Ajustar à tela" parecia não fazer
  // nada porque já estava "ajustada".
  await nextTick()
  ajustarATela()
})

function cm(valor: number): number {
  return valor * escala.value
}

/**
 * Escala que faz o salão INTEIRO caber — nos dois eixos.
 *
 * Ajustar só pela largura é o erro fácil: um salão de 10 × 8 m cabe na largura
 * e desce oitocentos pixels abaixo da dobra, e o casal precisa rolar para
 * descobrir que existem mesas lá embaixo. O menor dos dois fatores é o que
 * mostra tudo de uma vez, que é o que "ajustar à tela" promete.
 */
function ajustarATela() {
  const largura = viewport.value?.clientWidth
  const altura = viewport.value?.clientHeight
  if (!largura || !altura) return

  const alvo = Math.min(
    (largura - 32) / props.salao.areaLarguraCm,
    (altura - 32) / props.salao.areaProfundidadeCm,
  )
  escala.value = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, alvo))
}

function aproximar(fator: number) {
  escala.value = Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, escala.value * fator))
}

/**
 * Posição em curso do arrasto, por peça.
 *
 * Local enquanto o dedo/ponteiro está em movimento e só persistida ao SOLTAR:
 * salvar durante o movimento seria uma requisição a cada pixel, e o refetch
 * puxaria a peça de volta para a posição antiga no meio do gesto.
 */
const arrastando = ref<{ tipo: 'mesa' | 'elemento'; id: string; x: number; y: number } | null>(null)

const area = computed(() => ({
  larguraCm: props.salao.areaLarguraCm,
  profundidadeCm: props.salao.areaProfundidadeCm,
}))

function posicaoDe(peca: { id: string; posicaoXCm: number; posicaoYCm: number }) {
  const emCurso = arrastando.value
  if (emCurso?.id === peca.id) return { x: emCurso.x, y: emCurso.y }
  return { x: peca.posicaoXCm, y: peca.posicaoYCm }
}

let deslocamento = { x: 0, y: 0 }

/**
 * Um arrasto termina em `click` também — e sem esta marca, soltar a mesa no
 * lugar novo abriria o painel dela por cima, todas as vezes. O limite é em
 * CENTÍMETROS (não em pixels) para não depender do zoom: a mesma tremida de
 * mão vale mais pixels com a planta aproximada.
 */
const TOLERANCIA_DE_CLIQUE_CM = 3
let moveu = false

function aoPegar(
  evento: PointerEvent,
  tipo: 'mesa' | 'elemento',
  peca: { id: string; posicaoXCm: number; posicaoYCm: number },
) {
  if (!podeArrastar.value) return
  const alvo = evento.currentTarget as HTMLElement
  alvo.setPointerCapture(evento.pointerId)

  const caixa = palco.value?.getBoundingClientRect()
  if (!caixa) return

  // Guarda ONDE dentro da peça o ponteiro pegou: sem isto, a peça pularia para
  // ter o canto superior esquerdo sob o cursor no primeiro movimento.
  deslocamento = {
    x: (evento.clientX - caixa.left) / escala.value - peca.posicaoXCm,
    y: (evento.clientY - caixa.top) / escala.value - peca.posicaoYCm,
  }
  moveu = false
  arrastando.value = { tipo, id: peca.id, x: peca.posicaoXCm, y: peca.posicaoYCm }
}

function aoMover(
  evento: PointerEvent,
  peca: { larguraCm: number; profundidadeCm: number },
) {
  const emCurso = arrastando.value
  if (!emCurso) return
  const caixa = palco.value?.getBoundingClientRect()
  if (!caixa) return

  const bruto = {
    x: (evento.clientX - caixa.left) / escala.value - deslocamento.x,
    y: (evento.clientY - caixa.top) / escala.value - deslocamento.y,
  }
  const limitado = limitarNaArea(bruto, peca, area.value)
  if (
    Math.abs(limitado.x - emCurso.x) > TOLERANCIA_DE_CLIQUE_CM ||
    Math.abs(limitado.y - emCurso.y) > TOLERANCIA_DE_CLIQUE_CM
  ) {
    moveu = true
  }
  arrastando.value = { ...emCurso, x: limitado.x, y: limitado.y }
}

function aoSoltar() {
  const emCurso = arrastando.value
  arrastando.value = null
  if (!emCurso || !moveu) return
  emit('mover', emCurso)
}

/** Clique que fecha um arrasto não é clique: abriria o painel sem querer. */
function aoClicar(acao: () => void) {
  if (moveu) {
    moveu = false
    return
  }
  acao()
}

/** Teclado: o caminho equivalente ao arrasto, não um consolo. */
function aoTeclar(
  evento: KeyboardEvent,
  tipo: 'mesa' | 'elemento',
  peca: { id: string; posicaoXCm: number; posicaoYCm: number; larguraCm: number; profundidadeCm: number },
) {
  const passo = evento.shiftKey ? PASSO_FINO_CM : PASSO_CM
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-passo, 0],
    ArrowRight: [passo, 0],
    ArrowUp: [0, -passo],
    ArrowDown: [0, passo],
  }
  const movimento = delta[evento.key]
  if (!movimento) return

  evento.preventDefault()
  const limitado = limitarNaArea(
    { x: peca.posicaoXCm + movimento[0], y: peca.posicaoYCm + movimento[1] },
    peca,
    area.value,
  )
  emit('mover', { tipo, id: peca.id, x: limitado.x, y: limitado.y })
}

/**
 * A cor conta o estado da mesa: neutra com lugar, `success` cheia, `warning`
 * acima da capacidade. Tokens da plataforma, nunca `bg-red-500` e afins
 * (CLAUDE.md, seção 13).
 */
function classeDaMesa(mesa: MesaComOcupantes): string {
  if (mesa.resumo.excedente > 0) return 'border-warning bg-warning/15 text-warning'
  if (mesa.resumo.ocupacao === 0) return 'border-border bg-surface text-text-muted'
  if (mesa.resumo.livres === 0) return 'border-success bg-success/15 text-success'
  return 'border-primary/40 bg-primary/5 text-text'
}

const ROTULOS_DE_ELEMENTO: Record<string, string> = {
  pista: 'Pista',
  palco: 'Palco',
  buffet: 'Buffet',
  bolo: 'Bolo',
  entrada: 'Entrada',
  bar: 'Bar',
  outro: 'Outro',
}

/** Réguas de metro em metro — a medida que as pessoas usam para falar de salão. */
const marcasHorizontais = computed(() =>
  Array.from({ length: Math.floor(props.salao.areaLarguraCm / 100) + 1 }, (_, i) => i),
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <UiButton size="sm" variant="ghost" @click="aproximar(1.25)">
        <Icon name="lucide:zoom-in" class="h-4 w-4" />
        <span class="sr-only">Aproximar</span>
      </UiButton>
      <UiButton size="sm" variant="ghost" @click="aproximar(0.8)">
        <Icon name="lucide:zoom-out" class="h-4 w-4" />
        <span class="sr-only">Afastar</span>
      </UiButton>
      <UiButton size="sm" variant="ghost" @click="ajustarATela">Ajustar à tela</UiButton>

      <span class="ml-auto text-xs text-text-muted">
        {{ (salao.areaLarguraCm / 100).toFixed(1) }} × {{ (salao.areaProfundidadeCm / 100).toFixed(1) }} m
        <template v-if="!salao.definida"> · área ajustada ao conteúdo</template>
      </span>
    </div>

    <!-- A instrução existe porque o gesto não se anuncia sozinho — e diz as
         DUAS formas, não só a do mouse. -->
    <p class="text-xs text-text-muted">
      <template v-if="podeArrastar">
        Arraste para posicionar, ou use as setas com a mesa selecionada (Shift para 1 cm). Enter
        abre a mesa.
      </template>
      <template v-else>
        Toque numa mesa para abrir. Para posicionar as mesas na planta, use um computador.
      </template>
    </p>

    <!-- Altura limitada: a planta é uma vista, não um documento. Sem teto, um
         salão grande empurraria tudo que vem depois para fora da tela, e a
         rolagem da página se confundiria com a rolagem da planta. -->
    <div
      ref="viewport"
      class="h-[60vh] min-h-80 overflow-auto rounded-lg border border-border bg-surface-muted p-4"
    >
      <div
        ref="palco"
        class="relative shrink-0 rounded-md bg-surface"
        :class="salao.definida ? 'border-2 border-dashed border-border' : 'border border-border'"
        :style="{
          width: `${cm(salao.areaLarguraCm)}px`,
          height: `${cm(salao.areaProfundidadeCm)}px`,
        }"
      >
        <!-- Régua: metro a metro, discreta, aria-hidden porque é apoio visual e
             a medida já está escrita no cabeçalho. -->
        <span
          v-for="metro in marcasHorizontais"
          :key="metro"
          aria-hidden="true"
          class="absolute top-0 h-full border-l border-border/40"
          :style="{ left: `${cm(metro * 100)}px` }"
        />

        <!-- Elementos primeiro: eles são o fundo do salão, e a mesa por cima é
             o que se move. -->
        <button
          v-for="elemento in elementos"
          :key="elemento.id"
          type="button"
          class="absolute flex items-center justify-center rounded-md border border-dashed border-text/30 bg-text/5 text-[10px] uppercase tracking-wide text-text-muted transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="podeArrastar && 'cursor-move'"
          :style="{
            left: `${cm(posicaoDe(elemento).x)}px`,
            top: `${cm(posicaoDe(elemento).y)}px`,
            width: `${cm(elemento.larguraCm)}px`,
            height: `${cm(elemento.profundidadeCm)}px`,
            transform: `rotate(${elemento.rotacaoGraus}deg)`,
          }"
          :aria-label="`${ROTULOS_DE_ELEMENTO[elemento.tipo] ?? elemento.tipo}${elemento.nome ? ` — ${elemento.nome}` : ''}`"
          @pointerdown="aoPegar($event, 'elemento', elemento)"
          @pointermove="aoMover($event, elemento)"
          @pointerup="aoSoltar"
          @keydown="aoTeclar($event, 'elemento', elemento)"
          @click="aoClicar(() => emit('abrirElemento', elemento.id))"
        >
          {{ elemento.nome || ROTULOS_DE_ELEMENTO[elemento.tipo] }}
        </button>

        <button
          v-for="mesa in mesas"
          :key="mesa.id"
          type="button"
          class="absolute flex flex-col items-center justify-center border-2 px-1 text-center transition-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          :class="[
            classeDaMesa(mesa),
            mesa.formato === 'redonda' ? 'rounded-full' : 'rounded-md',
            podeArrastar && 'cursor-move',
          ]"
          :style="{
            left: `${cm(posicaoDe(mesa).x)}px`,
            top: `${cm(posicaoDe(mesa).y)}px`,
            width: `${cm(mesa.larguraCm)}px`,
            height: `${cm(mesa.profundidadeCm)}px`,
            transform: `rotate(${mesa.rotacaoGraus}deg)`,
          }"
          :aria-label="`${mesa.nome}: ${mesa.resumo.ocupacao} de ${mesa.capacidade} lugares`"
          @pointerdown="aoPegar($event, 'mesa', mesa)"
          @pointermove="aoMover($event, mesa)"
          @pointerup="aoSoltar"
          @keydown="aoTeclar($event, 'mesa', mesa)"
          @click="aoClicar(() => emit('abrirMesa', mesa.id))"
        >
          <!-- Com o zoom afastado a peça vira uma moeda, e texto ali é um
               borrão que estoura a forma. O rótulo some, o `aria-label` fica: o
               desenho continua legível e o leitor de tela não perde nada. -->
          <template v-if="cm(mesa.larguraCm) >= 70">
            <span class="w-full truncate text-[11px] font-medium leading-tight">
              {{ mesa.nome }}
            </span>
            <span class="num text-[10px] leading-tight">
              {{ mesa.resumo.ocupacao }}/{{ mesa.capacidade }}
            </span>
          </template>
          <span v-else class="num text-[10px] font-medium leading-none">
            {{ mesa.resumo.ocupacao }}
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
