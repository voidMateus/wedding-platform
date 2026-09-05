import { FAIXA_ETARIA_CHAVES, FAIXA_ETARIA_ROTULOS } from './faixa-etaria'

/**
 * Catálogo central dos campos de convidado — fonte única de exportação,
 * importação e do gerador de modelo de planilha.
 *
 * Por que existe: os três recursos respondem à mesma pergunta ("quais campos
 * um convidado tem, e o que dá pra fazer com cada um?"). Com três listas
 * independentes, adicionar um campo ao cadastro exigiria lembrar de três
 * lugares — e esquecer um deles é silencioso (a coluna simplesmente não
 * aparece, ou aparece e é ignorada). Campo novo entra aqui uma vez.
 *
 * **`chave` é o contrato do CSV, não a coluna do Postgres.** A maioria
 * coincide, mas `grupo` e `convite` são vínculos resolvidos por nome
 * (`grupo_id`/`convite_id`), e `faixa_etaria_calculada`/`status_rsvp` não
 * existem em `convidados` — vêm de cálculo e de `respostas_rsvp`. Quem lê
 * `origem` sabe quais podem ser tratados genericamente (`'coluna'`) e quais
 * exigem tratamento próprio.
 */

/** O que o importador pode fazer com o campo. */
export type PapelImportacao =
  /** Aceito como valor a gravar. */
  | 'gravavel'
  /**
   * Aceito só para dizer QUAL registro atualizar — nunca gravado. Modelo de
   * criação não oferece; modelo de atualização sim.
   */
  | 'identificador'
  /** Nunca aceito na importação. Derivado ou ainda não suportado. */
  | 'nao'

/**
 * De onde o valor sai (na exportação) e para onde vai (na importação).
 * `'coluna'` é o caso genérico; os outros dois têm tratamento nomeado.
 */
export type OrigemCampo = 'coluna' | 'relacao' | 'derivado'

export interface ValorAceito {
  /** O que é gravado no banco. */
  valor: string
  /** O que uma pessoa digita na planilha — reconhecido sem diferenciar acento/caixa. */
  rotulo: string
}

/**
 * Agrupamento dos campos na tela do gerador. É apresentação, não domínio —
 * mora aqui pelo mesmo motivo que `rotulo` e `descricao`: uma lista de doze
 * caixas seguidas é uma parede de texto, e quem adiciona um campo ao catálogo
 * precisa decidir onde ele aparece no mesmo lugar em que decide tudo o mais.
 */
export type SecaoCampo = 'identificacao' | 'idade' | 'contato' | 'organizacao'

export const SECOES_CAMPOS: readonly { chave: SecaoCampo; rotulo: string }[] = [
  { chave: 'identificacao', rotulo: 'Identificação' },
  { chave: 'idade', rotulo: 'Idade' },
  { chave: 'contato', rotulo: 'Contato' },
  { chave: 'organizacao', rotulo: 'Organização' },
]

export interface CampoConvidado {
  chave: string
  rotulo: string
  /** Explica o campo no gerador e nos erros do importador. */
  descricao: string
  secao: SecaoCampo
  origem: OrigemCampo
  exportavel: boolean
  importacao: PapelImportacao
  /** Só significa algo quando `importacao === 'gravavel'`. */
  obrigatorio: boolean
  /** Cabeçalhos alternativos reconhecidos na autodetecção. */
  aliases: readonly string[]
  /** Presente só em campos de enum — alimenta ajuda e validação. */
  valores?: readonly ValorAceito[]
  /** Valor da linha de exemplo do modelo gerado. */
  exemplo?: string
}

const VALORES_FAIXA_ETARIA: readonly ValorAceito[] = FAIXA_ETARIA_CHAVES.map((chave) => ({
  valor: chave,
  rotulo: FAIXA_ETARIA_ROTULOS[chave],
}))

/**
 * Nome da linha de exemplo. É o marcador que permite ao importador reconhecer
 * e pular a linha caso o casal esqueça de apagá-la — por isso o texto é
 * autoexplicativo dentro da própria célula, e não um código opaco.
 */
export const NOME_DA_LINHA_DE_EXEMPLO = 'Maria Exemplo — apague esta linha'

