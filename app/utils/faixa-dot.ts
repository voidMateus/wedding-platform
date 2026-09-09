import { FAIXA_ETARIA_NAO_INFORMADA } from '#shared/utils/faixa-etaria'

/**
 * Classe do pontinho que identifica uma faixa etária nos contadores.
 *
 * Opacidades da cor primária do casamento, e não uma paleta própria: cor
 * arbitrária escrita no componente é proibida (DESIGN-SYSTEM.md, seção 3.3), e
 * verde/laranja/roxo aqui também colidiriam com o mapa de estados da
 * plataforma, onde cor já significa sucesso/atenção/erro. Faixa etária não é
 * um estado — é uma partição —, então o que distingue é a intensidade, não o
 * matiz.
 *
 * Da mais nova para a mais velha, o ponto escurece; "não informada" fica no
 * cinza da borda, que é a leitura certa para ausência de dado.
 */
const CLASSE_POR_FAIXA: Record<string, string> = {
  crianca: 'bg-primary/30',
  adolescente: 'bg-primary/50',
  adulto: 'bg-primary/75',
  idoso: 'bg-primary',
  [FAIXA_ETARIA_NAO_INFORMADA]: 'bg-border',
}

export function classeDoPontoDeFaixa(chave: string): string {
  return CLASSE_POR_FAIXA[chave] ?? 'bg-border'
}
