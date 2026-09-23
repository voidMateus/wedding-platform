/**
 * A ajuda de cada tela do painel — **fonte única**, derivada da rota.
 *
 * O Início tem o roteiro de Primeiros passos e o Financeiro tem estado vazio
 * bem escrito. Fora isso, quem abre Convidados, Mesas, Comunicações ou
 * Presentes pela primeira vez recebe uma tela pronta para quem já sabe o que
 * ela faz (rodada de usabilidade de 20/09/2026, ponto 8).
 *
 * **Um mecanismo, não quarenta textos soltos.** Catálogo aqui pelo mesmo motivo
 * de `home-sections.ts`: escrito tela a tela, o formato diverge no terceiro
 * item e ninguém percebe. As três perguntas são sempre as mesmas, e na mesma
 * ordem — o que esta tela responde, o que dá para fazer, por onde começar.
 *
 * **Não é tour guiado** (interrompe, e é clicado fora antes de ser lido) **nem
 * modal** (precisa ser fechado antes de qualquer coisa). É um bloco no topo,
 * dispensável, que volta pelo ponto de interrogação do cabeçalho.
 *
 * E ele **não substitui o estado vazio**: um descreve a tela, o outro descreve
 * a ausência de dado. A tela cheia também precisa de explicação na primeira
 * visita.
 */
export interface AjudaDeTela {
  /**
   * Chave estável do "visto" — nunca a rota.
   *
   * A rota carrega o slug do casamento, e dispensar a ajuda é preferência da
   * PESSOA: ela atravessa a troca de evento (CLAUDE.md, seção 12). Renomear
   * uma rota não pode fazer a ajuda reaparecer para quem já a leu.
   */
  id: string
  /** O que esta tela responde — a pergunta, não o nome do objeto. */
  responde: string
  /** O que dá para fazer aqui, em frases curtas. */
  acoes: readonly string[]
  /** Por onde começar — uma frase, o primeiro gesto. */
  comece: string
}

/**
 * O catálogo, com o padrão de rota de cada tela.
 *
 * `slug` vira curinga: `/admin/:slug/convidados`. A ordem importa — o primeiro
 * padrão que casar ganha, então o mais específico vem antes (a ficha do gasto
 * antes da lista de gastos).
 */
interface EntradaDoCatalogo extends AjudaDeTela {
  /** Caminho depois de `/admin/<slug>`, sem barra final. `''` é a raiz do painel. */
  rota: string
  /** Casa também com as sub-rotas (ex.: a ficha de um convidado). */
  incluiFilhas?: boolean
}

