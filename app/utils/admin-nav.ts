/**
 * A navegação do painel, em dados.
 *
 * Dois níveis, e a distinção importa: a **nav primária** responde "onde estou
 * no painel" (Início, Convidados, Presentes...), e o **menu da seção** responde
 * "como estou olhando esta parte" (Visão Geral, Modo lista, Grupos...).
 * Enquanto as duas coisas dividiam uma sidebar só, trocar de forma de ver a
 * lista parecia trocar de área do sistema.
 *
 * Em dados, e não em marcação, porque a mesma lista alimenta três desenhos
 * diferentes: nav no topo (desktop), barra de abas inferior (celular) e menu da
 * seção (coluna no desktop, fileira rolável no celular). Escrever isso três
 * vezes garantiria que divergissem na primeira mudança.
 */

export interface AdminNavItem {
  label: string
  icon: string
  /** Ausente = item ainda sem página (aparece, não navega). */
  to?: string
  /** Query que o destino aplica, e que precisa estar aplicada para ele acender. */
  query?: { chave: string; valor: string }
  /** Só acende com o caminho exato — para o item que é a raiz de uma seção. */
  exact?: boolean
  /**
   * Chaves de query que apagam este item porque um irmão as reivindica. Sem
   * isso, "Visão Geral" ficaria aceso junto de "Importar", que é a mesma
   * rota com `?importar=1`.
   */
  desativadoPor?: readonly string[]
  /** Motivo de o item não navegar, mostrado no title. */
  indisponivel?: string
  /**
   * Outros caminhos que este item da nav primária também possui — é o que faz
   * "Convidados" continuar aceso em `/grupos` e `/convites`, que são telas do
   * módulo dele e não têm aba própria no topo. Sem isso o operador ficaria
   * dentro de um módulo sem nenhuma aba primária acesa.
   */
  tambemDonoDe?: readonly string[]
}

export interface AdminMenuGroup {
  label: string
  itens: AdminNavItem[]
}

/**
 * Caminhos que pertencem ao módulo Convidados, relativos à base do casamento.
 *
 * Fonte ÚNICA: quem lê esta lista é tanto a nav primária (para "Convidados"
 * acender nessas telas) quanto `adminSectionMenu` (para desenhar a coluna
 * nelas). Escrita duas vezes, uma rota nova entraria só num dos dois lados e a
 * tela apareceria sem menu, ou com menu e sem aba acesa.
 */
const ROTAS_DO_MODULO_CONVIDADOS = ['/convidados', '/grupos', '/convites'] as const

/**
 * Rotas do módulo Configurações. Cronograma e Galeria entram aqui: as duas são
 * o casal preparando o que o convidado vai ver, não uma operação do dia a dia
 * da lista — e cada uma como aba própria no topo empurrava o painel para sete
 * abas, mais do que a barra do celular mostra.
 */
const ROTAS_DO_MODULO_CONFIGURACOES = ['/configuracoes', '/cronograma', '/galeria'] as const

/**
 * As seções de Configurações, agrupadas pelo assunto que era aba no topo.
 *
 * Vive aqui, e não na página, porque virou navegação: o menu da seção monta a
 * coluna a partir desta lista, e a página lê a MESMA lista para saber qual
 * conteúdo desenhar. Em dois lugares, um assunto novo apareceria no menu sem
 * conteúdo, ou o contrário.
 *
 * `id` de cada seção casa 1:1 com o `sectionId` do `AdminSettingsSectionCard`
 * correspondente — é o que faz o item do menu rolar até o cartão certo.
 * Renomear aqui sem renomear no cartão deixa o item sem destino.
 */
