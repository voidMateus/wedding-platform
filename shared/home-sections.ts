// Catálogo fixo das seções da home do site público — a fonte única de onde
// saem três coisas que precisam concordar entre si (Fase Rebrand do Convite):
// a ORDEM em que os capítulos aparecem, QUAIS deles aparecem, e a lista de
// atalhos que o Hero oferece. Mantê-las em listas separadas foi exatamente o
// que produziu, na primeira rodada desta fase, um catálogo de atalhos com oito
// entradas para onze seções.
//
// O catálogo em si não é editável — só a ordem e a visibilidade, salvas em
// `config_tema.sectionOrder`/`hiddenSections`. Um id desconhecido (removido do
// catálogo depois de salvo) é ignorado sem quebrar a página.
//
// O Hero fica deliberadamente FORA daqui: ele não é um capítulo da narrativa,
// é a capa — sempre primeiro, nunca reordenável, nunca ocultável.

/**
 * Tom de fundo da seção.
 *
 * `alternating` é a maioria: o tom real (off-white ou bege) é decidido pela
 * POSIÇÃO da seção entre as visíveis, não fixado no componente — ver
 * resolveHomeSections(). Fixá-lo por componente é o que fazia duas seções
 * seguidas caírem no mesmo fundo assim que o casal reordenava a página.
 *
 * `primary` e `accent` são pontos fixos da narrativa: a faixa cheia do
 * Versículo e a banda de destaque do RSVP não são "mais uma seção clara", são
 * pausas deliberadas. Elas não entram na alternância nem a interrompem.
 */
export type HomeSectionToneMode = 'alternating' | 'primary' | 'accent'

/** Tom já resolvido, no vocabulário que PublicEditorialSection entende. */
export type HomeSectionTone = 'default' | 'muted' | 'accent' | 'primary'

export interface HomeSectionDefinition {
  id: string
  /** Nome como o casal vê na lista de ordenação do admin. */
  label: string
  /** Onde o texto daquela seção é editado — a dúvida real ao reordenar é "qual destas é aquela?". */
  hint: string
  toneMode: HomeSectionToneMode
  /** Rótulo do atalho no Hero — mais curto e mais direto que o `label` da lista de ordenação. */
  shortcutLabel: string
  /**
   * Rótulo do mesmo atalho na BARRA de navegação, onde o espaço é disputado
   * por cinco destinos e a marca do casal. Ausente, usa o `shortcutLabel`.
   *
   * Existe porque os dois contextos pedem coisas diferentes: no Hero, "Ver
   * lista de presentes" é um convite; na barra, ele empurra o nome do casal
   * para as reticências e "Presentear" diz o mesmo em um terço da largura.
   */
  navLabel?: string
  /** Ícone lucide do atalho no Hero. */
  shortcutIcon: string
  /**
   * Destino do atalho. Quase toda seção é uma âncora na própria home; as duas
   * que têm página dedicada apontam para ela, porque mandar o convidado para
   * um teaser que só tem um botão custaria um clique a mais.
   */
  shortcutHref: string
}

