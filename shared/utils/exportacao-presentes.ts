import { serializarCsv } from '#shared/utils/csv'
import { formatCentsToAmount } from '#shared/utils/format-currency'

/**
 * Exportação da lista de presentes em CSV.
 *
 * **Gerada no navegador**, ao contrário da exportação de convidados, e a
 * diferença não é de gosto: a listagem de convidados é paginada, então exportar
 * exige uma leitura NOVA e completa no servidor — que é um acesso a mais a
 * dado pessoal, e por isso vai para a trilha de auditoria. A de presentes já
 * chega inteira ao navegador do casal numa requisição só (`GET /api/gifts`), e
 * os recortes da tela são aplicados ali mesmo. Recalcular tudo num endpoint
 * significaria reimplementar no servidor o status e o "reservado por" que a
 * tela deriva — duas verdades para o mesmo número, que é o erro que este
 * projeto evita em todo lugar.
 *
 * Puro e em `shared/` para ser testável sem montar a página.
 */

export interface PresenteExportavel {
  titulo: string
  categoriaNome: string | null
  /** `true` = presente de cota (contribuição); `false` = presente físico. */
  ePresenteCota: boolean
  status: string
  /** Preço do físico ou valor-alvo da cota, em centavos. */
  valorCentavos: number | null
  /** Quanto já entrou (contribuições confirmadas), em centavos. */
  arrecadadoCentavos: number | null
  quantidadeDisponivel: number | null
  /** Nomes de quem presenteou, na ordem em que a tela os mostra. */
  presenteadoPor: string[]
}

const COLUNAS = [
  'Presente',
  'Categoria',
  'Tipo',
  'Status',
  'Valor (R$)',
  'Arrecadado (R$)',
  'Quantidade disponível',
  'Presenteado por',
] as const

export function gerarCsvPresentes(presentes: PresenteExportavel[]): string {
  const linhas: string[][] = [[...COLUNAS]]

  for (const presente of presentes) {
    linhas.push([
      presente.titulo,
      presente.categoriaNome ?? '',
      presente.ePresenteCota ? 'Cota' : 'Físico',
      presente.status,
      centavosOuVazio(presente.valorCentavos),
      centavosOuVazio(presente.arrecadadoCentavos),
      // Cota não tem quantidade: deixar "0" aqui faria a planilha dizer
      // "esgotado" sobre um presente que aceita contribuição para sempre.
      presente.ePresenteCota ? '' : quantidadeOuVazio(presente.quantidadeDisponivel),
      // Um campo só, com os nomes separados por vírgula: uma coluna por
      // presenteador obrigaria a largura da planilha a seguir o presente mais
      // popular do casamento.
      presente.presenteadoPor.join(', '),
    ])
  }

  return serializarCsv(linhas)
}

/**
 * Número em formato brasileiro e SEM o "R$": a coluna já diz a moeda no
 * cabeçalho, e o prefixo faria o Excel ler a célula como texto — o casal não
 * conseguiria somar a coluna, que é a primeira coisa que se faz com ela.
 */
function centavosOuVazio(centavos: number | null): string {
  return centavos === null ? '' : formatCentsToAmount(centavos)
}

function quantidadeOuVazio(quantidade: number | null): string {
  return quantidade === null ? '' : String(quantidade)
}

/** `presentes-2026-09-13.csv` — a data no nome evita sobrescrever a anterior. */
export function nomeDoArquivoDePresentes(agora: Date): string {
  return `presentes-${agora.toISOString().slice(0, 10)}.csv`
}
