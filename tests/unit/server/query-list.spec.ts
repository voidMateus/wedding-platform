import { z } from 'zod'
import { describe, expect, it } from 'vitest'
import { queryList } from '../../../server/utils/schemas/query-list'

/**
 * O parâmetro multivalor dos filtros por coluna do admin. As duas
 * serializações abaixo acontecem de verdade: o `ofetch` do client manda array
 * como parâmetro repetido, e a URL da tela usa lista separada por vírgula.
 */
const schema = z.object({ faixa: queryList(z.enum(['crianca', 'adulto'])) })

describe('queryList', () => {
  it('aceita valor único', () => {
    expect(schema.parse({ faixa: 'crianca' })).toEqual({ faixa: ['crianca'] })
  })

  it('aceita parâmetro repetido (?faixa=a&faixa=b)', () => {
    expect(schema.parse({ faixa: ['crianca', 'adulto'] })).toEqual({
      faixa: ['crianca', 'adulto'],
    })
  })

  it('aceita lista separada por vírgula (?faixa=a,b)', () => {
    expect(schema.parse({ faixa: 'crianca,adulto' })).toEqual({ faixa: ['crianca', 'adulto'] })
  })

  it('apara espaços e ignora entradas vazias', () => {
    expect(schema.parse({ faixa: ' crianca , , adulto ' })).toEqual({
      faixa: ['crianca', 'adulto'],
    })
  })

  it('deduplica em vez de rejeitar — repetir é o mesmo recorte, não erro do cliente', () => {
    expect(schema.parse({ faixa: 'crianca,crianca' })).toEqual({ faixa: ['crianca'] })
  })

  it('ausente e vazio viram undefined (nenhum recorte), não lista vazia', () => {
    expect(schema.parse({})).toEqual({ faixa: undefined })
    expect(schema.parse({ faixa: '' })).toEqual({ faixa: undefined })
  })

  it('rejeita valor fora do enum, como qualquer parâmetro validado', () => {
    expect(() => schema.parse({ faixa: 'crianca,inventada' })).toThrow()
  })

  it('rejeita lista grande demais para não virar varredura cara', () => {
    const muitos = Array.from({ length: 31 }, () => 'crianca').join(',')
    // dedup deixa um só — o teto vale para valores distintos de verdade
    expect(schema.parse({ faixa: muitos })).toEqual({ faixa: ['crianca'] })

    const distintos = z.object({ ids: queryList(z.string()) })
    const trintaEUm = Array.from({ length: 31 }, (_, index) => `id-${index}`).join(',')
    expect(() => distintos.parse({ ids: trintaEUm })).toThrow()
  })
})
