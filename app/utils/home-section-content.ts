import {
  hasGroomsmenManualContent,
  hasVerseContent,
  resolveWeddingContent,
} from '#shared/wedding-content'

/**
 * Quais seções da home têm o que mostrar, por id.
 *
 * Existe porque a alternância de fundo precisa saber, ANTES de renderizar,
 * quantas seções de fato vão aparecer: se o Manual dos Padrinhos está vazio e
 * some, as seções ao redor dele passam a ser vizinhas e não podem repetir o
 * mesmo tom. Enquanto cada componente decidia sozinho no próprio `v-if`, essa
 * informação não existia fora dele.
 *
 * Os componentes MANTÊM seus `v-if` — este mapa não os substitui. É de
 * propósito: os predicados são os mesmos (`hasVerseContent` e companhia), então
 * não há duas regras para divergir, e uma seção montada isoladamente num teste
 * continua se comportando certo sem depender da página. O que a página ganha é
 * poder contar as seções; o que o componente mantém é não desenhar uma casca
 * vazia se alguém o usar fora daqui.
 *
 * Só entram aqui as seções que PODEM ficar vazias. Id ausente do mapa é lido
 * por resolveHomeSections como "sempre tem conteúdo".
 */
export function resolveHomeSectionContent(input: {
  contentConfig: unknown
  eventSegmentCount: number
  photoCount: number
}): Record<string, boolean> {
  const content = resolveWeddingContent(input.contentConfig)

  return {
    versiculo: hasVerseContent(content.verse),
    'grande-dia': input.eventSegmentCount > 0,
    'manual-convidados': content.guestManualTopics.length > 0,
    'manual-padrinhos': hasGroomsmenManualContent(content.groomsmenManual),
    'nossos-momentos': input.photoCount > 0,
    faq: content.faqItems.length > 0,
  }
}
