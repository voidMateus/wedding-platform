import { RSVP_STATUS_VALUES } from '#shared/utils/rsvp-status'
import type { Group } from '~/types/group'
import type { GuestListItem } from '~/types/guest'
import type { AdminTableColumn } from '~/types/table'
import { compareText, type ClientColumn } from '~/utils/table-rows'
import type { StatusPresentation } from '~/utils/status-presentation'

/**
 * Colunas do Modo Lista, com os acessores do recorte no client e os mapas de
 * rótulo que as células leem.
 *
 * Fora da página porque é isto que faz o script dela caber: montar coluna,
 * opção de filtro, classificação etária e rótulo de núcleo é uma
 * responsabilidade só (CLAUDE.md, seção 6 — `<script setup>` passando de ~200
 * linhas é sinal de extrair pra composable).
 *
 * O recorte vive no **menu do próprio cabeçalho** de cada coluna, não numa
 * régua de filtros acima da tabela: uma régua duplicaria o que o cabeçalho já
 * oferece, e filtro em dois lugares é filtro que pode divergir. Por isso cada
 * coluna filtrável declara `filter` aqui — é essa declaração que faz a
 * `AdminTable` abrir o menu e que diz a `applyTableFilters` como comparar
 * (texto por "contém", lista fechada por igualdade).
 *
 * Grupo, núcleo, categoria e status são de **múltipla escolha**: "quem ainda
 * não respondeu ou está em espera" é uma pergunta só do casal, não duas.
 */
