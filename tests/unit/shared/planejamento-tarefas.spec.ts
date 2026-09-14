import { describe, expect, it } from 'vitest'
import { CATEGORIAS_ORCAMENTO_SUGERIDAS } from '#shared/orcamento-categorias'
import {
  FASES_DO_PLANEJAMENTO,
  TAREFAS_SUGERIDAS,
  categoriaDoFato,
  sugestoesQueFaltam,
  tarefaSugeridaPorChave,
} from '#shared/planejamento-tarefas'

/**
 * O catálogo é o "por onde eu começo" do módulo. Os testes aqui travam o que
 * não dá para ver lendo a lista — principalmente o vínculo com as categorias do
 * orçamento, que é por NOME e portanto silencioso quando quebra.
 */
describe('catálogo de tarefas sugeridas', () => {
  const nomesDeCategoria = CATEGORIAS_ORCAMENTO_SUGERIDAS.map((categoria) => categoria.nome)

  it('toda categoria citada existe no catálogo do orçamento', () => {
    // Um nome renomeado num arquivo e não no outro não quebra nada em runtime:
    // a sugestão simplesmente deixa de ser dispensada, em silêncio.
    for (const tarefa of TAREFAS_SUGERIDAS) {
      const categoria = tarefa.dispensadaPor ? categoriaDoFato(tarefa.dispensadaPor) : null
      if (categoria) expect(nomesDeCategoria, tarefa.chave).toContain(categoria)
    }
  })

  it('toda chave é única — duas tarefas com a mesma chave colidiriam no índice', () => {
    const chaves = TAREFAS_SUGERIDAS.map((tarefa) => tarefa.chave)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  it('toda fase declarada existe, e nenhuma fase fica sem tarefa', () => {
    const fases = FASES_DO_PLANEJAMENTO.map((fase) => fase.id)
    for (const tarefa of TAREFAS_SUGERIDAS) {
      expect(fases, tarefa.chave).toContain(tarefa.fase)
    }
    for (const fase of fases) {
      expect(
        TAREFAS_SUGERIDAS.some((tarefa) => tarefa.fase === fase),
        fase,
      ).toBe(true)
    }
  })

  it('as fases estão em ordem decrescente de antecedência', () => {
    const dias = FASES_DO_PLANEJAMENTO.map((fase) => fase.diasAntes)
    expect([...dias].sort((a, b) => b - a)).toEqual(dias)
  })

  it('nenhum título se repete — duas linhas iguais na tela seriam indistinguíveis', () => {
    const titulos = TAREFAS_SUGERIDAS.map((tarefa) => tarefa.titulo.toLowerCase())
    expect(new Set(titulos).size).toBe(titulos.length)
  })
})

describe('sugestoesQueFaltam', () => {
  it('some o que o casal já criou, pela chave de origem', () => {
    const faltam = sugestoesQueFaltam(['contratar-buffet'], [])
    expect(faltam.some((tarefa) => tarefa.chave === 'contratar-buffet')).toBe(false)
  })

  it('some o que os fatos do sistema já resolveram', () => {
    const faltam = sugestoesQueFaltam([], ['tem_convite_enviado'])
    expect(faltam.some((tarefa) => tarefa.chave === 'enviar-convites')).toBe(false)
  })

  it('o fato de uma categoria contratada dispensa só a tarefa dela', () => {
    const faltam = sugestoesQueFaltam([], ['contratado:Buffet'])
    expect(faltam.some((tarefa) => tarefa.chave === 'contratar-buffet')).toBe(false)
    expect(faltam.some((tarefa) => tarefa.chave === 'contratar-musica')).toBe(true)
  })

  it('a sugestão não se esgota: o resto continua sendo oferecido', () => {
    const faltam = sugestoesQueFaltam(['contratar-buffet'], ['tem_mesa'])
    expect(faltam.length).toBe(TAREFAS_SUGERIDAS.length - 2)
  })

  it('sugestão dispensada VOLTA quando o fato deixa de valer', () => {
    // A conta é determinística e não guarda estado: o casal que excluiu todas
    // as mesas volta a ver "Montar as mesas".
    expect(sugestoesQueFaltam([], ['tem_mesa']).some((t) => t.chave === 'montar-mesas')).toBe(false)
    expect(sugestoesQueFaltam([], []).some((t) => t.chave === 'montar-mesas')).toBe(true)
  })

  it('fato observado NUNCA conclui tarefa — só deixa de sugerir', () => {
    // A tarefa que o casal criou continua na lista dele mesmo com o fato
    // presente; quem some é a SUGESTÃO, que nunca foi linha nenhuma.
    const faltam = sugestoesQueFaltam(['montar-mesas'], ['tem_mesa'])
    expect(faltam.some((tarefa) => tarefa.chave === 'montar-mesas')).toBe(false)
    expect(tarefaSugeridaPorChave('montar-mesas')).toBeDefined()
  })
})
