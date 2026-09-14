/**
 * O que quase todo casamento precisa fazer, e quando.
 *
 * É o "por onde eu começo?" respondido — a pergunta que o Hub não respondia e
 * que aparece num momento em que o casal não tem lista de convidados nem
 * orçamento, só uma data.
 *
 * ## As quatro regras desta lista
 *
 * 1. **Sugestão não é linha no banco.** Nada aqui vira `tarefas` sozinho. Cada
 *    janela mostra no rodapé o que costuma entrar ali, apagado; a tarefa nasce
 *    quando o casal clica. Quarenta e cinco linhas semeadas entrariam no
 *    progresso, no bloco do painel e no "vencidas" de todo mundo.
 *
 * 2. **A sugestão não se esgota.** Some item a item conforme o casal cadastra,
 *    volta se ele excluir, e nunca "expira" — planejar é processo contínuo, não
 *    um assistente que roda uma vez.
 *
 * 3. **Sem duração e sem custo sugeridos.** O catálogo diz *o quê* e *quando*,
 *    nunca *quanto*: valor é assunto do Financeiro, e "reserve 2 horas para
 *    isso" é palpite com ar de autoridade.
 *
 * 4. **Sem sugestão que outro módulo já responde melhor.** "Pagar as parcelas
 *    que vencem antes do casamento" é item clássico de checklist e está fora
 *    daqui de propósito: Pagamentos é o eixo do tempo do dinheiro e o painel já
 *    alerta. Repetir seria um segundo número pedindo reconferência.
 *
 * ## De onde a lista vem
 *
 * Das treze categorias de `orcamento-categorias.ts` e dos 54 itens de
 * `orcamento-itens.ts` — as duas listas que já vieram da checklist de uma
 * cerimonial em atividade —, colapsadas para a granularidade da DECISÃO, mais
 * as tarefas que não são gasto nenhum (documentação, lista, provas, ensaio, o
 * que fica para depois).
 *
 * O colapso é a diferença estrutural entre os dois catálogos: o de gastos tem
 * 54 itens porque é a granularidade do DINHEIRO ("Serviço de garçons" é uma
 * linha do orçamento). Aqui, "Contratar o buffet" é uma tarefa e garçom, mesa
 * de entradas e lanche da madrugada são detalhes dela. Uma caixinha por item de
 * orçamento produziria uma lista de 54 linhas que ninguém termina.
 *
 * O vínculo com o Financeiro é só de origem: esta lista é própria, não gerada
 * da outra em tempo de execução — gerar produziria títulos que ninguém
 * escreveria ("Contratar Chuva de prata") e exigiria um mapa de prazo por item
 * de qualquer jeito. O que trava o par é teste, não código compartilhado.
 */

import { FATOS_SIMPLES, categoriaDoFato } from '#shared/fatos-do-casamento'

import type { FatoObservado, FatoSimples } from '#shared/fatos-do-casamento'

/**
 * As fases do planejamento, da mais distante ao depois do casamento.
 *
 * `diasAntes` NEGATIVO é depois do evento, e é por isso que o campo é dias e
 * não meses: a última fase é a única em que o sinal importa, e `mesesAntes:
 * -0,5` seria pior de ler do que `-15`.
 *
 * **Mês é 30 dias por convenção daqui, e isso está certo:** o prazo sugerido é
 * ponto de partida editável, não data legal. Que "3 meses antes" caia 90 dias
 * antes em vez de no mesmo dia do mês é irrelevante para quem vai arrastar a
 * data de qualquer forma.
 */
