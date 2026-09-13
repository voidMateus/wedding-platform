/**
 * Os modelos de mensagem do casal e as variáveis que eles aceitam.
 *
 * **Um modelo por tipo, compartilhado entre canais.** O WhatsApp usa o texto
 * puro; o e-mail, quando chegar, usará o mesmo texto dentro do layout dele. É
 * isso que impede o e-mail de nascer com um segundo texto que diverge do
 * WhatsApp no primeiro ajuste — a lição do catálogo de atalhos do Hero, onde
 * duas listas em paralelo para a mesma coisa ficaram com tamanhos diferentes
 * sem nada acusar.
 *
 * Vive em `shared/` porque a MESMA renderização roda nos dois lados: no editor
 * (a pré-visualização que o casal vê enquanto escreve) e no servidor (o texto
 * que realmente vai). Duas implementações divergiriam justamente no caso que
 * ninguém testa — a variável rara.
 */

export const TIPOS_COMUNICACAO = ['save_the_date', 'convite', 'lembrete'] as const
export type TipoComunicacao = (typeof TIPOS_COMUNICACAO)[number]

export const CANAIS_COMUNICACAO = ['whatsapp', 'email', 'outro'] as const
export type CanalComunicacao = (typeof CANAIS_COMUNICACAO)[number]

export const ROTULOS_TIPO_COMUNICACAO: Record<TipoComunicacao, string> = {
  save_the_date: 'Save the date',
  convite: 'Convite',
  lembrete: 'Lembrete',
}

export const ROTULOS_CANAL_COMUNICACAO: Record<CanalComunicacao, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  // Nunca "Manual": o casal não fez nada "manualmente" — ele entregou o
  // convite. "Outro" descreve o canal, que é o que a coluna guarda.
  outro: 'Outro',
}

/**
 * O catálogo é FECHADO. O editor só oferece estas, e o resolvedor só conhece
 * estas: uma variável inventada fica literal no texto (ver `renderizarModelo`),
 * porque é erro de digitação do casal e não motivo para recusar um envio.
 */
export const VARIAVEIS_COMUNICACAO = [
  { chave: 'nome', descricao: 'Primeiro nome de quem recebe' },
  { chave: 'casal', descricao: 'Nome do casal' },
  { chave: 'data', descricao: 'Data do casamento' },
  { chave: 'local', descricao: 'Local da primeira etapa do evento' },
  { chave: 'prazo', descricao: 'Prazo para confirmar presença' },
  { chave: 'link', descricao: 'Link do convite (com o código de acesso)' },
] as const

export type ChaveVariavelComunicacao = (typeof VARIAVEIS_COMUNICACAO)[number]['chave']

export type ValoresDeVariaveis = Partial<Record<ChaveVariavelComunicacao, string>>

/**
 * Os textos que um casamento novo já tem.
 *
 * Escritos para funcionar sem NENHUMA personalização: quem nunca abrir o
 * editor manda uma mensagem que se sustenta. É a mesma regra das mensagens do
 * site público — o padrão não é um placeholder, é conteúdo.
 *
 * Sem emoji e sem formatação do WhatsApp (`*negrito*`): o mesmo texto vai
 * virar corpo de e-mail, e asterisco solto num e-mail é lixo visual.
 */
export const MODELOS_PADRAO: Record<TipoComunicacao, string> = {
  save_the_date:
    'Oi, {{nome}}! Estamos casando em {{data}} e queremos muito você com a gente. ' +
    'Guarde a data — o convite com todos os detalhes chega em breve. {{casal}}',
  convite:
    'Oi, {{nome}}! Com muita alegria, convidamos você para o nosso casamento em {{data}}, ' +
    'em {{local}}. Todos os detalhes e a confirmação de presença estão aqui: {{link}} ' +
    'Confirme até {{prazo}}. {{casal}}',
  lembrete:
    'Oi, {{nome}}! Passando para lembrar de confirmar sua presença no nosso casamento ' +
    'até {{prazo}}. É rapidinho, por aqui: {{link}} {{casal}}',
}

/** `{{chave}}`, com espaços tolerados dentro das chaves. */
const PADRAO_VARIAVEL = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g

/**
 * Troca as variáveis conhecidas pelos valores.
 *
 * Duas regras de degradação, e as duas existem para nunca impedir um envio:
 *
 * - **Variável fora do catálogo fica literal.** `{{nomee}}` continua
 *   `{{nomee}}` no texto — feio, visível, e corrigível pelo casal. Apagá-la
 *   deixaria um buraco silencioso no meio da frase.
 * - **Variável conhecida sem valor vira string vazia.** Um casamento sem local
 *   cadastrado não pode travar o envio do convite; o que sai é a frase sem a
 *   parte do local, e o espaço duplo que sobra é limpo no fim.
 */
export function renderizarModelo(texto: string, valores: ValoresDeVariaveis): string {
  const conhecidas = new Set<string>(VARIAVEIS_COMUNICACAO.map((v) => v.chave))

  return (
    texto
      .replace(PADRAO_VARIAVEL, (original, chave: string) => {
        if (!conhecidas.has(chave)) return original
        return valores[chave as ChaveVariavelComunicacao] ?? ''
      })
      // Espaço duplo e espaço antes de pontuação são o rastro de uma variável
      // vazia: sem isto, "em {{data}}, em {{local}}" sem local deixa dois
      // espaços e uma vírgula solta. A limpeza para AQUI — costurar a frase
      // (remover a preposição órfã de "em .") exigiria entender português, e uma
      // heurística de gramática erra no texto que o próprio casal escreveu.
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .trim()
  )
}

/** O texto de um tipo: o do casal quando existe, o padrão quando não. */
export function modeloDoTipo(
  modelos: Partial<Record<TipoComunicacao, string>> | null | undefined,
  tipo: TipoComunicacao,
): string {
  const doCasal = modelos?.[tipo]?.trim()
  return doCasal || MODELOS_PADRAO[tipo]
}
