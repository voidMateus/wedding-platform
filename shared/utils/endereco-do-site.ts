/**
 * O endereço do site sugerido a partir do nome do casal.
 *
 * O formulário de criação (`PlatformWeddingCreateModal`) pede o nome do casal
 * uma linha acima do endereço, e mesmo assim exigia que o operador digitasse
 * "ana-e-bruno" à mão — validando só pelo negativo, com a colisão aparecendo
 * no 409 depois do Criar (rodada de usabilidade de 20/09/2026, ponto 1).
 *
 * **Só o primeiro nome de cada lado.** "Lucas Almeida e Maria Almeida" vira
 * `lucas-e-maria`, não `lucas-almeida-e-maria-almeida`: o sobrenome é
 * justamente o que costuma se repetir entre os dois, então ele alonga o
 * endereço sem distinguir nada — e este endereço é o que o casal vai ditar por
 * telefone e escrever no convite.
 *
 * A sugestão é ponto de partida, nunca imposição: quem cria pode trocá-la, e o
 * que garante a unicidade continua sendo o `unique` de `casamentos.slug`
 * (docs/fase5-multievento.md 6.3), não esta função.
 */

/** Espelha `platformWeddingCreateSchema.slug` — sugestão que o campo recusaria não é sugestão. */
const MINIMO = 3
const MAXIMO = 60

/** Como o casal escreve o próprio nome: "Ana e Bruno", "Ana & Bruno", "Ana + Bruno". */
const CONECTOR = /\s+(?:e|&|\+)\s+/i

/**
 * O primeiro nome de um lado do casal, reduzido ao que o endereço aceita.
 *
 * `\p{M}` remove as marcas combinantes que o NFD separou — é o mesmo caminho
 * de `normalizarCabecalho()`, escrito como propriedade Unicode para o código
 * não depender de caracteres invisíveis.
 */
function primeiroNomeNoEndereco(lado: string): string {
  const primeiroNome = lado.trim().split(/\s+/)[0] ?? ''

  return primeiroNome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function sugerirEnderecoDoSite(nomesNoivos: string): string {
  const lados = nomesNoivos
    .split(CONECTOR)
    .map(primeiroNomeNoEndereco)
    .filter((lado) => lado.length > 0)

  const primeiro = lados[0]
  if (!primeiro) {
    return ''
  }

  // Um lado só ainda é um endereço válido: casal com nome escrito numa linha
  // ("Ana") não fica sem sugestão nenhuma por causa da falta do conector.
  const ultimo = lados.length > 1 ? lados[lados.length - 1] : null
  const sugestao = ultimo ? `${primeiro}-e-${ultimo}` : primeiro

  // Fora da faixa que o schema aceita, é melhor não sugerir: um campo que
  // nasce com erro dentro ensina que o formulário está quebrado.
  return sugestao.length >= MINIMO && sugestao.length <= MAXIMO ? sugestao : ''
}
