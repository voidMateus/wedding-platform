import type { Page } from '@playwright/test'
import { getServiceRoleClient } from '../../integration/helpers/supabase-clients'
import { createTestWedding, deleteTestWedding } from '../../factories/wedding'
import { createTestMember, TEST_MEMBER_PASSWORD } from '../../factories/member'
import {
  createTestBudgetCategory,
  createTestExpense,
  createTestInstallment,
  createTestVendor,
} from '../../factories/finance'
import type { Database } from '~/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Uma conta de casal descartável, criada pela própria suíte.
 *
 * ## Por que isto existe
 *
 * Sete specs dependiam de `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` — duas
 * variáveis que **nunca estiveram no `.env`**, nem aqui nem no CI. O efeito não
 * era uma suíte vermelha, era pior: `test.skip` no topo do arquivo, e
 * `npx playwright test` terminando "5 passed, 7 skipped". Verde, sem ter
 * coberto login, o fluxo convidado→convite→RSVP, o Financeiro nem o
 * onboarding — e fácil de confundir com suíte completa.
 *
 * Três specs já resolviam isso sozinhos (`casamento-ativo`, `modo-lista`,
 * `acompanhantes`), criando o próprio usuário com `service_role`. Este helper
 * é aquele padrão extraído: exige só `SUPABASE_SERVICE_ROLE_KEY`, que é a mesma
 * credencial que o `npm run dev` já precisa para subir.
 *
 * ## O que muda além de "parar de pular"
 *
 * Cada spec passa a **semear o que precisa**. Os testes do Financeiro
 * procuravam um gasto chamado "Celebrante" que existia no banco de dev por
 * acaso — e sumiram no dia em que aquela conta foi limpa. Um teste que depende
 * de dado que ninguém criou de propósito não está testando a regra, está
 * testando o histórico do ambiente.
 */

export type AdminClient = SupabaseClient<Database>

/** A mesma senha da fábrica de membro — a conta vive minutos e nunca sai do teste. */
const SENHA = TEST_MEMBER_PASSWORD

export interface ContaDeTeste {
  admin: AdminClient
  casamentoId: string
  slug: string
  email: string
  senha: string
  usuarioId: string
  /** Apaga usuário e casamento — o `on delete cascade` leva o resto junto. */
  limpar: () => Promise<void>
}

/**
 * Cria casamento + usuário dono, já publicado.
 *
 * Publicado porque é o estado que quase todo teste descreve; quem quer exercer
 * o portão do rascunho passa `status_ciclo_vida: 'rascunho'` no override
 * (docs/fase4-onboarding.md seção 8).
 */
export async function criarContaDeTeste(
  overrides: Parameters<typeof createTestWedding>[1] = {},
): Promise<ContaDeTeste> {
  const admin = getServiceRoleClient()
  const casamento = await createTestWedding(admin, {
    nomes_noivos: 'Teste & E2E',
    ...overrides,
  })

  // `createTestMember` e não uma criação própria: ele já desfaz o usuário de
  // auth quando uma etapa seguinte falha — a Auth Admin API devolve rate limit
  // sob carga concorrente (observado ao rodar a suíte em paralelo), e usuário
  // órfão em auth.users não é limpo por cascata nenhuma.
  let membro: Awaited<ReturnType<typeof createTestMember>>
  try {
    membro = await createTestMember(admin, casamento.id, 'dono')
  } catch (erro) {
    await deleteTestWedding(admin, casamento.id)
    throw erro
  }

  const { email, userId: usuarioId } = membro

  return {
    admin,
    casamentoId: casamento.id,
    slug: casamento.slug,
    email,
    senha: SENHA,
    usuarioId,
    limpar: async () => {
      // Ordem importa pouco (o cascata cuida das filhas), mas o usuário sai
      // primeiro para nunca sobrar conta órfã em auth.users — dev já acumulou
      // algumas assim.
      await admin.auth.admin.deleteUser(usuarioId).catch(() => {})
      await deleteTestWedding(admin, casamento.id).catch(() => {})
    },
  }
}

