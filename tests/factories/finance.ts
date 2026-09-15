import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

type AdminClient = SupabaseClient<Database>

type CategoriaInsert = Database['public']['Tables']['categorias_orcamento']['Insert']
type Categoria = Database['public']['Tables']['categorias_orcamento']['Row']
type DespesaInsert = Database['public']['Tables']['despesas']['Insert']
type Despesa = Database['public']['Tables']['despesas']['Row']
type ParcelaInsert = Database['public']['Tables']['parcelas_despesa']['Insert']
type Parcela = Database['public']['Tables']['parcelas_despesa']['Row']
type FornecedorInsert = Database['public']['Tables']['fornecedores']['Insert']
type Fornecedor = Database['public']['Tables']['fornecedores']['Row']

/**
 * Fábricas do Financeiro — as que faltavam.
 *
 * Todas as outras tabelas do produto tinham fábrica desde a suíte de
 * integração; o Financeiro não, e por isso os testes de ponta a ponta dele
 * liam o que existisse no banco de desenvolvimento. Funcionou até o dia em que
 * aquela conta foi limpa, e aí dezesseis testes passaram a falhar de uma vez —
 * sem que nenhuma regra do produto tivesse mudado.
 *
 * `cor_indice` nunca é passado: quem atribui é o trigger
 * `categorias_orcamento_atribuir_cor` (menor slot livre entre as ativas), e
 * fixá-lo aqui reproduziria em teste a decisão que o banco toma sozinho.
 */

export async function createTestBudgetCategory(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<CategoriaInsert> = {},
): Promise<Categoria> {
  const { data, error } = await admin
    .from('categorias_orcamento')
    .insert({
      casamento_id: casamentoId,
      nome: 'Categoria de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar categoria de orçamento de teste: ${error?.message}`)
  }
  return data
}

/**
 * Um gasto.
 *
 * `valor_estimado_centavos` é o planejamento e `valor_centavos` é o contrato —
 * este NULO até fechar. É preenchê-lo que transforma o gasto em compromisso,
 * o faz contar como "contratado" e o manda para Pagamentos, então um cenário
 * de teste que queira um gasto "só planejado" precisa deixá-lo nulo.
 */
export async function createTestExpense(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<DespesaInsert> = {},
): Promise<Despesa> {
  const { data, error } = await admin
    .from('despesas')
    .insert({
      casamento_id: casamentoId,
      descricao: 'Gasto de Teste',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar gasto de teste: ${error?.message}`)
  }
  return data
}

/** `pago_em` é a ÚNICA fonte do estado de pagamento — nulo é "a vencer". */
export async function createTestInstallment(
  admin: AdminClient,
  casamentoId: string,
  despesaId: string,
  overrides: Partial<ParcelaInsert> = {},
): Promise<Parcela> {
  const { data, error } = await admin
    .from('parcelas_despesa')
    .insert({
      casamento_id: casamentoId,
      despesa_id: despesaId,
      numero: 1,
      valor_centavos: 100_000,
      vence_em: '2030-01-10',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar parcela de teste: ${error?.message}`)
  }
  return data
}

/**
 * Uma proposta para UM gasto (`despesa_id`) — é o que põe as concorrentes lado
 * a lado. O valor do contrato nunca mora aqui: mora em `despesas`.
 */
export async function createTestVendor(
  admin: AdminClient,
  casamentoId: string,
  overrides: Partial<FornecedorInsert> = {},
): Promise<Fornecedor> {
  const { data, error } = await admin
    .from('fornecedores')
    .insert({
      casamento_id: casamentoId,
      nome: 'Fornecedor de Teste',
      estagio: 'cotacao_recebida',
      ...overrides,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Falha ao criar fornecedor de teste: ${error?.message}`)
  }
  return data
}
