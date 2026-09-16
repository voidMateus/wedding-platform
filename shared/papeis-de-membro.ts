/**
 * Os papéis de `membros_casamento`, e quem alcança quem
 * (docs/fase5-multievento.md 4.2).
 *
 * ## Escada, não matriz
 *
 * O papel `planejador` não é "vê menos" que o colaborador — uma assessora vê
 * MAIS dinheiro que o irmão da noiva, porque é ela quem negocia com o
 * fornecedor. O único privilégio que muda de mão é **gente**: ela convida e
 * remove colaboradores do evento sem precisar pedir ao casal a cada
 * contratação. Todo o resto continua sendo `is_membro_casamento`.
 *
 * Um membro alcança todo papel ABAIXO do seu — e o dono alcança também os
 * outros donos, porque o casal são dois e um precisa poder remover o outro
 * (é o comportamento que sempre existiu, e perdê-lo seria uma regressão
 * silenciosa). Disso decorre, de graça, que ninguém se promove: o papel
 * concedido também precisa ser alcançável por quem concede.
 *
 * ## Par em SQL
 *
 * `posto_do_papel(text)` e `pode_gerenciar_papel(uuid, text)` são os gêmeos
 * deste arquivo no banco (migration `20260915100001`). **Os dois se movem
 * juntos ou a regra passa a ter duas versões** — mesmo tipo de par que
 * `TAMANHO_PALETA_CATEGORIAS` tem com o `generate_series` das funções de cor.
 * `tests/unit/shared/papeis-de-membro.spec.ts` trava a lista contra o `CHECK`.
 */

export const PAPEIS_DE_MEMBRO = ['dono', 'planejador', 'colaborador'] as const

export type PapelDeMembro = (typeof PAPEIS_DE_MEMBRO)[number]

/** Quanto mais alto, mais alcance. Espelha `posto_do_papel()` no Postgres. */
const POSTO: Record<PapelDeMembro, number> = {
  dono: 3,
  planejador: 2,
  colaborador: 1,
}

export function postoDoPapel(papel: PapelDeMembro): number {
  return POSTO[papel]
}

/**
 * A única autoridade semântica sobre "quem pode gerenciar quem"
 * (docs/fase5-multievento.md 4.5).
 *
 * Nenhuma rota compara `papel` na mão para decidir autorização — não por
 * combinado, mas porque `tests/unit/server/escada-de-papeis.spec.ts` varre
 * `server/api/**` e falha quando alguma o faz.
 */
export function podeGerenciarPapel(ator: PapelDeMembro, alvo: PapelDeMembro): boolean {
  if (postoDoPapel(ator) > postoDoPapel(alvo)) {
    return true
  }

  // O dono sobre outro dono: o casal são dois, e um precisa poder remover o
  // outro. A trava que impede o casamento de ficar órfão não é esta — é "nunca
  // remover o último dono", que continua checada no endpoint.
  return ator === 'dono' && alvo === 'dono'
}

/** Os papéis que este ator pode conceder num convite, na ordem da escada. */
export function papeisQuePodeConceder(ator: PapelDeMembro): PapelDeMembro[] {
  return PAPEIS_DE_MEMBRO.filter((alvo) => podeGerenciarPapel(ator, alvo))
}

/**
 * O rótulo que o CASAL lê. "Assessoria", nunca "Planejador": é a palavra que
 * ele usa na vida real, e o selo aparece na tela dele
 * (docs/fase5-multievento.md 4.6).
 *
 * Ela não cobre todo mundo — no mercado brasileiro "wedding planner" é um
 * posicionamento distinto de "assessoria/cerimonial" —, e a direção de deixar
 * a própria profissional escolher o texto está registrada no `ROADMAP.md`
 * seção 11. Até lá é constante, não configuração.
 */
export const ROTULO_DO_PAPEL: Record<PapelDeMembro, string> = {
  dono: 'Dono',
  planejador: 'Assessoria',
  colaborador: 'Colaborador',
}

export function rotuloDoPapel(papel: PapelDeMembro): string {
  return ROTULO_DO_PAPEL[papel]
}