/** Faz login pela tela e devolve o slug do casamento ativo. */
export async function entrarComo(page: Page, conta: ContaDeTeste): Promise<string> {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.getByLabel('E-mail').fill(conta.email)
  await page.getByLabel('Senha').fill(conta.senha)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  // Membership única: o middleware redireciona direto para o casamento.
  await page.waitForURL(/\/admin\/[^/]+$/, { timeout: 20_000 })
  return conta.slug
}

/**
 * Digita num `UiTimePicker`.
 *
 * Existe porque `fill()` não funciona ali e **falha em silêncio**: o campo é um
 * TimeField do Reka, feito de dois `role="spinbutton"` (`hour` e `minute`) que
 * são `div`, e o seletor por rótulo resolve para um input escondido do
 * primitive. O `fill` escreve nesse input, o componente ignora, e o teste segue
 * como se tivesse preenchido — foi exatamente assim que um teste desta suíte
 * passou por três execuções sem nunca ter digitado um horário.
 */
export async function preencherHorario(page: Page, hhmm: string): Promise<void> {
  const [hora = '', minuto = ''] = hhmm.split(':')
  await page.getByRole('spinbutton', { name: /hour/i }).click()
  // Digitar a hora avança sozinho para o minuto — é o comportamento do
  // primitive, e o mesmo que o casal tem no teclado.
  await page.keyboard.type(hora)
  await page.keyboard.type(minuto)
}

/**
 * O cenário que os testes do Financeiro descrevem.
 *
 * Os nomes não são decorativos: cada gasto representa uma FASE, e é a fase que
 * decide qual número a linha mostra (`numeroDoGasto`). Os valores também não —
 * "Bebidas" precisa somar exatamente R$ 1.620,00 de R$ 1.800,00 porque é isso
 * que o teste de Categorias afirma.
 *
 * Tudo isto vivia no banco de desenvolvimento, criado à mão em algum momento
 * que ninguém registrou. Os testes liam o que encontrassem, e caíram todos
 * juntos no dia em que aquela conta foi limpa — sem nenhuma regra do produto
 * ter mudado. Agora o cenário mora no repositório, onde pode ser lido junto
 * com o teste que depende dele.
 *
 * As categorias usam os nomes do catálogo (`shared/orcamento-categorias.ts`)
 * porque a tela oferece sugestões por NOME de categoria: "Música" precisa se
 * chamar exatamente assim para oferecer "Som e iluminação de pista".
 */
