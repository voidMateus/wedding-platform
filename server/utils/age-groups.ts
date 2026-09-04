import type { SupabaseClient } from '@supabase/supabase-js'
import {
  FAIXA_ETARIA_NAO_INFORMADA,
  limitesNascimentoFaixaEtaria,
  resolverFaixasEtarias,
  type FaixaEtaria,
} from '#shared/utils/faixa-etaria'
import type { Database } from '~/types/database.types'

/**
 * As duas informações do evento que qualquer classificação etária exige — a
 * data do casamento (referência da idade, nunca "hoje") e as faixas
 * configuradas. Carregadas juntas porque nenhuma das duas serve sozinha.
 */
export interface AgeGroupContext {
  dataEvento: string
  faixas: FaixaEtaria[]
}

export async function loadAgeGroupContext(
  client: SupabaseClient<Database>,
  weddingId: string,
): Promise<AgeGroupContext> {
  const { data, error } = await client
    .from('casamentos')
    .select('data_evento, config_faixas_etarias')
    .eq('id', weddingId)
    .single()

  if (error) throw badRequestError(error.message)

  return {
    dataEvento: data.data_evento,
    faixas: resolverFaixasEtarias(data.config_faixas_etarias),
  }
}

/**
 * Filtro PostgREST (`.or(...)`) que recorta os convidados de uma faixa etária.
 *
 * Duas parcelas somadas: quem tem data de nascimento dentro do intervalo que
 * produz aquela idade na data do evento, **ou** quem não tem data alguma e foi
 * classificado à mão naquela faixa. A segunda parcela sempre exige
 * `data_nascimento is null` — é o que mantém no banco a mesma regra de
 * prioridade de `classificarFaixaEtaria`: data de nascimento vence a faixa
 * manual, sempre.
 */
export function buildAgeGroupFilter(ageGroup: string, context: AgeGroupContext): string {
  if (ageGroup === FAIXA_ETARIA_NAO_INFORMADA) {
    return 'and(data_nascimento.is.null,faixa_etaria_manual.is.null)'
  }

  const faixa = context.faixas.find((candidata) => candidata.chave === ageGroup)
  // Faixa que o casal removeu da configuração: nenhum convidado se classifica
  // nela, e devolver a lista inteira seria pior que devolver vazio.
  if (!faixa) return 'and(id.is.null)'

  const limites = limitesNascimentoFaixaEtaria(faixa, context.dataEvento)
  const porNascimento = [`data_nascimento.lte.${limites.nascidoAte}`]
  if (limites.nascidoDepoisDe) {
    porNascimento.push(`data_nascimento.gt.${limites.nascidoDepoisDe}`)
  }

  return [
    `and(${porNascimento.join(',')})`,
    `and(data_nascimento.is.null,faixa_etaria_manual.eq.${faixa.chave})`,
  ].join(',')
}
