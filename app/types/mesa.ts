import type { FormatoDeMesa, TipoDeElemento } from '#shared/schemas/mesas'
import type { ResumoDaMesa, ResumoDoSalao } from '#shared/utils/mesas'
import type { RsvpStatus } from '#shared/utils/rsvp-status'
import type { Database } from './database.types'

export type Mesa = Database['public']['Tables']['mesas']['Row']
export type ElementoPlanta = Database['public']['Tables']['elementos_planta']['Row']

/**
 * Uma pessoa na planta de mesas — convidado ou acompanhante avulso.
 *
 * Os dois juntos porque para a mesa são a mesma coisa: uma pessoa sentada. O
 * avulso ocupa lugar (sem ele, a ocupação mente justamente no evento em lista
 * aberta) e não tem `statusRsvp`, porque só existe depois de alguém confirmar
 * por ele.
 */
export interface PessoaParaSentar {
  id: string
  nomeCompleto: string
  mesaId: string | null
  statusRsvp: RsvpStatus | null
  tipo: 'convidado' | 'avulso'
  /** Nome do convite, para reconhecer quem vai com quem ao montar a mesa. */
  conviteNome: string | null
  conviteId: string | null
  /** Núcleo de Acompanhantes — "sentar os acompanhantes" usa isto. */
  nucleoId: string | null
}

export interface MesaComOcupantes {
  id: string
  nome: string
  capacidade: number
  formato: FormatoDeMesa
  larguraCm: number
  profundidadeCm: number
  posicaoXCm: number
  posicaoYCm: number
  rotacaoGraus: number
  observacao: string | null
  ocupantes: PessoaParaSentar[]
  resumo: ResumoDaMesa
}

export interface ElementoDaPlanta {
  id: string
  tipo: TipoDeElemento
  nome: string | null
  larguraCm: number
  profundidadeCm: number
  posicaoXCm: number
  posicaoYCm: number
  rotacaoGraus: number
}

export interface SeatingResponse {
  mesas: MesaComOcupantes[]
  elementos: ElementoDaPlanta[]
  /** Quem ainda não sentou — o painel lateral da tela. */
  semMesa: PessoaParaSentar[]
  salao: {
    larguraCm: number | null
    profundidadeCm: number | null
    /** A área que a planta desenha: as medidas, ou o ajuste ao conteúdo. */
    areaLarguraCm: number
    areaProfundidadeCm: number
    definida: boolean
  }
  resumo: ResumoDoSalao
}
