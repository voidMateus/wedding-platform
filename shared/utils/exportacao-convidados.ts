import {
  camposExportaveis,
  campoPorChave,
  rotuloDeValor,
  type CampoConvidado,
} from './campos-convidado'
import { serializarCsv } from './csv'
import { classificarFaixaEtaria, rotuloFaixaEtaria, type FaixaEtaria } from './faixa-etaria'

/**
 * Montagem do CSV de exportação de convidados.
 *
 * Consome o mesmo catálogo do importador e do gerador de modelo: as colunas
 * exportadas são exatamente os campos `exportavel`, na ordem do catálogo.
 * Campo novo no cadastro aparece aqui sem nenhuma alteração deste arquivo.
 *
 * Função pura de propósito — a consulta ao banco fica no endpoint, e a
 * tradução linha→CSV fica aqui, testável sem Supabase.
 */

/**
 * A linha de `convidados` mais o que vem por junção. Os quatro últimos campos
 * não são colunas: `grupo`/`convite` são o **nome** por trás de
 * `grupo_id`/`convite_id`, e o status vem de `respostas_rsvp`.
 *
 * `grupoNome` é sempre o nome da RAIZ e `subgrupoNome` o da subdivisão, quando
 * há uma. O convidado aponta para a folha (`convidados.grupo_id`), então quem
 * monta estas duas propriedades precisa subir até o pai antes — exportar só a
 * folha faria a reimportação recriar "Tios paternos" como grupo de primeiro
 * nível, perdendo a hierarquia em silêncio.
 */
export interface ConvidadoExportavel {
  id: string
  nome_completo: string
  apelido: string | null
  sexo: string | null
  data_nascimento: string | null
  faixa_etaria_manual: string | null
  email: string | null
  telefone: string | null
  papel_casamento: string | null
  observacoes: string | null
  grupoNome: string | null
  subgrupoNome: string | null
  conviteNome: string | null
  statusRsvp: string | null
}

export interface ContextoExportacao {
  faixas: readonly FaixaEtaria[]
  dataEvento: string | null
}

/**
 * Valor de uma célula. O `switch` existe porque só os campos de `origem:
 * 'coluna'` são leitura direta — os de `'relacao'` chegam por junção e os de
 * `'derivado'` são calculados aqui, na mesma regra que a tela aplica.
 */
export function valorExportado(
  campo: CampoConvidado,
  convidado: ConvidadoExportavel,
  contexto: ContextoExportacao,
): string {
  switch (campo.chave) {
    case 'grupo':
      return convidado.grupoNome ?? ''
    case 'subgrupo':
      return convidado.subgrupoNome ?? ''
    case 'convite':
      return convidado.conviteNome ?? ''
    case 'status_rsvp':
      // Sem linha em `respostas_rsvp` o convidado ainda não respondeu — é
      // "Pendente", não vazio: vazio sugeriria dado faltando.
      return rotuloDeValor('status_rsvp', convidado.statusRsvp ?? 'pendente')
    case 'faixa_etaria_calculada': {
      // Mesma função da listagem e do formulário: a idade na data do evento
      // contra as faixas configuradas, com a faixa manual valendo só na
      // ausência de data de nascimento (CLAUDE.md, seção 12).
      const classificacao = classificarFaixaEtaria(convidado, contexto.faixas, contexto.dataEvento)
      return classificacao.chave ? rotuloFaixaEtaria(classificacao.chave) : ''
    }
    case 'sexo':
    case 'faixa_etaria_manual':
    case 'papel_casamento':
      // Enum sai com o rótulo legível ("Criança", não "crianca") — a planilha
      // é lida por gente. O importador aceita as duas formas de volta.
      return rotuloDeValor(campo.chave, convidado[campo.chave as 'sexo'])
    default: {
      const valor = (convidado as unknown as Record<string, unknown>)[campo.chave]
      return valor === null || valor === undefined ? '' : String(valor)
    }
  }
}

export function montarLinhasExportacao(
  convidados: readonly ConvidadoExportavel[],
  contexto: ContextoExportacao,
): string[][] {
  const campos = camposExportaveis()

  return [
    campos.map((campo) => campo.chave),
    ...convidados.map((convidado) =>
      campos.map((campo) => valorExportado(campo, convidado, contexto)),
    ),
  ]
}

export function gerarCsvExportacao(
  convidados: readonly ConvidadoExportavel[],
  contexto: ContextoExportacao,
): string {
  return serializarCsv(montarLinhasExportacao(convidados, contexto))
}

/** `convidados-2026-09-04.csv` */
export function nomeDoArquivoDaExportacao(hoje: Date): string {
  return `convidados-${hoje.toISOString().slice(0, 10)}.csv`
}

/**
 * Colunas que a exportação produz mas o importador não aceita de volta — a
 * tela usa isto para avisar antes que alguém edite a planilha exportada e
 * tente reimportá-la inteira.
 */
export function colunasSomenteLeitura(): string[] {
  return camposExportaveis()
    .filter((campo) => campo.importacao === 'nao')
    .map((campo) => campo.rotulo)
}

/** Confere que uma chave existe no catálogo — guarda de chamada programática. */
export function ehCampoExportavel(chave: string): boolean {
  return campoPorChave(chave)?.exportavel === true
}
