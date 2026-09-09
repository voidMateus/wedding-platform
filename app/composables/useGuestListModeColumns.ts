import { RSVP_STATUS_VALUES } from '#shared/utils/rsvp-status'
import type { GuestListItem } from '~/types/guest'
import type { AdminTableColumn } from '~/types/table'
import { compareText, type ClientColumn } from '~/utils/table-rows'

/**
 * Colunas do Modo Lista, com os acessores que o recorte no client usa e os
 * mapas de rótulo que as células leem.
 *
 * Fora da página porque é isto que faz o script dela caber: montar coluna,
 * opção de filtro, classificação etária e rótulo de núcleo é uma
 * responsabilidade só — "o que esta tabela sabe fazer" — e nenhuma parte dela
 * é orquestração de tela (CLAUDE.md, seção 6: `<script setup>` passando de
 * ~200 linhas é sinal de extrair pra composable).
 */
export function useGuestListModeColumns(convidados: MaybeRefOrGetter<readonly GuestListItem[]>) {
  const { classify, label: rotuloDeFaixa, originLabel, filterChips } = useAgeGroups()

  const listaDeConvidados = computed(() => toValue(convidados))

  const rotulosDeNucleo = computed(() => montarRotulosDeNucleo(listaDeConvidados.value))

  const opcoesDeNucleo = computed(() =>
    [...rotulosDeNucleo.value.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  )

  const opcoesDeStatus = RSVP_STATUS_VALUES.map((status) => ({
    value: status,
    label: rsvpStatusPresentation(status).label,
  }))

  // Classificado uma vez por linha, não a cada interpolação do template: a
  // célula lê rótulo e procedência do mesmo resultado.
  const faixaPorConvidado = computed(() => {
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
    {
      key: 'nome',
      label: 'Nome',
      filter: { type: 'text', placeholder: 'Buscar nome' },
      sort: 'alpha',
    },
    // Sem coluna "Grupo": o cabeçalho do bloco já diz de qual grupo a linha é,
    // e repetir isso em cada linha custava uma coluna inteira — que, estreita,
    // quebrava "Amigos do Trabalho" em três linhas e engordava toda a tabela.
    // O recorte por grupo também não se perde: recolher tudo e abrir um bloco
    // é o mesmo resultado, com menos cliques.
    {
      key: 'nucleo',
      label: 'Núcleo',
      filter: { type: 'select', multiple: true, options: opcoesDeNucleo.value },
    },
    {
      key: 'faixa',
      label: 'Categoria',
      filter: { type: 'select', multiple: true, options: filterChips.value },
    },
    // Sem filtro declarado: a coluna diz só se a pessoa está em algum convite,
    // e uma lista fechada de duas opções não vale um menu. Coluna sem
    // `filter`/`sort` não abre menu nenhum, que é a regra da AdminTable.
    { key: 'convite', label: 'Convite' },
    {
      key: 'rsvp',
      label: 'RSVP',
      filter: { type: 'select', multiple: true, options: opcoesDeStatus },
    },
    { key: 'observacao', label: 'Observação' },
    { key: 'acoes', label: 'Ações', align: 'right', labelHidden: true },
  ])

  const acessores = computed<Record<string, ClientColumn<GuestListItem>>>(() => {
    return {
      nome: {
        value: (row) => row.nome_completo,
        compare: compareText((row) => row.nome_completo),
      },
      nucleo: { value: (row) => row.nucleo_id },
      faixa: { value: (row) => faixaPorConvidado.value.get(row.id)?.chave },
      rsvp: { value: (row) => row.status_rsvp },
    }
  })

  function rotuloDeNucleo(convidado: GuestListItem): string {
    if (!convidado.nucleo_id) return '—'
    return rotulosDeNucleo.value.get(convidado.nucleo_id) ?? '—'
  }

  return { colunas, acessores, faixaPorConvidado, rotuloDeNucleo }
}
