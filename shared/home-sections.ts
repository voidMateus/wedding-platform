// Catálogo fixo das seções da home do site público e resolução da ordem
// escolhida pelo casal (config_tema.sectionOrder — Fase Rebrand do Convite).
// Mesmo contrato de shared/hero-buttons.ts: o CATÁLOGO não é editável, só a
// ordem. Um id desconhecido (removido do catálogo depois de salvo) é
// ignorado sem quebrar a página.
//
// O Hero fica deliberadamente FORA daqui: ele não é um capítulo da narrativa,
// é a capa — sempre primeiro, nunca reordenável.
//
// Visibilidade também não vive aqui. Seção sem conteúdo já se esconde sozinha
// (Manual, FAQ, Galeria e as duas novas usam `v-if` no próprio componente), e
// esvaziar o texto continua sendo a forma de remover uma seção — um segundo
// mecanismo de "ocultar" na tela de ordem daria dois jeitos de fazer a mesma
// coisa, com dois estados para manter em sincronia.

export interface HomeSectionDefinition {
  id: string
  /** Nome como o casal vê na lista de ordenação do admin. */
  label: string
  /** Onde o texto daquela seção é editado — a dúvida real ao reordenar é "qual destas é aquela?". */
  hint: string
}

export const HOME_SECTION_CATALOG: HomeSectionDefinition[] = [
  { id: 'boas-vindas', label: 'Boas-vindas', hint: 'Primeiro texto depois da capa.' },
  {
    id: 'versiculo',
    label: 'Versículo',
    hint: 'Faixa cheia na cor primária, com texto em dourado.',
  },
  { id: 'historia', label: 'Nossa História', hint: 'Como vocês se conheceram.' },
  { id: 'grande-dia', label: 'O Grande Dia', hint: 'Cerimônia e recepção, com horário e mapa.' },
  { id: 'confirmar-presenca', label: 'Confirme sua Presença', hint: 'Chamada para o RSVP.' },
  { id: 'dress-code', label: 'Dress Code', hint: 'Orientação de traje.' },
  { id: 'manual-convidados', label: 'Manual dos Convidados', hint: 'Informações práticas do dia.' },
  {
    id: 'manual-padrinhos',
    label: 'Manual dos Padrinhos',
    hint: 'Traje dos padrinhos e paleta de cores.',
  },
  { id: 'presentes', label: 'Lista de Presentes', hint: 'Chamada para a página de presentes.' },
  { id: 'nossos-momentos', label: 'Nossos Momentos', hint: 'Prévia da galeria de fotos.' },
  { id: 'faq', label: 'Perguntas Frequentes', hint: 'Dúvidas comuns dos convidados.' },
]

/**
 * Ordem padrão da narrativa (Fase Rebrand do Convite) — a mesma sequência do
 * protótipo aprovado: o Versículo entra como respiro logo depois das
 * boas-vindas, o RSVP sobe para logo após "O Grande Dia" (a pergunta vem
 * enquanto o convidado acabou de ler onde e quando), e a Galeria passa a
 * fechar a página antes do FAQ.
 *
 * É a ordem do catálogo, e não uma lista à parte: duas listas manuais para
 * manter em sincronia é exatamente o tipo de coisa que sai do ar sem ninguém
 * notar.
 */
export const DEFAULT_SECTION_ORDER = HOME_SECTION_CATALOG.map((section) => section.id)

export function findHomeSection(id: string): HomeSectionDefinition | undefined {
  return HOME_SECTION_CATALOG.find((section) => section.id === id)
}

/**
 * Resolve a ordem final das seções a partir do que o casal salvou.
 *
 * Três garantias que a lista salva sozinha não dá:
 * - id que não existe mais no catálogo é descartado (nunca renderiza nada);
 * - id repetido só vale a primeira vez — uma seção nunca é desenhada duas
 *   vezes na mesma página, mesmo que a lista salva venha corrompida;
 * - seção do catálogo AUSENTE da lista salva é anexada no fim, na ordem do
 *   catálogo. É o que impede uma seção lançada depois de o casal ter salvo a
 *   ordem de simplesmente nunca aparecer no site dele — sem isso, cada seção
 *   nova da plataforma nasceria invisível para todo mundo que já personalizou.
 */
export function resolveHomeSectionOrder(savedOrder: string[] | undefined): string[] {
  if (!savedOrder) return [...DEFAULT_SECTION_ORDER]

  const seen = new Set<string>()
  const known: string[] = []
  for (const id of savedOrder) {
    if (seen.has(id) || findHomeSection(id) === undefined) continue
    seen.add(id)
    known.push(id)
  }

  const missing = HOME_SECTION_CATALOG.filter((section) => !seen.has(section.id)).map(
    (section) => section.id,
  )

  return [...known, ...missing]
}
