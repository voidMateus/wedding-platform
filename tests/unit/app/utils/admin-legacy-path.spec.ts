import { describe, expect, it } from 'vitest'
import { resolveDestinoAdminLegado } from '../../../../app/utils/admin-legacy-path'

const UM_CASAMENTO = ['mateus-e-raquel']
const DOIS_CASAMENTOS = ['mateus-e-raquel', 'ana-e-joao']

describe('resolveDestinoAdminLegado', () => {
  it('redireciona seção legada para a URL com slug do único casamento', () => {
    expect(resolveDestinoAdminLegado('/admin/convidados', UM_CASAMENTO, null)).toBe(
      '/admin/mateus-e-raquel/convidados',
    )
  })

  it('preserva o resto do caminho', () => {
    expect(resolveDestinoAdminLegado('/admin/convidados/novo', UM_CASAMENTO, null)).toBe(
      '/admin/mateus-e-raquel/convidados/novo',
    )
    expect(resolveDestinoAdminLegado('/admin/convites/abc-123', UM_CASAMENTO, null)).toBe(
      '/admin/mateus-e-raquel/convites/abc-123',
    )
  })

  it('usa o cookie de casamento ativo quando há mais de um casamento', () => {
    expect(resolveDestinoAdminLegado('/admin/presentes', DOIS_CASAMENTOS, 'ana-e-joao')).toBe(
      '/admin/ana-e-joao/presentes',
    )
  })

  it('não redireciona com vários casamentos e cookie ausente — landing /admin resolve', () => {
    expect(resolveDestinoAdminLegado('/admin/presentes', DOIS_CASAMENTOS, null)).toBeNull()
  })

  it('ignora cookie apontando para casamento que não é mais do usuário', () => {
    expect(resolveDestinoAdminLegado('/admin/presentes', DOIS_CASAMENTOS, 'outro-casal')).toBeNull()
  })

  // Um casamento cujo slug seja literalmente o nome de uma seção legada
  // continua mandando na URL — senão o dono nunca abriria o próprio painel.
  it('não sequestra a URL de um casamento cujo slug é uma seção legada', () => {
    expect(resolveDestinoAdminLegado('/admin/convidados', ['convidados'], null)).toBeNull()
  })

  it('ignora URLs que já estão no formato novo', () => {
    expect(
      resolveDestinoAdminLegado('/admin/mateus-e-raquel/convidados', UM_CASAMENTO, null),
    ).toBeNull()
  })

  it('ignora a landing /admin e segmentos desconhecidos', () => {
    expect(resolveDestinoAdminLegado('/admin', UM_CASAMENTO, null)).toBeNull()
    expect(resolveDestinoAdminLegado('/admin/qualquer-coisa', UM_CASAMENTO, null)).toBeNull()
  })

  it('não redireciona quando o usuário não tem casamento nenhum', () => {
    expect(resolveDestinoAdminLegado('/admin/convidados', [], null)).toBeNull()
  })
})