export async function semearFinanceiro(conta: ContaDeTeste): Promise<void> {
  const { admin, casamentoId } = conta

  const categoria = async (nome: string, teto: number, ordem: number) =>
    createTestBudgetCategory(admin, casamentoId, {
      nome,
      valor_previsto_centavos: teto,
      ordem_exibicao: ordem,
    })

  const bebidas = await categoria('Bebidas', 180_000, 1)
  const cerimonia = await categoria('Cerimônia e assessoria', 400_000, 2)
  const decoracao = await categoria('Decoração e flores', 300_000, 3)
  const buffet = await categoria('Buffet', 900_000, 4)
  // "Música" existe para os testes que criam gasto dentro dela. Nenhum outro
  // afirma os totais dela de propósito — é o que permite criar ali sem
  // derrubar quem roda em paralelo.
  await categoria('Música', 250_000, 5)

  // --- Bebidas: o gasto CONTRATADO com propostas concorrentes -------------
  //
  // O par que a linha de Categorias exibe é "contratado de ESTIMADO", não de
  // teto: R$ 1.620,00 fechados contra R$ 1.800,00 planejados — um gasto que
  // saiu mais barato do que a estimativa, que é o caso comum.
  const refrigerantes = await createTestExpense(admin, casamentoId, {
    descricao: 'Refrigerantes',
    categoria_id: bebidas.id,
    valor_estimado_centavos: 180_000,
    valor_centavos: 162_000,
  })

  const vencedora = await createTestVendor(admin, casamentoId, {
    nome: 'Atacado do Zé',
    despesa_id: refrigerantes.id,
    categoria_id: bebidas.id,
    valor_proposto_centavos: 95_000,
    estagio: 'contratado',
  })
  // Contratar grava o vínculo nos DOIS sentidos — com um só, a mesma
  // contratação ganha duas descrições diferentes em duas telas.
  await admin.from('despesas').update({ fornecedor_id: vencedora.id }).eq('id', refrigerantes.id)

  for (const [nome, valor] of [
    ['Distribuidora Sul', 120_000],
    ['Bebidas Express', 140_000],
  ] as const) {
    await createTestVendor(admin, casamentoId, {
      nome,
      despesa_id: refrigerantes.id,
      categoria_id: bebidas.id,
      valor_proposto_centavos: valor,
    })
  }

  // A ficha mostra a seção Pagamentos porque este gasto tem parcela.
  await createTestInstallment(admin, casamentoId, refrigerantes.id, {
    numero: 1,
    valor_centavos: 162_000,
    vence_em: '2027-10-15',
  })

  // --- Contratado SEM parcela: precisa aparecer em Pagamentos assim mesmo --
  await createTestExpense(admin, casamentoId, {
    descricao: 'Celebrante',
    categoria_id: cerimonia.id,
    valor_estimado_centavos: 150_000,
    valor_centavos: 180_000,
  })

  // --- Só PLANEJADO: nunca aparece em Pagamentos --------------------------
  //
  // Também é o alvo do teste que arquiva uma proposta e a traz de volta, por
  // isso tem uma proposta em aberto e nenhum valor fechado.
  const flores = await createTestExpense(admin, casamentoId, {
    descricao: 'Flores da cerimônia',
    categoria_id: decoracao.id,
    valor_estimado_centavos: 90_000,
  })
  await createTestVendor(admin, casamentoId, {
    nome: 'Floricultura Bela Flor',
    despesa_id: flores.id,
    categoria_id: decoracao.id,
    valor_proposto_centavos: 88_000,
  })

  // --- Parcela PAGA: alimenta a faixa "Pagos", recolhida por ser histórico -
  const aliancas = await createTestExpense(admin, casamentoId, {
    descricao: 'Alianças',
    categoria_id: cerimonia.id,
    valor_estimado_centavos: 400_000,
    valor_centavos: 420_000,
  })
  await createTestInstallment(admin, casamentoId, aliancas.id, {
    numero: 1,
    valor_centavos: 420_000,
    vence_em: '2027-05-20',
    pago_em: '2027-05-18',
  })

  // --- Fornecedor contratado, e a parcela em aberto de 06 de setembro -----
  //
  // O vencimento é o que identifica a linha no teste da baixa: marcar "a
  // primeira em aberto" e depois clicar no primeiro "Desfazer" da tela
  // desfazia o pagamento de outra linha.
  const buffetGasto = await createTestExpense(admin, casamentoId, {
    descricao: 'Buffet — 120 pessoas',
    categoria_id: buffet.id,
    valor_estimado_centavos: 800_000,
    valor_centavos: 860_000,
  })
  const buffetFornecedor = await createTestVendor(admin, casamentoId, {
    nome: 'Buffet Recanto',
    despesa_id: buffetGasto.id,
    categoria_id: buffet.id,
    valor_proposto_centavos: 860_000,
    estagio: 'contratado',
  })
  await admin
    .from('despesas')
    .update({ fornecedor_id: buffetFornecedor.id })
    .eq('id', buffetGasto.id)

  await createTestInstallment(admin, casamentoId, buffetGasto.id, {
    numero: 1,
    valor_centavos: 430_000,
    vence_em: '2027-09-06',
  })
  await createTestInstallment(admin, casamentoId, buffetGasto.id, {
    numero: 2,
    valor_centavos: 430_000,
    vence_em: '2027-11-06',
  })
}
