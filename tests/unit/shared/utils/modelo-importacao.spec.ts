import { describe, expect, it } from 'vitest'
import {
  CAMPOS_CONVIDADO,
  NOME_DA_LINHA_DE_EXEMPLO,
  camposGravaveis,
  campoPorChave,
  detectarCampo,
  interpretarValorDeEnum,
} from '#shared/utils/campos-convidado'
import {
  ehLinhaDeExemplo,
  gerarModeloImportacao,
  linhaDeExemplo,
  nomeDoArquivoDoModelo,
  ordenarCampos,
  presetsModelo,
} from '#shared/utils/modelo-importacao'
import { BOM_UTF8, SEPARADOR_PADRAO, parsearCsv } from '#shared/utils/csv'

describe('catálogo de campos', () => {
  it('nunca marca campo derivado como gravável — a regra é estrutural, não convenção', () => {
    for (const campo of CAMPOS_CONVIDADO) {
      if (campo.origem === 'derivado') expect(campo.importacao).toBe('nao')
    }
  })

  it('mantém faixa etária calculada exportável e jamais importável', () => {
    const campo = campoPorChave('faixa_etaria_calculada')

    expect(campo?.exportavel).toBe(true)
    expect(campo?.importacao).toBe('nao')
  })

  it('trata `id` como identificador, não como gravável', () => {
    expect(campoPorChave('id')?.importacao).toBe('identificador')
  })

  it('tem exatamente um campo obrigatório: o nome', () => {
    const obrigatorios = CAMPOS_CONVIDADO.filter((campo) => campo.obrigatorio).map((c) => c.chave)

    expect(obrigatorios).toEqual(['nome_completo'])
  })

  it('não repete chave', () => {
    const chaves = CAMPOS_CONVIDADO.map((campo) => campo.chave)

    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('dá exemplo a todo campo gravável que entra num modelo', () => {
    for (const campo of camposGravaveis()) {
      expect(campo.exemplo, `campo ${campo.chave} sem exemplo`).toBeDefined()
    }
  })
})

describe('detectarCampo', () => {
  it('casa a chave canônica que o próprio modelo gera', () => {
    expect(detectarCampo('nome_completo')?.chave).toBe('nome_completo')
  })

  it('casa o rótulo visível', () => {
    expect(detectarCampo('Nome completo')?.chave).toBe('nome_completo')
  })

  it('ignora acento, caixa e pontuação', () => {
    expect(detectarCampo('E-MAIL')?.chave).toBe('email')
    expect(detectarCampo('e mail')?.chave).toBe('email')
    expect(detectarCampo('Observações')?.chave).toBe('observacoes')
  })

  it('casa apelidos comuns de planilha do casal', () => {
    expect(detectarCampo('celular')?.chave).toBe('telefone')
    expect(detectarCampo('whatsapp')?.chave).toBe('telefone')
    expect(detectarCampo('convidado')?.chave).toBe('nome_completo')
  })

  it('devolve indefinido para coluna que não é do domínio', () => {
    expect(detectarCampo('mesa do salao')).toBeUndefined()
    expect(detectarCampo('')).toBeUndefined()
  })
})

describe('interpretarValorDeEnum', () => {
  const faixa = campoPorChave('faixa_etaria_manual')!
  const sexo = campoPorChave('sexo')!

  it('aceita o rótulo que uma pessoa digita', () => {
    expect(interpretarValorDeEnum(faixa, 'Criança')).toBe('crianca')
    expect(interpretarValorDeEnum(sexo, 'Feminino')).toBe('feminino')
  })

  it('aceita o rótulo sem acento e em caixa alta', () => {
    expect(interpretarValorDeEnum(faixa, 'CRIANCA')).toBe('crianca')
  })

  it('aceita a chave crua que a exportação produz', () => {
    expect(interpretarValorDeEnum(faixa, 'adulto')).toBe('adulto')
  })

  it('devolve indefinido para valor fora do enum', () => {
    expect(interpretarValorDeEnum(faixa, 'bebê')).toBeUndefined()
    expect(interpretarValorDeEnum(faixa, '')).toBeUndefined()
  })
})

describe('presets de modelo', () => {
  it('nenhum preset oferece campo derivado como coluna', () => {
    for (const preset of presetsModelo()) {
      for (const chave of preset.campos) {
        expect(campoPorChave(chave)?.importacao, `${preset.chave} → ${chave}`).not.toBe('nao')
      }
    }
  })

  it('o modelo de cadastro novo não leva `id` — coluna em branco é convite a inventar valor', () => {
    expect(presetsModelo().find((p) => p.chave === 'recomendado')!.campos).not.toContain('id')
    expect(presetsModelo().find((p) => p.chave === 'completo')!.campos).not.toContain('id')
  })

  it('só o modelo de atualização leva `id`, e ele vem primeiro', () => {
    const atualizacao = presetsModelo().find((p) => p.chave === 'atualizacao')!

    expect(atualizacao.campos[0]).toBe('id')
  })

  it('o recomendado é menor que o completo — senão os dois seriam o mesmo arquivo', () => {
    const recomendado = presetsModelo().find((p) => p.chave === 'recomendado')!
    const completo = presetsModelo().find((p) => p.chave === 'completo')!

    expect(recomendado.campos.length).toBeLessThan(completo.campos.length)
  })

  it('o recomendado exige o nome e cobre contato e organização', () => {
    const campos = presetsModelo().find((p) => p.chave === 'recomendado')!.campos

    expect(campos).toContain('nome_completo')
    expect(campos).toEqual(expect.arrayContaining(['email', 'telefone', 'grupo', 'convite']))
  })
})

describe('ordenarCampos', () => {
  it('devolve na ordem do catálogo, não na ordem em que foram escolhidos', () => {
    expect(ordenarCampos(['telefone', 'nome_completo', 'email'])).toEqual([
      'nome_completo',
      'email',
      'telefone',
    ])
  })

  it('descarta campo derivado passado por engano', () => {
    expect(ordenarCampos(['nome_completo', 'faixa_etaria_calculada', 'status_rsvp'])).toEqual([
      'nome_completo',
    ])
  })

  it('ignora chave inexistente', () => {
    expect(ordenarCampos(['nome_completo', 'mesa'])).toEqual(['nome_completo'])
  })
})

describe('gerarModeloImportacao', () => {
  it('usa chave canônica no cabeçalho, não o rótulo visível', () => {
    const csv = gerarModeloImportacao(['nome_completo', 'email'])
    const [cabecalho] = parsearCsv(csv)

    expect(cabecalho).toEqual(['nome_completo', 'email'])
  })

  it('sai com `;` e BOM', () => {
    const csv = gerarModeloImportacao(['nome_completo', 'email'])

    expect(csv.startsWith(BOM_UTF8)).toBe(true)
    expect(csv).toContain(`nome_completo${SEPARADOR_PADRAO}email`)
  })

  it('leva a linha de exemplo por padrão', () => {
    expect(parsearCsv(gerarModeloImportacao(['nome_completo', 'email']))).toHaveLength(2)
  })

  it('sai só com cabeçalho quando o exemplo é dispensado', () => {
    const linhas = parsearCsv(gerarModeloImportacao(['nome_completo'], { comExemplo: false }))

    expect(linhas).toHaveLength(1)
  })

  it('deixa o `id` vazio no exemplo — preenchê-lo convidaria a inventar identificador', () => {
    const colunas = ['id', 'nome_completo']

    expect(linhaDeExemplo(colunas)[0]).toBe('')
  })
})

describe('ehLinhaDeExemplo', () => {
  it('reconhece a linha que o modelo gerou', () => {
    expect(ehLinhaDeExemplo(NOME_DA_LINHA_DE_EXEMPLO)).toBe(true)
  })

  it('reconhece mesmo com caixa e espaçamento diferentes', () => {
    expect(ehLinhaDeExemplo(NOME_DA_LINHA_DE_EXEMPLO.toUpperCase())).toBe(true)
  })

  it('não confunde com convidado de verdade', () => {
    expect(ehLinhaDeExemplo('Maria Silva')).toBe(false)
    expect(ehLinhaDeExemplo('')).toBe(false)
    expect(ehLinhaDeExemplo(undefined)).toBe(false)
  })
})

/**
 * A garantia central desta fase: o modelo que o sistema gera é sempre legível
 * pelo próprio importador. Com o teste no CI, adicionar um campo ao catálogo
 * sem suporte na leitura quebra o build em vez de virar bug de produção.
 */
describe('compatibilidade modelo ↔ importador', () => {
  for (const preset of presetsModelo()) {
    it(`o preset "${preset.rotulo}" volta 100% mapeado pela autodetecção`, () => {
      const csv = gerarModeloImportacao(preset.campos)
      const [cabecalho] = parsearCsv(csv)

      expect(cabecalho).toBeDefined()

      const naoReconhecidas = cabecalho!.filter((coluna) => !detectarCampo(coluna))
      expect(naoReconhecidas).toEqual([])

      expect(cabecalho!.map((coluna) => detectarCampo(coluna)!.chave)).toEqual(
        ordenarCampos(preset.campos),
      )
    })

    it(`a linha de exemplo do preset "${preset.rotulo}" tem valores válidos em todo enum`, () => {
      const colunas = ordenarCampos(preset.campos)
      const exemplo = linhaDeExemplo(colunas)

      colunas.forEach((chave, indice) => {
        const campo = campoPorChave(chave)!
        const valor = exemplo[indice] ?? ''
        if (!campo.valores || valor === '') return

        expect(interpretarValorDeEnum(campo, valor), `${chave} = ${valor}`).toBeDefined()
      })
    })

    it(`a linha de exemplo do preset "${preset.rotulo}" é reconhecida como exemplo`, () => {
      const colunas = ordenarCampos(preset.campos)
      const exemplo = linhaDeExemplo(colunas)
      const indiceDoNome = colunas.indexOf('nome_completo')

      expect(ehLinhaDeExemplo(exemplo[indiceDoNome])).toBe(true)
    })
  }

  it('o modelo sobrevive à ida e volta pelo Excel (aspas, acento, separador no valor)', () => {
    const csv = gerarModeloImportacao(['nome_completo', 'observacoes'])
    const linhas = parsearCsv(csv)

    expect(linhas[0]).toEqual(['nome_completo', 'observacoes'])
    expect(linhas[1]?.[0]).toBe(NOME_DA_LINHA_DE_EXEMPLO)
  })
})

describe('nomeDoArquivoDoModelo', () => {
  it('carrega o preset e a data', () => {
    expect(nomeDoArquivoDoModelo('recomendado', new Date('2026-09-04T12:00:00Z'))).toBe(
      'modelo-convidados-recomendado-2026-09-04.csv',
    )
  })
})