export const CAMPOS_CONVIDADO: readonly CampoConvidado[] = [
  {
    chave: 'id',
    secao: 'identificacao',
    rotulo: 'Identificador',
    descricao:
      'Identificador interno do convidado. Preenchido, o importador ATUALIZA esse convidado em vez de criar um novo. Deixe em branco (ou fora da planilha) para cadastrar gente nova.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'identificador',
    obrigatorio: false,
    aliases: ['identificador', 'uuid'],
  },
  {
    chave: 'nome_completo',
    secao: 'identificacao',
    rotulo: 'Nome completo',
    descricao: 'Único campo obrigatório. Uma linha por pessoa.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: true,
    aliases: ['nome', 'nome completo', 'convidado', 'nome do convidado'],
    exemplo: NOME_DA_LINHA_DE_EXEMPLO,
  },
  {
    chave: 'apelido',
    secao: 'identificacao',
    rotulo: 'Apelido',
    descricao: 'Como a pessoa é chamada. Também entra na busca por nome.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['apelido', 'como e chamado'],
    exemplo: 'Mari',
  },
  {
    chave: 'sexo',
    secao: 'identificacao',
    rotulo: 'Sexo',
    descricao: 'Opcional.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['sexo', 'genero'],
    valores: [
      { valor: 'feminino', rotulo: 'Feminino' },
      { valor: 'masculino', rotulo: 'Masculino' },
      { valor: 'outro', rotulo: 'Outro' },
    ],
    exemplo: 'Feminino',
  },
  {
    chave: 'data_nascimento',
    secao: 'idade',
    rotulo: 'Data de nascimento',
    descricao:
      'Opcional, no formato AAAA-MM-DD. Quando preenchida, a faixa etária passa a ser calculada na data do casamento e a faixa informada à mão é ignorada.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['data de nascimento', 'nascimento', 'aniversario', 'data nascimento'],
    exemplo: '1990-05-23',
  },
  {
    chave: 'faixa_etaria_manual',
    secao: 'idade',
    rotulo: 'Faixa etária (informada)',
    descricao:
      'Use quando não souber a data de nascimento. Com data de nascimento preenchida, este valor é ignorado.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['faixa etaria', 'faixa', 'faixa etaria manual', 'idade'],
    valores: VALORES_FAIXA_ETARIA,
    exemplo: FAIXA_ETARIA_ROTULOS.adulto,
  },
  {
    chave: 'faixa_etaria_calculada',
    secao: 'idade',
    rotulo: 'Faixa etária (final)',
    descricao:
      'Classificação que vale hoje: a idade na data do casamento aplicada às faixas do evento, ou a faixa informada à mão quando não há data. Só leitura — muda sozinha quando você altera as faixas em Configurações, e por isso nunca é importada.',
    origem: 'derivado',
    exportavel: true,
    importacao: 'nao',
    obrigatorio: false,
    aliases: [],
  },
  {
    chave: 'email',
    secao: 'contato',
    rotulo: 'E-mail',
    descricao: 'Opcional. Canal para enviar o convite.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['email', 'e-mail', 'e mail', 'correio eletronico'],
    exemplo: 'maria@exemplo.com',
  },
  {
    chave: 'telefone',
    secao: 'contato',
    rotulo: 'Telefone',
    descricao: 'Opcional. Guardado exatamente como digitado.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['telefone', 'celular', 'whatsapp', 'fone', 'contato'],
    exemplo: '(11) 91234-5678',
  },
  {
    chave: 'papel_casamento',
    secao: 'organizacao',
    rotulo: 'Padrinho/Madrinha',
    descricao: 'Opcional. Deixe em branco para convidado sem papel na cerimônia.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['papel', 'padrinho', 'madrinha', 'papel no casamento'],
    valores: [
      { valor: 'padrinho', rotulo: 'Padrinho' },
      { valor: 'madrinha', rotulo: 'Madrinha' },
    ],
    exemplo: '',
  },
  {
    chave: 'observacoes',
    secao: 'organizacao',
    rotulo: 'Observações internas',
    descricao: 'Nunca exibidas ao convidado.',
    origem: 'coluna',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['observacoes', 'observacao', 'notas', 'anotacoes'],
    exemplo: '',
  },
  {
    chave: 'grupo',
    secao: 'organizacao',
    rotulo: 'Grupo',
    descricao:
      'Etiqueta livre de organização (Família da Noiva, Trabalho...). Pelo NOME, não pelo código: um grupo que ainda não existe é criado na importação, com a sua confirmação.',
    origem: 'relacao',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['grupo', 'etiqueta', 'categoria', 'lado'],
    exemplo: 'Família da Noiva',
  },
  {
    chave: 'convite',
    secao: 'organizacao',
    rotulo: 'Convite',
    descricao:
      'Quem recebeu o mesmo convite. Pessoas com o mesmo valor aqui entram no mesmo convite — é o que habilita o RSVP. Pelo NOME; um convite que ainda não existe é criado na importação, com a sua confirmação.',
    origem: 'relacao',
    exportavel: true,
    importacao: 'gravavel',
    obrigatorio: false,
    aliases: ['convite', 'familia', 'grupo de convite'],
    exemplo: 'Família Silva',
  },
  {
    chave: 'status_rsvp',
    secao: 'organizacao',
    rotulo: 'Status do RSVP',
    descricao:
      'Resposta de presença do convidado. Só leitura: quem responde é o convidado, pelo site — a importação nunca confirma presença por ele.',
    origem: 'derivado',
    exportavel: true,
    importacao: 'nao',
    obrigatorio: false,
    aliases: [],
  },
]

