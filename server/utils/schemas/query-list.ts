import { z, type ZodTypeAny } from 'zod'

/** Teto de segurança: filtro de coluna com dezenas de valores vira varredura cara. */
const MAX_ITEMS = 30

/**
 * Parâmetro de query que aceita vários valores — o formato dos filtros por
 * coluna do admin, onde o casal pode marcar duas faixas etárias ao mesmo tempo.
 *
 * Aceita as duas serializações porque as duas acontecem de verdade: `ofetch`
 * manda array como parâmetro repetido (`?ageGroup=a&ageGroup=b`), e a URL da
 * própria tela usa lista separada por vírgula (`?faixa=a,b`), que é o que fica
 * legível num link compartilhado. Valor único continua valendo — os chamadores
 * antigos (`groupId` de uma tela só, por exemplo) não mudaram.
 */
export function queryList<T extends ZodTypeAny>(item: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined
    const entries = (Array.isArray(value) ? value : [value])
      .flatMap((entry) => String(entry).split(','))
      .map((entry) => entry.trim())
      .filter(Boolean)
    // Repetido não é erro do cliente, é o mesmo recorte — dedup em vez de 400.
    const unique = [...new Set(entries)]
    return unique.length ? unique : undefined
  }, z.array(item).max(MAX_ITEMS).optional())
}
