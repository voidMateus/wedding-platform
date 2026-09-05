import { describe, expect, it } from 'vitest'
import { buildAgeGroupFilter } from '../../../server/utils/age-groups'
import { FAIXAS_ETARIAS_PADRAO } from '#shared/utils/faixa-etaria'

/**
 * O recorte por faixa etária de /api/guests é resolvido no banco, como
 * intervalo de datas de nascimento — nunca classificando em memória, que
 * quebraria a paginação e a contagem de confirmados do cabeçalho.
 */
const context = {
  dataEvento: '2027-05-16',
  faixas: FAIXAS_ETARIAS_PADRAO.map((faixa) => ({ ...faixa })),
}

describe('buildAgeGroupFilter', () => {
  it('faixa fechada: intervalo de nascimento nos dois extremos, mais a faixa manual', () => {
    expect(buildAgeGroupFilter('crianca', context)).toBe(
      'and(data_nascimento.lte.2027-05-16,data_nascimento.gt.2015-05-16),' +
        'and(data_nascimento.is.null,faixa_etaria_manual.eq.crianca)',
    )
  })

  it('faixa aberta no topo: só o extremo superior de nascimento', () => {
    expect(buildAgeGroupFilter('idoso', context)).toBe(
      'and(data_nascimento.lte.1967-05-16),' +
        'and(data_nascimento.is.null,faixa_etaria_manual.eq.idoso)',
    )
  })

  it('a faixa manual só conta quando não há data de nascimento — a data tem prioridade', () => {
    // A mesma regra de classificarFaixaEtaria, agora no banco: sem o
    // `data_nascimento.is.null`, quem tem data e faixa manual divergentes
    // apareceria nos dois recortes.
    for (const chave of ['crianca', 'adolescente', 'adulto', 'idoso']) {
      expect(buildAgeGroupFilter(chave, context)).toContain(
        `and(data_nascimento.is.null,faixa_etaria_manual.eq.${chave})`,
      )
    }
  })

  it('"não informada" é ausência das duas informações', () => {
    expect(buildAgeGroupFilter('nao_informada', context)).toBe(
      'and(data_nascimento.is.null,faixa_etaria_manual.is.null)',
    )
  })

  it('faixa que não existe na configuração do evento devolve recorte vazio, nunca a lista inteira', () => {
    const semIdoso = {
      ...context,
      faixas: context.faixas.filter((faixa) => faixa.chave !== 'idoso'),
    }
    expect(buildAgeGroupFilter('idoso', semIdoso)).toBe('and(id.is.null)')
  })

  it('acompanha os limites configurados — criança até 7 recorta outro intervalo', () => {
    const criancaAte7 = {
      ...context,
      faixas: [{ chave: 'crianca' as const, idadeMinima: 0, idadeMaxima: 7 }],
    }
    expect(buildAgeGroupFilter('crianca', criancaAte7)).toContain('data_nascimento.gt.2019-05-16')
  })
})