const POR_CHAVE = new Map(CAMPOS_CONVIDADO.map((campo) => [campo.chave, campo]))

export function campoPorChave(chave: string): CampoConvidado | undefined {
  return POR_CHAVE.get(chave)
}

/** Campos que o gerador de modelo pode oferecer como coluna a preencher. */
export function camposGravaveis(): CampoConvidado[] {
  return CAMPOS_CONVIDADO.filter((campo) => campo.importacao === 'gravavel')
}

/** O campo identificador (`id`) — separado dos graváveis de propósito. */
export function camposIdentificadores(): CampoConvidado[] {
  return CAMPOS_CONVIDADO.filter((campo) => campo.importacao === 'identificador')
}

/** Tudo que o importador aceita ver numa planilha (grava ou identifica). */
export function camposImportaveis(): CampoConvidado[] {
  return CAMPOS_CONVIDADO.filter((campo) => campo.importacao !== 'nao')
}

export function camposExportaveis(): CampoConvidado[] {
  return CAMPOS_CONVIDADO.filter((campo) => campo.exportavel)
}

/**
 * Normaliza cabeçalho para comparação: sem acento, sem caixa, sem pontuação e
 * com espaços colapsados. "E-mail", "e mail" e "EMAIL" caem no mesmo valor.
 */
export function normalizarCabecalho(texto: string): string {
  return (
    texto
      .normalize('NFD')
      // \p{M} = marcas combinantes; depois do NFD é onde os acentos ficam.
      // Escrito como propriedade Unicode, e não como intervalo literal
      // (`[̀-ͯ]`), para o código não depender de caracteres invisíveis.
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  )
}

/**
 * Descobre a qual campo um cabeçalho de planilha corresponde. Casa primeiro
 * pela chave canônica (o que o nosso próprio modelo gera), depois pelo rótulo
 * visível e pelos aliases — é o que permite aceitar a planilha que o casal já
 * tinha, sem obrigá-lo a renomear colunas.
 *
 * Campos não importáveis (derivados) casam de propósito: o importador precisa
 * reconhecê-los para AVISAR que serão ignorados, em vez de tratá-los como
 * coluna desconhecida.
 */
export function detectarCampo(cabecalho: string): CampoConvidado | undefined {
  const normalizado = normalizarCabecalho(cabecalho)
  if (!normalizado) return undefined

  return CAMPOS_CONVIDADO.find((campo) => {
    if (normalizarCabecalho(campo.chave) === normalizado) return true
    if (normalizarCabecalho(campo.rotulo) === normalizado) return true
    return campo.aliases.some((alias) => normalizarCabecalho(alias) === normalizado)
  })
}

/**
 * Converte o que veio na planilha para o valor gravado, em campo de enum.
 * Aceita tanto o rótulo ("Criança") quanto a chave ("crianca"), porque
 * exportação e digitação humana produzem coisas diferentes.
 */
export function interpretarValorDeEnum(
  campo: CampoConvidado,
  valorDigitado: string,
): string | undefined {
  if (!campo.valores) return undefined
  const normalizado = normalizarCabecalho(valorDigitado)
  if (!normalizado) return undefined

  return campo.valores.find(
    (opcao) =>
      normalizarCabecalho(opcao.valor) === normalizado ||
      normalizarCabecalho(opcao.rotulo) === normalizado,
  )?.valor
}