export const FASES_DO_PLANEJAMENTO = [
  { id: 'doze_meses', rotulo: '12 meses antes', diasAntes: 365 },
  { id: 'nove_meses', rotulo: '9 meses antes', diasAntes: 270 },
  { id: 'seis_meses', rotulo: '6 meses antes', diasAntes: 180 },
  { id: 'quatro_meses', rotulo: '4 meses antes', diasAntes: 120 },
  { id: 'tres_meses', rotulo: '3 meses antes', diasAntes: 90 },
  { id: 'dois_meses', rotulo: '2 meses antes', diasAntes: 60 },
  { id: 'um_mes', rotulo: '1 mês antes', diasAntes: 30 },
  { id: 'duas_semanas', rotulo: '2 semanas antes', diasAntes: 14 },
  { id: 'semana', rotulo: 'Semana do casamento', diasAntes: 7 },
  { id: 'depois', rotulo: 'Depois do casamento', diasAntes: -15 },
] as const

export type FaseId = (typeof FASES_DO_PLANEJAMENTO)[number]['id']

export function fasePorId(id: FaseId) {
  return FASES_DO_PLANEJAMENTO.find((fase) => fase.id === id)
}

/**
 * Os fatos que este catálogo lê para decidir o que NÃO oferecer.
 *
 * O vocabulário mora em `shared/fatos-do-casamento.ts` desde a Fase 4, quando
 * o roteiro de Primeiros passos passou a ler os mesmos fatos. Reexportado aqui
 * para não quebrar quem importa do catálogo — e porque é aqui que a regra de
 * uso vale: um fato entra na decisão de **o que oferecer**, NUNCA na de **o
 * que está feito** (docs/fase3-planejamento.md seção 1.1). Deixar de sugerir
 * algo que o casal já resolveu custa um clique em "ver todas"; concluir uma
 * tarefa que não foi feita custa a tela.
 */
export { FATOS_SIMPLES, categoriaDoFato }
export type { FatoSimples, FatoObservado }

export interface TarefaSugerida {
  /** Chave ESTÁVEL — vai para `tarefas.origem_catalogo` e nunca muda. */
  chave: string
  titulo: string
  fase: FaseId
  /** O fato que torna esta sugestão desnecessária. Ausente = sempre oferecida. */
  dispensadaPor?: FatoObservado
}

