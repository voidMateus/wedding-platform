import {
  FAIXA_ETARIA_NAO_INFORMADA,
  FAIXA_ETARIA_ROTULOS,
  FAIXA_ETARIA_ROTULOS_PLURAL,
  FAIXA_ETARIA_ROTULO_NAO_INFORMADA,
  classificarFaixaEtaria,
  resolverFaixasEtarias,
  type ClassificacaoFaixaEtaria,
  type ConvidadoClassificavel,
} from '#shared/utils/faixa-etaria'

/** Copy da procedência da classificação — o casal precisa saber de onde saiu o valor. */
const ROTULO_ORIGEM: Record<ClassificacaoFaixaEtaria['origem'], string> = {
  calculada: 'Calculada automaticamente pela data de nascimento',
  manual: 'Informada manualmente',
  nao_informada: 'Sem data de nascimento nem faixa informada',
}

/**
 * Classificação etária no client: as faixas configuradas do evento + a data do
 * casamento, já costuradas com a função de domínio (CLAUDE.md, seção 12).
 *
 * Lê o casamento pela mesma chave 'wedding' de useWedding() — dedup automático,
 * sem fetch extra, e sem repetir a resolução do jsonb em cada tela que exibe,
 * conta ou filtra por faixa.
 */
export function useAgeGroups() {
  const { getWedding } = useWedding()
  const { data: wedding } = getWedding()

  const faixas = computed(() => resolverFaixasEtarias(wedding.value?.config_faixas_etarias))
  const dataEvento = computed(() => wedding.value?.data_evento ?? null)

  function classify(convidado: ConvidadoClassificavel): ClassificacaoFaixaEtaria {
    return classificarFaixaEtaria(convidado, faixas.value, dataEvento.value)
  }

  /** Rótulo pronto para a tela ("Criança", "Não informada"). */
  function label(chave: ClassificacaoFaixaEtaria['chave']): string {
    return chave ? FAIXA_ETARIA_ROTULOS[chave] : FAIXA_ETARIA_ROTULO_NAO_INFORMADA
  }

  function originLabel(origem: ClassificacaoFaixaEtaria['origem']): string {
    return ROTULO_ORIGEM[origem]
  }

  /**
   * Opções para informar a faixa à mão — as faixas ATIVAS do evento, na ordem
   * delas.
   *
   * Vinham do catálogo (`FAIXA_ETARIA_CHAVES`, sempre as quatro), então um
   * casamento que desligou Adolescente e Idoso continuava oferecendo as duas:
   * o casal escolhia uma categoria que nenhuma outra tela exibe, porque a
   * leitura resolve a faixa desligada para a que herdou o território
   * (`faixaAtivaEquivalente`). Quais faixas o evento usa é decisão do evento —
   * um seletor que ignora isso não mostra uma lista desatualizada, mostra uma
   * escolha que não existe.
   *
   * Não tem entrada vazia: "não informada" é a ausência das outras, e limpar é
   * ação própria de quem já escolheu algo, não um item de lista.
   */
  const manualOptions = computed(() =>
    faixas.value.map((faixa) => ({
      value: faixa.chave,
      label: FAIXA_ETARIA_ROTULOS[faixa.chave],
    })),
  )

  /** Recortes da listagem de convidados, na ordem das faixas do evento. */
  const filterChips = computed(() => [
    { value: '', label: 'Todas as idades' },
    ...faixas.value.map((faixa) => ({
      value: faixa.chave,
      label: FAIXA_ETARIA_ROTULOS_PLURAL[faixa.chave],
    })),
    { value: FAIXA_ETARIA_NAO_INFORMADA, label: FAIXA_ETARIA_ROTULO_NAO_INFORMADA },
  ])

  return { faixas, dataEvento, classify, label, originLabel, manualOptions, filterChips }
}
