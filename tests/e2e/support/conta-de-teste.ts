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
 * Os nomes não são decorativos: cada um representa uma FASE do gasto, e é a
 * fase que decide qual número a linha mostra (`numeroDoGasto`). Antes isto
 * vivia no banco de desenvolvimento, criado à mão em algum momento — e os
 * testes liam o que encontrassem.
 */
export async function semearFinanceiro(conta: ContaDeTeste): Promise<void> {
  const { admin, casamentoId } = conta

  const cerimonia = await createTestBudgetCategory(admin, casamentoId, {
    nome: 'Cerimônia',
    valor_previsto_centavos: 500_000,
    ordem_exibicao: 1,
  })
  const bebidas = await createTestBudgetCategory(admin, casamentoId, {
    nome: 'Bebidas',
    valor_previsto_centavos: 300_000,
    ordem_exibicao: 2,
  })

  // CONTRATADO e sem parcela: a linha mostra "falta pagar", e Pagamentos
  // precisa listá-lo assim mesmo — senão vira conta que só reaparece quando
  // alguém lembra.
  await createTestExpense(admin, casamentoId, {
    descricao: 'Celebrante',
    categoria_id: cerimonia.id,
    valor_estimado_centavos: 150_000,
    valor_centavos: 180_000,
  })

  // Só PLANEJADO: nunca aparece em Pagamentos.
  await createTestExpense(admin, casamentoId, {
    descricao: 'Refrigerantes',
    categoria_id: bebidas.id,
    valor_estimado_centavos: 90_000,
  })

  // Contratado COM parcela paga: alimenta a faixa "Pagos", que nasce
  // recolhida por ser histórico e não pendência.
  const decoracao = await createTestExpense(admin, casamentoId, {
    descricao: 'Decoração da igreja',
    categoria_id: cerimonia.id,
    valor_estimado_centavos: 200_000,
    valor_centavos: 220_000,
  })
  await createTestInstallment(admin, casamentoId, decoracao.id, {
    numero: 1,
    valor_centavos: 110_000,
    vence_em: '2027-06-10',
    pago_em: '2027-06-09',
  })
  await createTestInstallment(admin, casamentoId, decoracao.id, {
    numero: 2,
    valor_centavos: 110_000,
    vence_em: '2027-07-10',
  })

  // Em COTAÇÃO: duas propostas para o mesmo gasto, que é o arranjo que põe
  // concorrentes lado a lado — e a linha mostra a melhor delas.
  const musica = await createTestExpense(admin, casamentoId, {
    descricao: 'Música da cerimônia',
    categoria_id: cerimonia.id,
    valor_estimado_centavos: 120_000,
  })
  await createTestVendor(admin, casamentoId, {
    nome: 'Coral Aurora',
    despesa_id: musica.id,
    categoria_id: cerimonia.id,
    valor_proposto_centavos: 95_000,
  })
  await createTestVendor(admin, casamentoId, {
    nome: 'Quarteto Lumen',
    despesa_id: musica.id,
    categoria_id: cerimonia.id,
    valor_proposto_centavos: 140_000,
  })
}