export const TAREFAS_SUGERIDAS: readonly TarefaSugerida[] = [
  // --- 12 meses -----------------------------------------------------------
  {
    chave: 'definir-estilo',
    titulo: 'Definir o estilo e o tamanho do casamento',
    fase: 'doze_meses',
  },
  {
    chave: 'definir-orcamento',
    titulo: 'Definir quanto vocês podem gastar',
    fase: 'doze_meses',
    dispensadaPor: 'orcamento_definido',
  },
  {
    chave: 'primeira-lista',
    titulo: 'Montar a primeira lista de convidados',
    fase: 'doze_meses',
    dispensadaPor: 'tem_convidado',
  },
  {
    chave: 'reservar-espaco',
    titulo: 'Escolher e reservar o espaço da festa',
    fase: 'doze_meses',
    dispensadaPor: 'contratado:Espaço e estrutura',
  },
  {
    chave: 'local-cerimonia',
    titulo: 'Definir o local da cerimônia',
    fase: 'doze_meses',
    dispensadaPor: 'local_definido',
  },
  {
    chave: 'contratar-assessoria',
    titulo: 'Contratar a assessoria ou cerimonial',
    fase: 'doze_meses',
    dispensadaPor: 'contratado:Cerimônia e assessoria',
  },

  // --- 9 meses ------------------------------------------------------------
  {
    chave: 'contratar-buffet',
    titulo: 'Contratar o buffet',
    fase: 'nove_meses',
    dispensadaPor: 'contratado:Buffet',
  },
  {
    chave: 'contratar-foto-video',
    titulo: 'Contratar fotografia e filmagem',
    fase: 'nove_meses',
    dispensadaPor: 'contratado:Fotografia e vídeo',
  },
  {
    chave: 'contratar-musica',
    titulo: 'Fechar a banda ou o DJ',
    fase: 'nove_meses',
    dispensadaPor: 'contratado:Música',
  },
  { chave: 'escolher-vestido', titulo: 'Escolher o vestido da noiva', fase: 'nove_meses' },
  { chave: 'reservar-celebrante', titulo: 'Reservar o celebrante', fase: 'nove_meses' },
  {
    chave: 'publicar-site',
    titulo: 'Publicar o site do casamento',
    fase: 'nove_meses',
    dispensadaPor: 'site_publicado',
  },
  {
    chave: 'enviar-save-the-date',
    titulo: 'Enviar o save the date',
    fase: 'nove_meses',
    dispensadaPor: 'tem_save_the_date',
  },

  // --- 6 meses ------------------------------------------------------------
  {
    chave: 'contratar-decoracao',
    titulo: 'Contratar a decoração e as flores',
    fase: 'seis_meses',
    dispensadaPor: 'contratado:Decoração e flores',
  },
  {
    chave: 'escolher-bolo',
    titulo: 'Escolher o bolo e os doces',
    fase: 'seis_meses',
    dispensadaPor: 'contratado:Bolo e doces',
  },
  { chave: 'traje-noivo', titulo: 'Definir o traje do noivo', fase: 'seis_meses' },
  { chave: 'escolher-padrinhos', titulo: 'Escolher padrinhos e madrinhas', fase: 'seis_meses' },
  { chave: 'fechar-lista', titulo: 'Fechar a lista de convidados', fase: 'seis_meses' },
  {
    chave: 'reservar-lua-de-mel',
    titulo: 'Reservar a lua de mel',
    fase: 'seis_meses',
    dispensadaPor: 'contratado:Lua de mel',
  },

  // --- 4 meses ------------------------------------------------------------
  {
    chave: 'encomendar-convites',
    titulo: 'Encomendar os convites',
    fase: 'quatro_meses',
    dispensadaPor: 'contratado:Papelaria e lembranças',
  },
  { chave: 'escolher-aliancas', titulo: 'Escolher as alianças', fase: 'quatro_meses' },
  {
    chave: 'definir-bebidas',
    titulo: 'Definir as bebidas e o bar',
    fase: 'quatro_meses',
    dispensadaPor: 'contratado:Bebidas',
  },
  {
    chave: 'contratar-beleza',
    titulo: 'Contratar cabelo e maquiagem',
    fase: 'quatro_meses',
    dispensadaPor: 'contratado:Vestuário e beleza',
  },
  {
    chave: 'lista-de-presentes',
    titulo: 'Montar a lista de presentes',
    fase: 'quatro_meses',
    dispensadaPor: 'tem_presente',
  },

  // --- 3 meses ------------------------------------------------------------
  // O ÚNICO item do catálogo cujo prazo não é preferência: a certidão de
  // habilitação vale 90 dias e o processo leva cerca de 30 (proclamas
  // incluídos), então pedir cedo demais é tão errado quanto tarde demais.
  {
    chave: 'habilitacao-cartorio',
    titulo: 'Dar entrada na habilitação no cartório',
    fase: 'tres_meses',
  },
  {
    chave: 'enviar-convites',
    titulo: 'Enviar os convites',
    fase: 'tres_meses',
    dispensadaPor: 'tem_convite_enviado',
  },
  { chave: 'prova-vestido-1', titulo: 'Primeira prova do vestido', fase: 'tres_meses' },
  {
    chave: 'definir-atrativos',
    titulo: 'Definir os atrativos da festa',
    fase: 'tres_meses',
    dispensadaPor: 'contratado:Atrativos da festa',
  },
  {
    chave: 'contratar-transporte',
    titulo: 'Contratar o transporte',
    fase: 'tres_meses',
    dispensadaPor: 'contratado:Transporte',
  },

  // --- 2 meses ------------------------------------------------------------
  {
    chave: 'acompanhar-rsvp',
    titulo: 'Acompanhar as confirmações de presença',
    fase: 'dois_meses',
    dispensadaPor: 'tem_resposta_rsvp',
  },
  { chave: 'escolher-lembrancinhas', titulo: 'Escolher as lembrancinhas', fase: 'dois_meses' },
  {
    chave: 'montar-cronograma',
    titulo: 'Montar o cronograma do dia',
    fase: 'dois_meses',
    dispensadaPor: 'tem_cronograma',
  },
  { chave: 'prova-traje-noivo', titulo: 'Provar o traje do noivo', fase: 'dois_meses' },
  { chave: 'agendar-ensaio', titulo: 'Agendar o ensaio da cerimônia', fase: 'dois_meses' },

  // --- 1 mês --------------------------------------------------------------
  {
    chave: 'fechar-numero-buffet',
    titulo: 'Fechar o número de convidados com o buffet',
    fase: 'um_mes',
  },
  {
    chave: 'montar-mesas',
    titulo: 'Montar as mesas e o mapa do salão',
    fase: 'um_mes',
    dispensadaPor: 'tem_mesa',
  },
  { chave: 'prova-vestido-final', titulo: 'Última prova do vestido', fase: 'um_mes' },
  {
    chave: 'confirmar-fornecedores',
    titulo: 'Confirmar horários com todos os fornecedores',
    fase: 'um_mes',
  },

  // --- 2 semanas ----------------------------------------------------------
  {
    chave: 'reconfirmar-pendentes',
    titulo: 'Reconfirmar quem ainda não respondeu',
    fase: 'duas_semanas',
  },
  {
    chave: 'cronograma-fornecedores',
    titulo: 'Enviar o cronograma para os fornecedores',
    fase: 'duas_semanas',
  },
  {
    chave: 'separar-documentos',
    titulo: 'Separar documentos e alianças para o dia',
    fase: 'duas_semanas',
  },
  { chave: 'kit-emergencia', titulo: 'Montar o kit de emergência', fase: 'duas_semanas' },

  // --- Semana do casamento ------------------------------------------------
  {
    chave: 'confirmar-transporte-noivos',
    titulo: 'Confirmar o transporte dos noivos',
    fase: 'semana',
  },
  {
    chave: 'lista-final-mesas',
    titulo: 'Entregar a lista final de mesas ao cerimonial',
    fase: 'semana',
  },
  {
    chave: 'separar-do-dia',
    titulo: 'Separar o que vai para o dia (traje, sapatos, documentos)',
    fase: 'semana',
  },

  // --- Depois -------------------------------------------------------------
  { chave: 'devolver-trajes', titulo: 'Devolver os trajes alugados', fase: 'depois' },
  { chave: 'escolher-fotos-album', titulo: 'Escolher as fotos do álbum', fase: 'depois' },
  { chave: 'agradecer', titulo: 'Agradecer a padrinhos e convidados', fase: 'depois' },
  {
    chave: 'atualizar-documentos',
    titulo: 'Atualizar os documentos com o novo sobrenome',
    fase: 'depois',
  },
]

export function tarefaSugeridaPorChave(chave: string): TarefaSugerida | undefined {
  return TAREFAS_SUGERIDAS.find((tarefa) => tarefa.chave === chave)
}

/**
 * As sugestões que ainda fazem sentido oferecer.
 *
 * Sai da lista o que o casal já criou (por `origem_catalogo`) e o que os fatos
 * do sistema já resolveram. Nada aqui conclui tarefa — uma sugestão dispensada
 * volta a aparecer se o fato deixar de valer (o casal excluiu todas as mesas),
 * porque a conta é determinística e não guarda estado.
 */
export function sugestoesQueFaltam(
  chavesJaCriadas: readonly string[],
  fatos: readonly FatoObservado[],
): readonly TarefaSugerida[] {
  const criadas = new Set(chavesJaCriadas)
  const observados = new Set<string>(fatos)

  return TAREFAS_SUGERIDAS.filter(
    (tarefa) =>
      !criadas.has(tarefa.chave) && !(tarefa.dispensadaPor && observados.has(tarefa.dispensadaPor)),
  )
}
