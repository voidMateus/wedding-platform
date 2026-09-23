import { HOME_SECTION_CATALOG } from './home-sections'

/**
 * O site como Save the Date — o que ligar para que ele seja um.
 *
 * O produto já sabia fazer isso desde que a contagem regressiva e o cronograma
 * existem: capa com os nomes e a data, quanto falta, onde vai ser. O que não
 * existia era o CAMINHO — as seções nascem todas desligadas (decisão de
 * 2026-09-14, `CLAUDE.md` seção 12), então só chegava lá quem já soubesse
 * montar sozinho (rodada de usabilidade de 20/09/2026, ponto 28).
 *
 * **Não é uma seção nova**, e não podia ser: o catálogo de `home-sections.ts` é
 * fonte única, e seção nova entraria no site de todo mundo pela regra de lá.
 * Isto é uma COMBINAÇÃO do que já existe.
 *
 * **Também não é um preset de tema.** `THEME_PRESETS` decide cor e tipografia —
 * a identidade visual do casal. Misturar "quais seções aparecem" ali faria
 * trocar de paleta mexer no conteúdo do site, que é exatamente o tipo de efeito
 * colateral que ninguém procura quando escolhe uma cor.
 */
export const SECOES_DO_SAVE_THE_DATE = [
  // Quem está casando, dito por extenso logo abaixo da capa.
  'boas-vindas',
  // Quando e onde. É a única seção com data, hora e mapa — sem ela o aviso não
  // diz o que um save the date existe para dizer.
  'grande-dia',
] as const

/**
 * A contagem regressiva não é seção: mora em `config_tema.showCountdown` e é
 * desenhada pela própria capa. Ela entra no combo porque é o que transforma uma
 * data numa expectativa — e é ela que faz a capa valer um print no WhatsApp.
 */
export const SAVE_THE_DATE_LIGA_CONTAGEM = true

export interface MudancaDoSaveTheDate {
  /** As seções que serão ligadas — só as que ainda não estão. */
  secoesParaLigar: string[]
  /** Rótulos das que já estavam ligadas, para a prévia não prometer o que não muda. */
  jaLigadas: string[]
  ligaContagem: boolean
}

/**
 * O que o combo faria, sem fazer.
 *
 * A prévia existe porque aplicar mexe no site que já está no ar: o casal
 * precisa ver o que muda ANTES, e precisa ver que nada é desligado — o combo
 * só acrescenta, nunca apaga uma seção que o casal tenha escolhido.
 */
export function simularSaveTheDate(
  ativas: readonly string[],
  contagemLigada: boolean,
): MudancaDoSaveTheDate {
  const rotulo = (id: string) => HOME_SECTION_CATALOG.find((secao) => secao.id === id)?.label ?? id

  return {
    secoesParaLigar: SECOES_DO_SAVE_THE_DATE.filter((id) => !ativas.includes(id)).map(rotulo),
    jaLigadas: SECOES_DO_SAVE_THE_DATE.filter((id) => ativas.includes(id)).map(rotulo),
    ligaContagem: SAVE_THE_DATE_LIGA_CONTAGEM && !contagemLigada,
  }
}

/**
 * As seções depois de aplicar — a união, na ordem do catálogo.
 *
 * União e não substituição: quem já tinha "Nossa História" ligada não a perde
 * por pedir um save the date. Desligar o que o casal escolheu seria uma
 * surpresa cara, e o combo não tem informação para decidir isso por ele.
 */
export function aplicarSaveTheDate(ativas: readonly string[]): string[] {
  const uniao = new Set([...ativas, ...SECOES_DO_SAVE_THE_DATE])
  return HOME_SECTION_CATALOG.filter((secao) => uniao.has(secao.id)).map((secao) => secao.id)
}
