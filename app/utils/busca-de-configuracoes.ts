import { QUERY_SECAO_CONFIGURACOES, SETTINGS_SECOES } from './admin-nav'

/**
 * A busca do painel, aplicada às Configurações.
 *
 * A tela tem catorze seções e a maioria dos ajustes vive dentro de um cartão
 * cujo nome não é o que a pessoa procura: quem quer mexer na contagem
 * regressiva não pensa "Experiência" (rodada de usabilidade de 20/09/2026,
 * ponto 22). Daí os `termos` de cada seção em `SETTINGS_ASSUNTOS` — sinônimos e
 * nomes de campo, ao lado do rótulo.
 *
 * **Resolvida aqui, não no servidor.** `/api/admin/search` procura convidado,
 * convite e grupo, que são linhas do banco; isto é um catálogo estático que já
 * está no bundle. Mandá-lo para o servidor custaria uma viagem de rede para
 * comparar strings que o navegador tem na mão — e devolveria resultado mais
 * lento do que o de digitar.
 */
export interface ResultadoDeConfiguracao {
  id: string
  label: string
  sublabel: string
  href: string
}

/** Minúsculas e sem acento dos dois lados — "secao" precisa achar "Seções". */
function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

/**
 * O limite existe para que a busca não vire uma lista de tudo: com catorze
 * seções, uma consulta curta casaria com metade delas e empurraria convidados
 * e convites para fora da tela.
 */
const MAXIMO_DE_RESULTADOS = 4

export function buscarConfiguracoes(consulta: string, slug: string): ResultadoDeConfiguracao[] {
  const alvo = normalizar(consulta.trim())
  if (!alvo) return []

  return SETTINGS_SECOES.filter((secao) => {
    const rotulo = normalizar(secao.label)
    // O rótulo casa por PREFIXO de palavra e os sinônimos por conteúdo: assim
    // "ord" acha "Ordem das seções" sem que "cor" ache "Classificação etária"
    // por causa de um "cor" no meio de outra palavra.
    if (rotulo.split(/\s+/).some((palavra) => palavra.startsWith(alvo))) return true
    return secao.termos.some((termo) => normalizar(termo).includes(alvo))
  })
    .slice(0, MAXIMO_DE_RESULTADOS)
    .map((secao) => ({
      id: secao.id,
      label: secao.label,
      sublabel: `Configurações · ${secao.assunto.label}`,
      href: `/admin/${slug}/configuracoes?${QUERY_SECAO_CONFIGURACOES}=${secao.id}`,
    }))
}
