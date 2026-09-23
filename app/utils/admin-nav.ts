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
const ROTAS_DO_MODULO_CONVIDADOS = [
  '/convidados',
  '/grupos',
  '/convites',
  '/comunicacoes',
  '/mesas',
] as const

/**
 * Rotas do módulo Configurações. Cronograma e Galeria entram aqui: as duas são
 * o casal preparando o que o convidado vai ver, não uma operação do dia a dia
 * da lista — e cada uma como aba própria no topo empurrava o painel para sete
 * abas, mais do que a barra do celular mostra.
 */
const ROTAS_DO_MODULO_CONFIGURACOES = ['/configuracoes', '/cronograma', '/galeria'] as const

/**
 * Rotas do módulo Financeiro. Todas debaixo de `/financeiro`, diferente de
 * Convidados (que possui `/grupos` e `/convites` no mesmo nível): aqui as
 * telas nasceram juntas, então o prefixo comum já diz a que módulo pertencem
 * sem uma lista de posse.
 */
const ROTAS_DO_MODULO_FINANCEIRO = ['/financeiro'] as const

/**
 * Rotas do módulo Presentes. Como no Financeiro, as telas nascem debaixo de um
 * prefixo comum — nenhuma lista de posse é necessária.
 */
const ROTAS_DO_MODULO_PRESENTES = ['/presentes'] as const

/**
 * Rotas do módulo Planejamento. Uma tela só — e por isso ele não tem menu de
 * seção: um eixo, uma vista. A lista existe assim mesmo para que uma segunda
 * tela (se um dia houver outro EIXO, não outro recorte) não precise reescrever
 * a posse.
 */
const ROTAS_DO_MODULO_PLANEJAMENTO = ['/planejamento'] as const

/**
 * As seções de Configurações, agrupadas por assunto — **na ordem de uso**.
 *
 * Vive aqui, e não na página, porque virou navegação: o menu da seção monta a
 * coluna a partir desta lista, e a página lê a MESMA lista para saber qual
 * conteúdo desenhar. Em dois lugares, um assunto novo apareceria no menu sem
 * conteúdo, ou o contrário.
 *
 * `id` de cada seção casa 1:1 com o `sectionId` do `AdminSettingsSectionCard`
 * correspondente — é o que faz o item do menu rolar até o cartão certo.
 * Renomear aqui sem renomear no cartão deixa o item sem destino.
 *
 * **A ordem é a do uso, não a da construção** (rodada de usabilidade de
 * 20/09/2026, ponto 22). Era a da construção, e nela "Opções avançadas" e
 * "Classificação etária" tinham o mesmo destaque de "O evento", que é a
 * primeira coisa que todo casal preenche. Agora começa no que se usa no
 * primeiro dia e termina no que se ajusta uma vez.
 *
 * **`aba` diz qual FORMULÁRIO é dono da seção**, e é o que permite esta ordem
 * existir. O endpoint de Configurações substitui a linha inteira do casamento,
 * então cartões de um mesmo formulário não podem virar assuntos separados com
 * barras de salvamento próprias — cada salvamento apagaria os campos dos
 * outros. Com a posse declarada, a ordem do menu deixou de ser refém do
 * desenho dos formulários: "O evento" e "RSVP e convidados" abrem o mesmo,
 * cada um mostrando os cartões que lhe pertencem.
 *
 * `termos` alimenta a busca do painel, e são os SINÔNIMOS — o rótulo já é
 * procurado. Quem digita "countdown" está atrás da contagem regressiva.
 *
 * **O `label` é o do MENU, e cabe na coluna** (~120px, medidos): o nome inteiro
 * do assunto vive no título do cartão, que tem a largura da tela. É a mesma
 * regra do ponto 11, e ela foi quebrada aqui no dia seguinte a ser escrita —
 * "Classificação etária", "Avisos automáticos" e "Presentes e pagamentos"
 * nasceram cortados. `tests/e2e/menu-de-secao.spec.ts` mede os quatro menus.
 */