export function useGuestListModeColumns(
  convidados: MaybeRefOrGetter<readonly GuestListItem[]>,
  grupos: MaybeRefOrGetter<readonly Group[]>,
) {
  const { classify, label: rotuloDeFaixa, originLabel, filterChips } = useAgeGroups()

  const listaDeConvidados = computed(() => toValue(convidados))
  const listaDeGrupos = computed(() => toValue(grupos))

  const opcoesDeGrupo = computed(() => montarOpcoesDeGrupo(listaDeGrupos.value))
  const rotulosDeNucleo = computed(() => montarRotulosDeNucleo(listaDeConvidados.value))

  const opcoesDeNucleo = computed(() =>
    [...rotulosDeNucleo.value.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  )

  /** Estados de RSVP que o mapa único da plataforma conhece. */
  const opcoesDeStatus = RSVP_STATUS_VALUES.map((status) => ({
    value: status,
    label: rsvpStatusPresentation(status).label,
  }))

  // Classificado uma vez por pessoa, não a cada interpolação: a célula lê
  // rótulo e procedência do mesmo resultado.
  const categorias = computed(() => {
    const celulas = new Map<string, { chave: string; label: string; title: string }>()
    for (const convidado of listaDeConvidados.value) {
      const classificacao = classify(convidado)
      celulas.set(convidado.id, {
        chave: classificacao.chave ?? 'nao_informada',
        label: classificacao.chave ? rotuloDeFaixa(classificacao.chave) : '—',
        title: originLabel(classificacao.origem),
      })
    }
    return celulas
  })

  const colunas = computed<AdminTableColumn<GuestListItem>[]>(() => [
    { key: 'selecao', label: 'Selecionar', labelHidden: true },
    {
      key: 'nome',
      label: 'Nome',
      filter: { type: 'text', placeholder: 'Buscar nome' },
      sort: 'alpha',
    },
    {
      key: 'grupo',
      label: 'Grupo',
      sort: 'alpha',
      filter: { type: 'select', multiple: true, options: opcoesDeGrupo.value },
    },
    {
      key: 'nucleo',
      // "Acompanhantes" na tela, "núcleo" só no código: a Visão Geral já
      // chamava esta coluna assim, e duas palavras para a mesma coisa nas duas
      // formas de ver a MESMA lista obrigavam o casal a ligar as duas sozinho.
      //
      // A célula continua exibindo o rótulo do núcleo INTEIRO ("João e Maria"),
      // igual nas duas linhas do casal — é o que faz a coluna agrupar ao
      // ordenar e filtrar. Um "vem com a Maria" por linha leria melhor e
      // agruparia nada.
      label: 'Acompanhantes',
      sort: 'alpha',
      filter: { type: 'select', multiple: true, options: opcoesDeNucleo.value },
    },
    {
      key: 'faixa',
      label: 'Categoria',
      sort: 'alpha',
      filter: { type: 'select', multiple: true, options: filterChips.value },
    },
    { key: 'convite', label: 'Convite', sort: 'alpha' },
    {
      key: 'rsvp',
      label: 'RSVP',
      sort: 'alpha',
      filter: { type: 'select', multiple: true, options: opcoesDeStatus },
    },
    { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
  ])

  const acessores = computed<Record<string, ClientColumn<GuestListItem>>>(() => {
    const paiPorGrupo = new Map(listaDeGrupos.value.map((grupo) => [grupo.id, grupo.grupo_pai_id]))
    const nomePorGrupo = new Map(opcoesDeGrupo.value.map((opcao) => [opcao.value, opcao.label]))

    return {
      nome: {
        value: (row) => row.nome_completo,
        compare: compareText((row) => row.nome_completo),
      },
      // Devolve a folha E o grupo-pai: escolher "Família do Mateus" no filtro
      // tem que alcançar quem está em "Tios paternos", como `/api/guests` já
      // faz na Visão organizada (`expandirGruposComSubdivisoes`). Sem isso o
      // mesmo recorte daria resultados diferentes nas duas telas.
      grupo: {
        value: (row) => {
          if (!row.grupo_id) return []
          const pai = paiPorGrupo.get(row.grupo_id)
          return pai ? [row.grupo_id, pai] : [row.grupo_id]
        },
        compare: compareText((row) => (row.grupo_id ? nomePorGrupo.get(row.grupo_id) : '')),
      },
      nucleo: {
        value: (row) => row.nucleo_id,
        compare: compareText((row) =>
          row.nucleo_id ? rotulosDeNucleo.value.get(row.nucleo_id) : '',
        ),
      },
      faixa: {
        value: (row) => categorias.value.get(row.id)?.chave,
        compare: compareText((row) => categorias.value.get(row.id)?.label),
      },
      convite: {
        // O ESTÁGIO do convite, não 'vinculado': o casal já sabe que a pessoa
        // tem convite — o que ele precisa saber é em que ponto aquele convite
        // está. Sem convite continua sendo um valor próprio, e é o mais
        // urgente de todos (não dá nem para enviar).
        value: (row) => row.inviteStage ?? 'sem-convite',
        // Ordena pelo funil, nunca pelo alfabeto: a coluna descreve um
        // processo, e 'Aberto' antes de 'Enviado' não quer dizer nada.
        compare: compareText((row) => String(ordemDoEstagio(row)).padStart(2, '0')),
      },
      rsvp: {
        value: (row) => row.status_rsvp,
        compare: compareText((row) => rsvpStatusPresentation(row.status_rsvp).label),
      },
    }
  })

  /**
   * Posição no funil, para ordenar a coluna Convite pelo processo.
   *
   * "Sem convite" vem primeiro porque é o mais urgente de todos: sem convite
   * não dá nem para enviar, e a pessoa não alcança o RSVP.
   */
  function ordemDoEstagio(convidado: GuestListItem): number {
    if (!convidado.inviteStage) return 0
    return INVITE_STAGE_VALUES.indexOf(convidado.inviteStage) + 1
  }

  /** Rótulo da célula: o estágio do convite, ou a ausência dele. */
  function rotuloDoConvite(convidado: GuestListItem): StatusPresentation {
    if (!convidado.inviteStage) return { label: 'Sem convite', tone: 'warning' }
    return inviteStagePresentation(convidado.inviteStage)
  }

  function nomeDoGrupo(convidado: GuestListItem): string {
    if (!convidado.grupo_id) return '—'
    return opcoesDeGrupo.value.find((opcao) => opcao.value === convidado.grupo_id)?.label ?? '—'
  }

  function rotuloDeNucleo(convidado: GuestListItem): string {
    if (!convidado.nucleo_id) return '—'
    return rotulosDeNucleo.value.get(convidado.nucleo_id) ?? '—'
  }

  return { colunas, acessores, categorias, nomeDoGrupo, rotuloDeNucleo, rotuloDoConvite }
}