export const HOME_SECTION_CATALOG: HomeSectionDefinition[] = [
  {
    id: 'boas-vindas',
    label: 'Boas-vindas',
    hint: 'Primeiro texto depois da capa.',
    toneMode: 'alternating',
    shortcutLabel: 'Boas-vindas',
    shortcutIcon: 'lucide:hand-heart',
    shortcutHref: '/#boas-vindas',
  },
  {
    id: 'versiculo',
    label: 'Versículo',
    hint: 'Faixa cheia na cor primária, com texto em dourado.',
    toneMode: 'primary',
    shortcutLabel: 'Versículo',
    shortcutIcon: 'lucide:quote',
    shortcutHref: '/#versiculo',
  },
  {
    id: 'historia',
    label: 'Nossa História',
    hint: 'Como vocês se conheceram.',
    toneMode: 'alternating',
    shortcutLabel: 'Nossa história',
    shortcutIcon: 'lucide:heart',
    shortcutHref: '/#historia',
  },
  {
    id: 'grande-dia',
    label: 'O Grande Dia',
    hint: 'Cerimônia e recepção, com horário e mapa.',
    toneMode: 'alternating',
    shortcutLabel: 'O Grande Dia',
    shortcutIcon: 'lucide:calendar-clock',
    shortcutHref: '/#grande-dia',
  },
  {
    id: 'confirmar-presenca',
    label: 'Confirme sua Presença',
    hint: 'Chamada para o RSVP.',
    toneMode: 'accent',
    shortcutLabel: 'Confirmar presença',
    shortcutIcon: 'lucide:check',
    // Vai direto para a busca de RSVP, não para o cartão informativo da home.
    shortcutHref: '/rsvp',
  },
  {
    id: 'dress-code',
    label: 'Dress Code',
    hint: 'Orientação de traje.',
    toneMode: 'alternating',
    shortcutLabel: 'Dress code',
    shortcutIcon: 'lucide:shirt',
    shortcutHref: '/#dress-code',
  },
  {
    id: 'manual-convidados',
    label: 'Manual dos Convidados',
    hint: 'Informações práticas do dia.',
    toneMode: 'alternating',
    shortcutLabel: 'Manual do convidado',
    shortcutIcon: 'lucide:info',
    shortcutHref: '/#manual-convidados',
  },
  {
    id: 'manual-padrinhos',
    label: 'Manual dos Padrinhos',
    hint: 'Traje dos padrinhos e paleta de cores.',
    toneMode: 'alternating',
    shortcutLabel: 'Manual dos padrinhos',
    navLabel: 'Padrinhos',
    shortcutIcon: 'lucide:users',
    shortcutHref: '/#manual-padrinhos',
  },
  {
    id: 'presentes',
    label: 'Lista de Presentes',
    hint: 'Chamada para a página de presentes.',
    toneMode: 'alternating',
    shortcutLabel: 'Ver lista de presentes',
    navLabel: 'Presentear',
    shortcutIcon: 'lucide:gift',
    // Página dedicada, como o RSVP.
    shortcutHref: '/presentes',
  },
  {
    id: 'nossos-momentos',
    label: 'Nossos Momentos',
    hint: 'Prévia da galeria de fotos.',
    toneMode: 'alternating',
    shortcutLabel: 'Nossos Momentos',
    shortcutIcon: 'lucide:image',
    shortcutHref: '/#nossos-momentos',
  },
  {
    id: 'faq',
    label: 'Perguntas Frequentes',
    hint: 'Dúvidas comuns dos convidados.',
    toneMode: 'alternating',
    shortcutLabel: 'Perguntas frequentes',
    navLabel: 'Dúvidas',
    shortcutIcon: 'lucide:help-circle',
    shortcutHref: '/#faq',
  },
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

export interface ResolvedHomeSection {
  id: string
  definition: HomeSectionDefinition
  tone: HomeSectionTone
}

export interface ResolveHomeSectionsInput {
  /** `config_tema.sectionOrder`. */
  order: string[] | undefined
  /** `config_tema.hiddenSections` — seções que o casal desligou explicitamente. */
  hidden: string[] | undefined
  /**
   * Por id: a seção tem o que mostrar? Só precisa listar as que podem ficar
   * vazias (Manual, FAQ, Galeria, Versículo, Manual dos Padrinhos, O Grande
   * Dia). Id ausente do mapa é tratado como "sempre tem conteúdo".
   *
   * Quem responde isso é a página, que já carregou o casamento, as fotos e o
   * cronograma. Antes cada componente decidia sozinho no próprio `v-if`, e por
   * isso ninguém conseguia saber, de fora, quantas seções de fato iam aparecer
   * — que é exatamente a informação de que a alternância de fundo precisa.
   */
  hasContent: Record<string, boolean>
}

/**
 * A lista final de seções a desenhar, cada uma já com o tom de fundo resolvido.
 *
 * Duas seções seguidas nunca caem no mesmo fundo, porque o tom sai da posição
 * entre as VISÍVEIS — não de um valor fixo no componente. Com a ordem e a
 * visibilidade nas mãos do casal, qualquer par de seções pode acabar
 * adjacente, e um tom fixo por componente torna a repetição questão de tempo.
 *
 * Versículo e RSVP têm tom próprio e ficam fora do revezamento: são pausas
 * deliberadas, não "mais uma seção clara". Também não avançam o contador — o
 * que a alternância evita é duas seções CLARAS iguais coladas, e uma faixa
 * escura entre elas não muda esse risco.
 */
export function resolveHomeSections(input: ResolveHomeSectionsInput): ResolvedHomeSection[] {
  const hidden = new Set(input.hidden ?? [])
  const resolved: ResolvedHomeSection[] = []
  let alternatingIndex = 0

  for (const id of resolveHomeSectionOrder(input.order)) {
    const definition = findHomeSection(id)
    if (!definition) continue
    if (hidden.has(id)) continue
    if (input.hasContent[id] === false) continue

    if (definition.toneMode === 'alternating') {
      resolved.push({
        id,
        definition,
        tone: alternatingIndex % 2 === 0 ? 'default' : 'muted',
      })
      alternatingIndex += 1
      continue
    }

    resolved.push({ id, definition, tone: definition.toneMode })
  }

  return resolved
}
