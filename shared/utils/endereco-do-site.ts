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

/**
 * O primeiro endereço livre a partir de uma base: `ana-e-joao`, `ana-e-joao-2`,
 * `ana-e-joao-3`...
 *
 * Existe porque sugerir e reprovar a própria sugestão é pior do que não
 * sugerir: "Ana e João" é um nome comum, e o segundo casal Ana e João lia o
 * sistema oferecer um endereço e recusá-lo na linha seguinte. Quem sugere
 * precisa sugerir algo utilizável.
 *
 * Sufixo numérico, e não o ano do evento — que seria mais bonito: a data é
 * preenchida DEPOIS do endereço no formulário, então na hora de sugerir ela
 * quase sempre está vazia, e um desempate que às vezes existe e às vezes não é
 * pior que um que sempre funciona.
 *
 * Devolve `null` quando desiste: aí o campo fica com a base e a tela diz que o
 * endereço está tomado, que é a verdade.
 */
const MAXIMO_DE_TENTATIVAS = 99

export function proximoEnderecoLivre(base: string, tomados: Iterable<string>): string | null {
  const ocupados = new Set(tomados)

  if (!ocupados.has(base)) {
    return base
  }

  for (let numero = 2; numero <= MAXIMO_DE_TENTATIVAS; numero++) {
    const sufixo = `-${numero}`
    // A base é encurtada quando o sufixo não caberia no limite do campo, e o
    // hífen solto que a fatia pode deixar no fim é removido — `ana-` não passa
    // no formato, e uma sugestão inválida não é sugestão.
    const raiz =
      base.length + sufixo.length <= MAXIMO
        ? base
        : base.slice(0, MAXIMO - sufixo.length).replace(/-+$/, '')

    // O tamanho que precisa caber na faixa do schema é o do CANDIDATO, não o da
    // raiz: `jo-2` é endereço válido, embora `jo` sozinho não fosse.
    const candidato = `${raiz}${sufixo}`
    if (raiz.length > 0 && candidato.length >= MINIMO && !ocupados.has(candidato)) {
      return candidato
    }
  }

  return null
}
