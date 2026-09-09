import { describe, expect, it, vi } from 'vitest'
import {
  expandirGruposComSubdivisoes,
  traduzirErroHierarquiaGrupo,
} from '../../../server/utils/group-hierarchy'

/**
 * A hierarquia de grupos é garantida pelo Postgres (`validar_grupo_pai()`,
 * migration 20260908090001) e validada contra o banco de dev. O que se testa
 * aqui são as duas peças que vivem em TypeScript: a tradução das exceções para
 * o casal e a expansão do recorte de grupo-pai para as subdivisões.
 */

describe('traduzirErroHierarquiaGrupo', () => {
  it('traduz cada exceção do trigger para uma frase em português', () => {
    const codigos = [
      'GRUPO_PAI_JA_E_SUBGRUPO',
      'GRUPO_COM_SUBGRUPOS',
      'GRUPO_PAI_CIRCULAR',
      'GRUPO_PAI_ARQUIVADO',
      'GRUPO_PAI_NAO_ENCONTRADO',
    ]

    for (const codigo of codigos) {
      const traduzido = traduzirErroHierarquiaGrupo(codigo)

      expect(traduzido, codigo).toBeTruthy()
      expect(traduzido, codigo).not.toContain(codigo)
    }
  })

  it('acha o código dentro da mensagem crua do Postgres', () => {
    expect(
      traduzirErroHierarquiaGrupo('new row violates ... GRUPO_PAI_JA_E_SUBGRUPO ...'),
    ).toContain('dois níveis')
  })

  // Devolver uma mensagem tranquilizadora para erro que não é da hierarquia
  // esconderia a causa real — quem chamou precisa repassar o original.
  it('devolve null para erro que não é da hierarquia', () => {
    expect(traduzirErroHierarquiaGrupo('duplicate key value violates unique constraint')).toBeNull()
  })
})

/** Client mínimo: só a cadeia que `expandirGruposComSubdivisoes` percorre. */
function clientFake(subdivisoes: { id: string }[]) {
  const inMock = vi.fn().mockResolvedValue({ data: subdivisoes, error: null })
  const client = {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ in: inMock }),
      }),
    }),
  }
  return { client, inMock }
}

describe('expandirGruposComSubdivisoes', () => {
  it('soma as subdivisões aos grupos pedidos', async () => {
    const { client } = clientFake([{ id: 'sub-1' }, { id: 'sub-2' }])

    const expandido = await expandirGruposComSubdivisoes(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client mínimo de teste
      client as any,
      'casamento-1',
      ['raiz-1'],
    )

    expect(expandido).toEqual(['raiz-1', 'sub-1', 'sub-2'])
  })

  it('não duplica quando a subdivisão já estava na seleção', async () => {
    const { client } = clientFake([{ id: 'sub-1' }])

    const expandido = await expandirGruposComSubdivisoes(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client mínimo de teste
      client as any,
      'casamento-1',
      ['raiz-1', 'sub-1'],
    )

    expect(expandido).toEqual(['raiz-1', 'sub-1'])
  })

  // Sem grupo no recorte não há nada a expandir, e uma consulta com `in` vazio
  // devolveria lista vazia — o que aqui significaria "nenhum grupo", não
  // "sem filtro de grupo".
  it('não consulta o banco quando nenhum grupo foi pedido', async () => {
    const { client } = clientFake([])

    const expandido = await expandirGruposComSubdivisoes(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- client mínimo de teste
      client as any,
      'casamento-1',
      [],
    )

    expect(expandido).toEqual([])
    expect(client.from).not.toHaveBeenCalled()
  })
})