export const SETTINGS_ASSUNTOS = [
  {
    id: 'evento',
    label: 'O evento',
    blurb: 'Nome do casal, data e publicação do site.',
    secoes: [
      {
        id: 'evento',
        label: 'O evento',
        icon: 'lucide:calendar-heart',
        aba: 'geral',
        termos: ['data', 'horário', 'nome do casal', 'publicar', 'site no ar', 'rascunho'],
      },
    ],
  },
  {
    id: 'aparencia',
    label: 'Aparência',
    blurb: 'Fotos, tema e o que o site mostra.',
    secoes: [
      {
        id: 'branding',
        label: 'Branding',
        icon: 'lucide:image',
        aba: 'aparencia',
        termos: ['capa', 'foto', 'imagem', 'monograma', 'logo', 'história', 'dress code'],
      },
      {
        id: 'tema',
        label: 'Opções de tema',
        icon: 'lucide:palette',
        aba: 'aparencia',
        termos: ['cor', 'cores', 'preset', 'paleta', 'fonte', 'tipografia'],
      },
      {
        id: 'experiencia',
        label: 'Experiência',
        icon: 'lucide:sparkles',
        aba: 'aparencia',
        termos: ['contagem regressiva', 'countdown', 'atalhos', 'botões da capa', 'hero'],
      },
      {
        id: 'ordem',
        label: 'Seções da home',
        icon: 'lucide:list-ordered',
        aba: 'aparencia',
        termos: ['seções', 'home', 'página inicial', 'ligar', 'desligar', 'esconder'],
      },
    ],
  },
  {
    id: 'conteudo',
    label: 'Conteúdo',
    blurb: 'Textos exibidos aos convidados.',
    secoes: [
      {
        id: 'mensagens',
        label: 'Mensagens',
        icon: 'lucide:message-square-text',
        aba: 'conteudo',
        termos: ['texto', 'história', 'versículo', 'faq', 'manual', 'dress code', 'presentes'],
      },
    ],
  },
  {
    id: 'rsvp',
    label: 'RSVP e convidados',
    blurb: 'Regras de confirmação de presença.',
    secoes: [
      {
        id: 'rsvp',
        label: 'RSVP',
        icon: 'lucide:mail-check',
        aba: 'geral',
        termos: ['prazo', 'confirmação', 'presença', 'lista aberta', 'lista fechada'],
      },
      {
        // O mesmo rótulo que o menu de Convidados já usa para esta seção: dois
        // nomes para o mesmo destino fazem parecer que são dois lugares.
        id: 'faixas-etarias',
        label: 'Faixas etárias',
        icon: 'lucide:chart-no-axes-column',
        aba: 'geral',
        termos: ['idade', 'criança', 'adolescente', 'bebê', 'faixa etária'],
      },
    ],
  },
  {
    id: 'avisos',
    label: 'Avisos',
    blurb: 'O que a plataforma envia sozinha.',
    secoes: [
      {
        id: 'avisos',
        label: 'Lembretes',
        icon: 'lucide:bell',
        aba: 'avisos',
        termos: ['lembrete', 'e-mail automático', 'cobrança', 'vencimento'],
      },
    ],
  },
  {
    id: 'colaboradores',
    label: 'Colaboradores',
    blurb: 'Quem pode editar este evento.',
    secoes: [
      {
        id: 'convidar',
        label: 'Convidar',
        icon: 'lucide:user-plus',
        aba: 'colaboradores',
        termos: ['adicionar pessoa', 'assessoria', 'cerimonialista', 'permissão', 'papel'],
      },
      {
        id: 'acessos',
        label: 'Acessos',
        icon: 'lucide:users',
        aba: 'colaboradores',
        termos: ['membros', 'remover acesso', 'dono', 'planejador'],
      },
    ],
  },
  // O que se configura uma vez e quase nunca se revisita. Não é "escondido":
  // esconder metade das opções atrás de um botão trocaria um problema de
  // tamanho por um de descoberta, e a decisão de ser completo em personalização
  // está tomada (CLAUDE.md, seção 13). É só o fim da fila.
  {
    id: 'avancado',
    label: 'Avançado',
    blurb: 'Ajuste fino do tema, e recebimento online.',
    secoes: [
      {
        id: 'avancado',
        label: 'Ajuste fino',
        icon: 'lucide:sliders-horizontal',
        aba: 'aparencia',
        termos: ['cor personalizada', 'ornamento', 'moldura', 'título', 'corpo', 'hex'],
      },
      {
        id: 'pagamentos',
        label: 'Pagamentos',
        icon: 'lucide:credit-card',
        aba: 'geral',
        termos: ['infinitepay', 'pix', 'cartão', 'receber', 'handle', 'presente físico'],
      },
    ],
  },
  // O único assunto que NÃO é do evento: é a conta de quem está olhando, e
  // vale igual em todos os casamentos que a pessoa acessa. Fica por último
  // porque é manutenção de acesso, não trabalho de organizar o casamento.
  {
    id: 'conta',
    label: 'Sua conta',
    blurb: 'Seu acesso à plataforma.',
    secoes: [
      {
        id: 'senha',
        label: 'Senha',
        icon: 'lucide:lock',
        aba: 'conta',
        termos: ['trocar senha', 'redefinir', 'login', 'acesso'],
      },
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

/** Todas as seções, em ordem — a lista que a busca e o índice percorrem. */
export const SETTINGS_SECOES = SETTINGS_ASSUNTOS.flatMap((assunto) =>
  assunto.secoes.map((secao) => ({ ...secao, assunto })),
)

export type SettingsAbaId = (typeof SETTINGS_SECOES)[number]['aba']

/**
 * Qual formulário desenha a seção pedida.
 *
 * É a SEÇÃO que decide, e não o assunto: "Avançado" reúne uma seção do tema e
 * uma do evento, que vivem em formulários diferentes. Com o assunto decidindo,
 * um dos dois cartões ficaria sem tela.
 */
export function abaDaSecao(secao: string | null | undefined): SettingsAbaId {
  return SETTINGS_SECOES.find((s) => s.id === secao)?.aba ?? SETTINGS_SECOES[0]!.aba
}

/**
 * As seções que a tela mostra: as do assunto pedido que pertencem ao mesmo
 * formulário. O resto do assunto (quando ele atravessa formulários) continua no
 * menu, e cada item leva à própria tela.
 */
export function secoesVisiveis(secao: string | null | undefined): string[] {
  const aba = abaDaSecao(secao)
  return assuntoDaSecao(secao)
    .secoes.filter((s) => s.aba === aba)
    .map((s) => s.id)
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
    // Planejamento vem logo depois do Início porque responde a pergunta que o
    // casal faz ANTES de todas as outras — "o que eu faço agora?". Início é
    // panorama; aqui é a lista de onde sai o trabalho do dia.
    {
      to: `${base}/planejamento`,
      label: 'Planejamento',
      icon: 'lucide:list-checks',
      tambemDonoDe: ROTAS_DO_MODULO_PLANEJAMENTO.map((rota) => `${base}${rota}`),
    },
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
    {
      to: `${base}/financeiro`,
      label: 'Financeiro',
      icon: 'lucide:wallet',
      tambemDonoDe: ROTAS_DO_MODULO_FINANCEIRO.map((rota) => `${base}${rota}`),
    },
    // Presentes desce para o "Mais" do celular com a entrada de Planejamento:
    // a barra mostra quatro destinos, e a escolha é entre um módulo que se
    // configura uma vez e depois só se acompanha e o que responde "o que eu
    // faço hoje". No desktop nada sai — a nav do cabeçalho comporta seis.
    {
      to: `${base}/presentes`,
      label: 'Presentes',
      icon: 'lucide:gift',
      tambemDonoDe: ROTAS_DO_MODULO_PRESENTES.map((rota) => `${base}${rota}`),
    },
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
          // Comunicações é OUTRO EIXO do mesmo convite — o do contato, não o do
          // conteúdo: "quem já recebeu o quê, e quem falta". Tela nova se
          // justifica por eixo novo (mesmo critério do Financeiro, onde
          // Pagamentos sobrevive por ser o eixo do tempo).
          { to: `${base}/comunicacoes`, label: 'Comunicações', icon: 'lucide:send' },
          // Mesas é a SAÍDA do ciclo do convidado — avisar, acompanhar,
          // acomodar. Fica em Gerenciar junto de Grupos, Convites e
          // Comunicações: os quatro são recortes da mesma lista de pessoas.
          { to: `${base}/mesas`, label: 'Mesas', icon: 'lucide:armchair' },
          // "Núcleos" ficava aqui, inerte, prometendo "tela própria em breve".
          // A tela foi DESCARTADA, não adiada (docs/PRODUCT.md seção 3.7): o
          // núcleo não tem nome gravado e o rótulo dele muda quando alguém
          // entra ou sai, então uma tela listando linhas sem nome, cujo título
          // se mexe sozinho, não serve de referência para ninguém. Ele aparece
          // onde significa algo — na linha, no cadastro, no convite, no filtro.
          //
          // Saíram junto "Formulários" e "Integrações", que eram dois itens de
          // menu sem nada por trás. Item que promete e não entrega é pior que
          // item ausente: ele gasta a atenção de quem procura o recurso e
          // devolve um `title` explicando que não existe.
          //
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
    ]
  }

  if (ROTAS_DO_MODULO_FINANCEIRO.some((rota) => path.startsWith(`${base}${rota}`))) {
    return [
      // Duas telas, um objeto. Eram quatro (Orçamento, Fornecedores,
      // Pagamentos, Documentos) porque a navegação seguia VERBOS — planejar,
      // cotar, pagar, anexar —, e a vida de um mesmo gasto ficava picada entre
      // elas. Fornecedor e documento viraram seções da ficha do gasto;
      // Pagamentos sobrevive por ser outro EIXO (o tempo), não outro objeto.
      {
        label: 'Financeiro',
        itens: [
          {
            to: `${base}/financeiro`,
            label: 'Gastos',
            icon: 'lucide:receipt-text',
            exact: true,
            // A ficha é filha desta lista, não um destino próprio: quem está
            // lendo um gasto continua "em Gastos".
            tambemDonoDe: [`${base}/financeiro/gastos`],
          },
          // Categoria é atributo do gasto, não um terceiro objeto — mas ela
          // ganha lugar pelo mesmo motivo que Grupos tem o dele em Convidados:
          // somada, ela responde "onde o dinheiro está indo?", pergunta que uma
          // lista de linhas individuais não responde. Vem ANTES de Pagamentos
          // porque é ali que se planeja: a ordem do menu é a ordem do dinheiro
          // na vida do casal — listar, planejar, pagar.
          //
          // "Planejar por categoria", e não "Categorias": o nome antigo descrevia
          // o OBJETO, e quem entra em Financeiro vê Gastos primeiro e não tinha
          // pista de que o planejamento por categoria existia (rodada de
          // usabilidade de 20/09/2026, ponto 13). Resolvido pelo nome, e não
          // invertendo a ordem do menu — inverter penalizaria todo uso recorrente
          // do módulo para ajudar o primeiro, e o primeiro já tem caminho melhor:
          // o estado vazio de Gastos leva até aqui.
          //
          // **Uma palavra**, como os três vizinhos. "Planejar por categoria" foi a
          // primeira tentativa e truncou na coluna em 22/09/2026 — exatamente o
          // corte que o ponto 11 descreve, criado por quem tinha acabado de
          // consertá-lo. "Planejamento" caberia, mas é o nome de OUTRO módulo na
          // nav primária. Sobra o verbo, e ele diz o que a tela faz; a pergunta
          // inteira é o título dela ("Onde o dinheiro está indo").
          {
            to: `${base}/financeiro/categorias`,
            label: 'Planejar',
            icon: 'lucide:tags',
          },
          // Leitura, e só: o fornecedor continua nascendo dentro da ficha do
          // gasto que ele cota — é isso que impede cotação órfã. O que esta tela
          // responde é outra pergunta, que a lista de gastos não responde: quem
          // vai atender o casamento, e como falar com cada um no dia (rodada de
          // usabilidade de 20/09/2026, ponto 18).
          {
            to: `${base}/financeiro/fornecedores`,
            label: 'Fornecedores',
            icon: 'lucide:contact',
          },
          {
            to: `${base}/financeiro/pagamentos`,
            label: 'Pagamentos',
            icon: 'lucide:calendar-clock',
          },
        ],
      },
    ]
  }

  if (ROTAS_DO_MODULO_PRESENTES.some((rota) => path.startsWith(`${base}${rota}`))) {
    return [
      // Três itens, pelo mesmo critério que o Financeiro usa para admitir tela
      // nova: eixo novo ou agregação. A lista é o OBJETO; Recebidos é o
      // dinheiro (outro eixo, e somado); "No site" é o que o convidado vê.
      //
      // Não existe tela de Categorias, como não existe no Financeiro: categoria
      // é atributo do presente, então ela é filtro na lista e ordenação em "No
      // site" — os dois lugares onde ela significa algo.
      {
        label: 'Presentes',
        itens: [
          {
            to: `${base}/presentes`,
            label: 'Lista',
            icon: 'lucide:gift',
            exact: true,
          },
          {
            to: `${base}/presentes/recebidos`,
            label: 'Recebidos',
            icon: 'lucide:hand-coins',
          },
          // Uma palavra e meia, como os vizinhos: "Como aparece no site" é a
          // PERGUNTA, e ela é o título da tela — na coluna ela truncaria, que
          // é o corte medido no ponto 11.
          {
            to: `${base}/presentes/site`,
            label: 'No site',
            icon: 'lucide:eye',
          },
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