export const AJUDA_POR_TELA: readonly EntradaDoCatalogo[] = [
  {
    rota: '/convidados',
    incluiFilhas: true,
    id: 'convidados',
    responde: 'Quem vocês vão convidar, e quem já respondeu.',
    acoes: [
      'Cadastrar pessoas uma a uma, ou importar de uma planilha',
      'Agrupar quem chega junto num mesmo convite',
      'Acompanhar quem confirmou, quem recusou e quem não respondeu',
    ],
    comece: 'Comece pelas pessoas mais certas — a lista cresce junto com as decisões.',
  },
  {
    rota: '/convites',
    incluiFilhas: true,
    id: 'convites',
    responde: 'Em que ponto está cada convite — do não enviado ao respondido.',
    acoes: [
      'Registrar o envio por WhatsApp, e-mail ou fora da plataforma',
      'Reenviar o link de acesso de quem perdeu',
      'Responder pelo convidado que avisou por telefone',
    ],
    comece: 'O estágio se move sozinho conforme os fatos acontecem — você registra, ele segue.',
  },
  {
    rota: '/grupos',
    id: 'grupos',
    responde: 'Como a lista se divide — família dele, amigos da faculdade, trabalho.',
    acoes: [
      'Criar etiquetas e subdividir uma delas em até dois níveis',
      'Ver quanto de cada grupo já confirmou',
    ],
    comece: 'Grupo é etiqueta livre: ele não decide convite nem mesa, só ajuda a enxergar.',
  },
  {
    rota: '/mesas',
    id: 'mesas',
    responde: 'Onde cada pessoa vai sentar na festa.',
    acoes: [
      'Desenhar a planta do salão e arrastar as mesas',
      'Sentar convidados pela planta ou pela lista, como preferir',
      'Ver quem ainda falta acomodar',
    ],
    comece: 'Crie as mesas primeiro; sentar gente é o passo seguinte, e dá para mudar sempre.',
  },
  {
    rota: '/comunicacoes',
    id: 'comunicacoes',
    responde: 'O que já foi enviado para cada convite, e por qual canal.',
    acoes: [
      'Escrever o modelo de cada tipo de mensagem, uma vez',
      'Enviar por e-mail, ou abrir a conversa no WhatsApp',
      'Registrar um envio feito fora da plataforma',
    ],
    comece: 'Ajuste o modelo antes do primeiro envio — ele vale para todo mundo.',
  },
  {
    rota: '/presentes',
    id: 'presentes',
    responde: 'O que os convidados podem presentear, e o que já foi escolhido.',
    acoes: [
      'Montar a lista com presentes físicos ou cotas de um valor maior',
      'Acompanhar reservas e contribuições',
    ],
    comece: 'Poucos presentes bem escolhidos funcionam melhor que uma lista longa.',
  },
  {
    rota: '/planejamento',
    id: 'planejamento',
    responde: 'O que falta fazer, e quando.',
    acoes: [
      'Criar tarefas com prazo e responsável',
      'Aceitar as sugestões do que costuma entrar em cada etapa',
    ],
    comece: 'Nada é marcado sozinho: o sistema sugere, vocês concluem.',
  },
  {
    rota: '/financeiro/categorias',
    id: 'financeiro-planejar',
    responde: 'Para onde o dinheiro está indo, somado por categoria.',
    acoes: [
      'Abrir uma categoria e escrever, item a item, o que pretendem contratar',
      'Comparar o planejado com o já contratado',
    ],
    comece: 'O valor pode ficar em branco enquanto vocês não souberem o preço.',
  },
  {
    rota: '/financeiro/fornecedores',
    id: 'financeiro-fornecedores',
    responde: 'Quem vai atender o casamento, e como falar com cada um.',
    acoes: [
      'Guardar contato, telefone e e-mail de cada fornecedor',
      'Imprimir ou exportar a lista para levar no dia',
    ],
    comece: 'Cada fornecedor pertence a um gasto — é assim que nenhuma cotação fica solta.',
  },
  {
    rota: '/financeiro/pagamentos',
    id: 'financeiro-pagamentos',
    responde: 'O que vence, o que passou e o que já saiu da conta.',
    acoes: ['Dar baixa numa parcela paga', 'Agendar o que foi contratado e ainda não tem data'],
    comece: 'Só o que já tem valor fechado aparece aqui — planejar não é se comprometer.',
  },
  {
    rota: '/financeiro',
    incluiFilhas: true,
    id: 'financeiro-gastos',
    responde: 'Quanto vai custar cada coisa, e o que falta decidir.',
    acoes: [
      'Registrar um gasto e quanto vocês imaginam gastar',
      'Comparar propostas de fornecedores e fechar com uma',
      'Abrir a ficha de um gasto para ver a história inteira dele',
    ],
    comece: 'Planejar por categoria é o caminho mais rápido para a primeira lista.',
  },
  {
    rota: '/cronograma',
    id: 'cronograma',
    responde: 'A ordem do dia — o que acontece, a que horas e onde.',
    acoes: [
      'Cadastrar as etapas com horário e local',
      'Mostrar o cronograma no site, para os convidados se organizarem',
    ],
    comece: 'Cerimônia e recepção primeiro; o resto se encaixa entre elas.',
  },
  {
    rota: '/galeria',
    id: 'galeria',
    responde: 'As fotos que aparecem no site do casamento.',
    acoes: ['Conectar uma pasta do Google Drive', 'Escolher quantas fotos aparecem na home'],
    comece: 'As fotos continuam no Drive de vocês — o site só as exibe.',
  },
]

/** `/admin/ana-e-joao/convidados/123` → `/convidados/123` */
function caminhoDentroDoPainel(rota: string): string | null {
  const partes = rota.replace(/\/+$/, '').split('/')
  // ['', 'admin', '<slug>', ...resto]
  if (partes[1] !== 'admin' || !partes[2]) return null
  return `/${partes.slice(3).join('/')}`.replace(/\/$/, '')
}

/**
 * A ajuda da rota atual, ou `null` quando a tela não tem uma.
 *
 * Tela sem entrada no catálogo não ganha bloco vazio: ausência é resposta
 * válida, e a maioria das telas que faltam aqui são fichas de um item, onde o
 * próprio conteúdo já diz o que é.
 */
export function ajudaDaRota(rota: string): AjudaDeTela | null {
  const caminho = caminhoDentroDoPainel(rota)
  if (caminho === null) return null

  const entrada = AJUDA_POR_TELA.find((atual) =>
    atual.incluiFilhas
      ? caminho === atual.rota || caminho.startsWith(`${atual.rota}/`)
      : caminho === atual.rota,
  )

  if (!entrada) return null

  return {
    id: entrada.id,
    responde: entrada.responde,
    acoes: entrada.acoes,
    comece: entrada.comece,
  }
}
