import {
  ROTULOS_CANAL_COMUNICACAO,
  ROTULOS_TIPO_COMUNICACAO,
  TIPOS_COMUNICACAO,
} from '#shared/utils/modelo-comunicacao'
import type { TipoComunicacao } from '#shared/utils/modelo-comunicacao'
import { formatDatePtBR } from '#shared/utils/format-date'
import type { LinhaDeComunicacao } from '~/types/comunicacao'
import type { AdminTableColumn } from '~/types/table'
import { compareText, type ClientColumn } from '~/utils/table-rows'

/**
 * Colunas da tela de Comunicações, com o recorte no client.
 *
 * **Uma coluna por tipo de envio**, e o filtro de cada uma é "Enviado / Não
 * enviado". É isso que faz a fila existir sem mecanismo novo: o casal filtra a
 * coluna "Convite" por "Não enviado", manda para a primeira linha, ela sai do
 * recorte no refetch e a próxima sobe. Uma fila de verdade — com estado,
 * posição e "próximo" — seria um segundo jeito de dizer o que o filtro já diz.
 *
 * Contato também é filtrável pelo mesmo motivo: "quem eu ainda não consigo
 * alcançar?" é a pergunta que leva ao trabalho de completar os cadastros.
 */
export function useCommunicationColumns() {
  // Sem parâmetro: diferente de Convidados, aqui NENHUMA opção de filtro sai
  // dos dados (grupo e núcleo saíam). "Enviado / Não enviado" e "Com WhatsApp /
  // Sem telefone" são conjuntos fechados, então as colunas não dependem da
  // lista — e um parâmetro que não se usa é um convite a passar a usar.
  const opcoesDeEnvio = [
    { value: 'enviado', label: 'Enviado' },
    { value: 'nao_enviado', label: 'Não enviado' },
  ]

  const opcoesDeContato = [
    { value: 'whatsapp', label: 'Com WhatsApp' },
    { value: 'sem_telefone', label: 'Sem telefone' },
  ]

  const colunas = computed<AdminTableColumn<LinhaDeComunicacao>[]>(() => [
    {
      key: 'nome',
      label: 'Convite',
      filter: { type: 'text', placeholder: 'Buscar convite' },
      sort: 'alpha',
    },
    {
      key: 'contato',
      label: 'Contato',
      filter: { type: 'select', multiple: true, options: opcoesDeContato },
    },
    ...TIPOS_COMUNICACAO.map((tipo) => ({
      key: tipo,
      label: ROTULOS_TIPO_COMUNICACAO[tipo],
      sort: 'alpha' as const,
      filter: { type: 'select' as const, multiple: true, options: opcoesDeEnvio },
    })),
    { key: 'acoes', label: 'Ações', align: 'right' as const, labelHidden: true },
  ])

  const acessores = computed<Record<string, ClientColumn<LinhaDeComunicacao>>>(() => ({
    nome: {
      value: (row) => row.nome,
      compare: compareText((row) => row.nome),
    },
    contato: {
      value: (row) => (row.telefoneE164 ? 'whatsapp' : 'sem_telefone'),
    },
    ...Object.fromEntries(
      TIPOS_COMUNICACAO.map((tipo) => [
        tipo,
        {
          value: (row: LinhaDeComunicacao) => (row.envios[tipo] ? 'enviado' : 'nao_enviado'),
          // Ordena pelo QUANDO, não pelo rótulo: a pergunta por trás de ordenar
          // esta coluna é "quem recebeu primeiro / há mais tempo". Quem não
          // recebeu vai para o fim — string vazia ordena antes de qualquer
          // data, então o vazio vira um marcador que perde de tudo.
          compare: compareText((row: LinhaDeComunicacao) => row.envios[tipo]?.enviadoEm ?? '~'),
        },
      ]),
    ),
  }))

  /** "12/03 · WhatsApp", ou o travessão de quem ainda não recebeu. */
  function rotuloDoEnvio(linha: LinhaDeComunicacao, tipo: TipoComunicacao): string {
    const envio = linha.envios[tipo]
    if (!envio) return '—'
    return `${formatDatePtBR(envio.enviadoEm)} · ${ROTULOS_CANAL_COMUNICACAO[envio.canal]}`
  }

  return { colunas, acessores, rotuloDoEnvio }
}