export const SETTINGS_ASSUNTOS = [
  {
    id: 'geral',
    label: 'Geral',
    blurb: 'Dados do evento, RSVP e pagamentos.',
    secoes: [
      { id: 'evento', label: 'O evento', icon: 'lucide:calendar-heart' },
      { id: 'rsvp', label: 'RSVP e convidados', icon: 'lucide:mail-check' },
      {
        id: 'faixas-etarias',
        label: 'Classificação etária',
        icon: 'lucide:chart-no-axes-column',
      },
      { id: 'pagamentos', label: 'Pagamentos', icon: 'lucide:credit-card' },
    ],
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    blurb: 'Fotos, tema e recursos do site.',
    secoes: [
      { id: 'branding', label: 'Branding', icon: 'lucide:image' },
      { id: 'tema', label: 'Opções de tema', icon: 'lucide:palette' },
      { id: 'avancado', label: 'Opções avançadas', icon: 'lucide:sliders-horizontal' },
      { id: 'experiencia', label: 'Experiência', icon: 'lucide:sparkles' },
      // Chegou na main pelo rebrand do site público (#96), enquanto esta
      // branch movia a lista para cá — sem esta linha a seção continuaria
      // existindo no cartão e ficaria sem nenhum caminho até ela.
      { id: 'ordem', label: 'Ordem das seções', icon: 'lucide:list-ordered' },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    blurb: 'Textos exibidos aos convidados.',
    secoes: [{ id: 'mensagens', label: 'Mensagens do site', icon: 'lucide:message-square-text' }],
  },
  {
    id: 'colaboradores',
    label: 'Colaboradores',
    blurb: 'Quem pode editar este evento.',
    secoes: [
      { id: 'convidar', label: 'Convidar', icon: 'lucide:user-plus' },
      { id: 'acessos', label: 'Quem tem acesso', icon: 'lucide:users' },
    ],
  },
] as const

export type SettingsAssuntoId = (typeof SETTINGS_ASSUNTOS)[number]['id']

/** Chave de query que diz qual seção de Configurações está aberta. */
export const QUERY_SECAO_CONFIGURACOES = 'secao'

/** O assunto que contém a seção pedida — a aba deixou de ser escolhida, é derivada. */
export function assuntoDaSecao(secao: string | null | undefined) {
  return (
    SETTINGS_ASSUNTOS.find((assunto) => assunto.secoes.some((s) => s.id === secao)) ??
    SETTINGS_ASSUNTOS[0]
  )
}

/**
 * Destinos primários, em ordem de importância. Quantos cabem na barra inferior
 * do celular é decisão de desenho do componente, não desta lista — mas é esta
 * ordem que define o que sobra para o "Mais".
 */
export function adminPrimaryNav(slug: string): AdminNavItem[] {
  const base = `/admin/${slug}`
  return [
    { to: base, label: 'Início', icon: 'lucide:house', exact: true },
    // Convites NÃO tem aba própria: é tela do módulo Convidados, junto de
    // Grupos e Núcleos — os três conceitos independentes da lista (CLAUDE.md,
    // seção 12) moram no mesmo menu de seção. Uma aba a menos no topo também
    // é uma vaga a mais na barra de abas do celular.
    {
      to: `${base}/convidados`,
      label: 'Convidados',
      icon: 'lucide:users',
      tambemDonoDe: ROTAS_DO_MODULO_CONVIDADOS.map((rota) => `${base}${rota}`),
    },
    { to: `${base}/presentes`, label: 'Presentes', icon: 'lucide:gift' },
    // Cronograma e Galeria também perdem aba própria: são telas do módulo
    // Configurações (o casal preparando o que o convidado vai ver).
    {
      to: `${base}/configuracoes`,
      label: 'Configurações',
      icon: 'lucide:settings',
      tambemDonoDe: ROTAS_DO_MODULO_CONFIGURACOES.map((rota) => `${base}${rota}`),
    },
  ]
}

/**
 * Menu da seção atual. Devolve `[]` quando a seção não tem um — e aí a coluna
 * simplesmente não existe, dando a largura toda ao conteúdo em vez de deixar
 * uma faixa vazia ocupando espaço.
 */
export function adminSectionMenu(slug: string, path: string): AdminMenuGroup[] {
  const base = `/admin/${slug}`

  if (ROTAS_DO_MODULO_CONVIDADOS.some((rota) => path.startsWith(`${base}${rota}`))) {
    return [
      {
        label: 'Convidados',
        itens: [
          {
            to: `${base}/convidados`,
            label: 'Visão Geral',
            icon: 'lucide:users',
            exact: true,
            desativadoPor: ['importar'],
          },
          { to: `${base}/convidados/lista`, label: 'Modo lista', icon: 'lucide:table-2' },
          // Importar é ação, não tela: o destino é a Visão Geral com o
          // importador aberto, no mesmo padrão de modal governado pela URL que
          // o cadastro já usa. O nome é só "Importar" porque é só isso que ele
          // abre — exportar é um botão da própria lista, que segue o recorte
          // exibido e por isso não faz sentido fora dela.
          {
            to: `${base}/convidados`,
            query: { chave: 'importar', valor: '1' },
            label: 'Importar',
            icon: 'lucide:upload',
          },
        ],
      },
      {
        label: 'Gerenciar',
        itens: [
          { to: `${base}/grupos`, label: 'Grupos', icon: 'lucide:users-round' },
          { to: `${base}/convites`, label: 'Convites', icon: 'lucide:mail' },
          // Núcleos de Acompanhantes hoje só se editam dentro do wizard de
          // convidado; a tela própria não existe.
          {
            label: 'Núcleos',
            icon: 'lucide:user-round-plus',
            indisponivel: 'Núcleos são editados no cadastro do convidado — tela própria em breve.',
          },
          // A classificação etária existe: é uma seção de Configurações, e o
          // item leva até lá em vez de prometer uma tela.
          {
            to: `${base}/configuracoes`,
            query: { chave: QUERY_SECAO_CONFIGURACOES, valor: 'faixas-etarias' },
            label: 'Faixas etárias',
            icon: 'lucide:chart-no-axes-column',
          },
        ],
      },
      {
        label: 'Configurações',
        itens: [
          { label: 'Formulários', icon: 'lucide:clipboard-list', indisponivel: 'Em breve.' },
          { label: 'Integrações', icon: 'lucide:plug', indisponivel: 'Em breve.' },
        ],
      },
    ]
  }

  if (ROTAS_DO_MODULO_CONFIGURACOES.some((rota) => path.startsWith(`${base}${rota}`))) {
    return [
      // Cada assunto que era aba no topo virou um grupo do menu, e as seções
      // que eram âncoras na própria página viraram os itens dele. O assunto
      // não é um destino: é só o rótulo do grupo, e por isso não tem `to`.
      ...SETTINGS_ASSUNTOS.map((assunto) => ({
        label: assunto.label,
        itens: assunto.secoes.map((secao) => ({
          to: `${base}/configuracoes`,
          query: { chave: QUERY_SECAO_CONFIGURACOES, valor: secao.id },
          label: secao.label,
          icon: secao.icon,
        })),
      })),
      {
        label: 'Páginas do site',
        itens: [
          { to: `${base}/cronograma`, label: 'Cronograma', icon: 'lucide:calendar-clock' },
          { to: `${base}/galeria`, label: 'Galeria', icon: 'lucide:images' },
        ],
      },
    ]
  }

  return []
}

/** Destino pronto para `NuxtLink`, já com a query que o item reivindica. */
export function destinoDoItem(item: AdminNavItem) {
  if (!item.to) return undefined
  if (!item.query) return item.to
  return { path: item.to, query: { [item.query.chave]: item.query.valor } }
}

export function ehItemAtivo(
  item: AdminNavItem,
  rota: { path: string; query: Record<string, unknown> },
): boolean {
  if (!item.to) return false

  const caminho = item.to.split('#')[0] ?? item.to

  if (item.query) {
    return rota.path === caminho && String(rota.query[item.query.chave]) === item.query.valor
  }

  // Filtro na URL (`?nome=joao`) não pode apagar o item — só a query que um
  // irmão reivindica.
  const reivindicadaPorIrmao = (item.desativadoPor ?? []).some(
    (chave) => rota.query[chave] !== undefined,
  )
  if (reivindicadaPorIrmao) return false

  if (item.exact ? rota.path === caminho : rota.path.startsWith(caminho)) return true

  return (item.tambemDonoDe ?? []).some((possuido) => rota.path.startsWith(possuido))
}
