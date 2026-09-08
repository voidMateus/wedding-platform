import type { GuestPersonInput } from '#shared/schemas/guests'
import type { GuestDetail } from '~/composables/useGuests'

/**
 * Tradução entre a linha de `convidados` e o objeto que o formulário edita.
 *
 * Vive aqui, e não dentro de cada passo do wizard, porque o convidado
 * principal (`GuestPartyWizard`) e cada acompanhante
 * (`GuestPartyCompanionsStep`) editam exatamente o mesmo shape — os dois
 * tinham cópias idênticas destas funções, e um campo novo que entrasse só numa
 * delas sumiria silenciosamente na outra (foi o que quase aconteceu ao ligar
 * e-mail/telefone). Acompanhante é uma linha de `convidados` como qualquer
 * outra: nunca herda nada do responsável.
 *
 * Campo novo do cadastro entra nas duas funções abaixo, sempre em par —
 * `emptyPerson` define o estado inicial, `personFromGuest` o de edição.
 */

export function emptyPerson(): GuestPersonInput {
  return {
    nomeCompleto: '',
    apelido: '',
    sexo: undefined,
    dataNascimento: '',
    faixaEtariaManual: undefined,
    email: '',
    telefone: '',
    papelCasamento: undefined,
    observacoes: '',
    grupoId: '',
  }
}

/**
 * Aceita `Record<string, unknown>` além da linha tipada porque o wizard também
 * recebe o convidado vindo do autocomplete de "convidado já cadastrado", que
 * chega parcialmente tipado.
 */
export function personFromGuest(guest: GuestDetail | Record<string, unknown>): GuestPersonInput {
  const g = guest as Record<string, unknown>
  return {
    id: g.id as string,
    nomeCompleto: (g.nome_completo as string) ?? '',
    apelido: (g.apelido as string) ?? '',
    sexo: (g.sexo as GuestPersonInput['sexo']) ?? undefined,
    dataNascimento: (g.data_nascimento as string) ?? '',
    faixaEtariaManual:
      (g.faixa_etaria_manual as GuestPersonInput['faixaEtariaManual']) ?? undefined,
    email: (g.email as string) ?? '',
    telefone: (g.telefone as string) ?? '',
    papelCasamento: (g.papel_casamento as GuestPersonInput['papelCasamento']) ?? undefined,
    observacoes: (g.observacoes as string) ?? '',
    grupoId: (g.grupo_id as string) ?? '',
  }
}
